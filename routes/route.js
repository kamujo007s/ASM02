// routes/route.js
const axios = require("axios");
const express = require("express");
const router = express.Router();
const Cve = require("../models/cve");
const Asset = require("../models/asset");
const Vulnerability = require("../models/vulnerability");
const Notification = require("../models/notification");
const https = require("https");
const { query, validationResult } = require("express-validator");
const authenticate = require("../middleware/authenticate");
const { getWss } = require('../websocket'); // Import getWss
const fs = require('fs');
const path = require('path');
const Criteria = require("../models/criteria");  // นำเข้าโมเดล Criteria
const OsFormat = require("../models/osformat");  // นำเข้าโมเดล OsFormat
const logger = require('../logger');
const { generateMitigationAdvice } = require('../AI Reccommentation/generateMitigationAdvice'); // นำเข้าโมดูล AI


const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'axios/1.7.3',
    'Accept-Encoding': 'gzip, compress, deflate, br'
  }
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// สร้างฟังก์ชันเพื่อส่งสถานะผ่าน WebSocket
const broadcastStatus = (message) => {
  const wss = getWss();
  if (wss) {
    wss.broadcast({ type: 'status', status: message });
  }
};

const getCvssScore = (cve) => {
  if (
    cve.metrics &&
    cve.metrics.cvssMetricV31 &&
    cve.metrics.cvssMetricV31.length > 0
  ) {
    return {
      score: cve.metrics.cvssMetricV31[0].cvssData.baseScore,
      version: "3.1",
    };
  } else if (
    cve.metrics &&
    cve.metrics.cvssMetricV30 &&
    cve.metrics.cvssMetricV30.length > 0
  ) {
    return {
      score: cve.metrics.cvssMetricV30[0].cvssData.baseScore,
      version: "3.0",
    };
  } else if (
    cve.metrics &&
    cve.metrics.cvssMetricV2 &&
    cve.metrics.cvssMetricV2.length > 0
  ) {
    return {
      score: cve.metrics.cvssMetricV2[0].cvssData.baseScore,
      version: "2.0",
    };
  } else {
    return {
      score: null,
      version: null,
      riskLevel: null,
    };
  }
};

const getRiskLevel = (score, version) => {
  if (version === "3.1" || version === "3.0") {
    if (score === 0.0) return "None";
    if (score >= 0.1 && score <= 3.9) return "Low";
    if (score >= 4.0 && score <= 6.9) return "Medium";
    if (score >= 7.0 && score <= 8.9) return "High";
    if (score >= 9.0 && score <= 10.0) return "Critical";
    else return "null";
  } else if (version === "2.0") {
    if (score >= 0.0 && score <= 3.9) return "Low";
    if (score >= 4.0 && score <= 6.9) return "Medium";
    if (score >= 7.0 && score <= 10.0) return "High";
    else return "null";
  }
  return "Unknown";
};

const fetchDataFromApi = async (asset, userId) => {
  
  broadcastStatus(`เริ่มประมวลผล Asset: ${asset.device_name}`);

  if (!asset || !asset.operating_system || !asset.os_version) {
    logger.info('Asset ไม่มีข้อมูลที่จำเป็น');
    broadcastStatus(`Asset ${asset.device_name} ไม่มีข้อมูลที่จำเป็น`);

    return [];
  }
  
  let { operating_system, os_version } = asset;
  let keyword = `${operating_system} ${os_version}`.trim();
  
  logger.info(`เริ่มประมวลผล Asset ด้วย operating_system: ${operating_system}, os_version: ${os_version}`);
  broadcastStatus(`กำลังดึงข้อมูล OsFormat สำหรับ Asset: ${asset.device_name}`);

  // ดึงข้อมูลจาก OsFormat
  let formats = await OsFormat.find().lean();
  logger.info(`ดึงข้อมูล OsFormat จำนวน ${formats.length} รายการ`);

  // แยกคำใน keyword และ operating_system
  const keywordWords = keyword.toLowerCase().split(/\s+/);
  const firstWord = operating_system.toLowerCase().split(/\s+/)[0];

  // กรอง formats ที่มีคำว่า "Windows" ซึ่งเป็นคำแรกของ operating_system
  const filteredFormats = formats.filter(format => {
    if (!format.standard) return false; // ตรวจสอบค่า null
    const standardLower = format.standard.toLowerCase();
    return standardLower.includes(firstWord);
  });
  logger.info(`กรอง formats เหลือ ${filteredFormats.length} รายการที่มีคำจาก operating_system อยู่ในข้อมูล`);

  // แสดงรายการ filteredFormats ใน log
  filteredFormats.forEach((format) => {
    logger.info(`filteredFormats: ${format.standard}`);
  });

  // ฟังก์ชันนับจำนวนคำที่ซ้ำกัน
  function getOverlapCount(str1, str2) {
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    let overlap = 0;
    for (const word of set1) {
      if (set2.has(word)) {
        overlap += 1;
      }
    }
    return overlap;
  }

  // เช็คคำซ้ำระหว่างแต่ละ format กับ keyword
  let maxOverlapKeyword = 0;
  let bestFormatKeyword = null;

  for (const format of filteredFormats) {
    const overlap = getOverlapCount(keyword, format.standard);
    logger.info(`จำนวนคำซ้ำระหว่าง keyword "${keyword}" และชื่อ "${format.standard}" คือ ${overlap}`);
    if (overlap > maxOverlapKeyword) {
      maxOverlapKeyword = overlap;
      bestFormatKeyword = format;
    }
  }

  if (bestFormatKeyword) {
    logger.info(`พบ format ที่ดีที่สุดสำหรับ keyword คือ "${bestFormatKeyword.standard}" มีคำซ้ำ ${maxOverlapKeyword}`);
    keyword = `${bestFormatKeyword.standard} ${os_version}`.trim();
    operating_system = bestFormatKeyword.standard;
  } else {
    logger.info('ไม่พบ format ที่เหมาะสมสำหรับ keyword');
  }

  // ค้นหา criteria ที่ตรงกับ operating_system อย่างเดียว
  logger.info(`ค้นหา criteria ที่ตรงกับ operating_system: "${operating_system}"`);
  let osOnlyCriteria = await Criteria.findOne({
    assetName: { $regex: new RegExp(`^${operating_system}$`, 'i') }
  });
  logger.info(`osOnlyCriteria: ${osOnlyCriteria ? 'พบ' : 'ไม่พบ'}`);

  let criteriaDocs = [];

  // ถ้าไม่พบ criteria สำหรับ operating_system ให้ประมวลผลด้วย keyword
  if (!osOnlyCriteria) {
    logger.info(`ไม่พบ criteria ที่ตรงกับ operating_system: "${operating_system}"`);

    // ค้นหา criteria ที่ตรงกับ keyword
    logger.info(`ค้นหา criteria ที่ตรงกับ keyword: "${keyword}"`);
    criteriaDocs = await Criteria.find({
      assetName: { $regex: new RegExp(`^${keyword}$`, 'i') }
    }).limit(5);
    logger.info(`พบ criteria จำนวน ${criteriaDocs.length} รายการที่ตรงกับ keyword`);

    if (criteriaDocs.length === 0) {
      // ลองค้นหาแบบบางส่วน
      logger.info('ไม่พบการจับคู่ที่ตรง ลองค้นหาแบบบางส่วนสำหรับ keyword');
      const keywordParts = keyword.split(' ').filter(Boolean);
      const regexes = keywordParts.map(part => new RegExp(part, 'i'));

      criteriaDocs = await Criteria.find({
        $or: regexes.map(regex => ({ assetName: regex }))
      }).limit(5);
      logger.info(`พบ criteria จำนวน ${criteriaDocs.length} รายการจากการค้นหาแบบบางส่วน`);
    }

    if (criteriaDocs.length === 0) {
      logger.info(`ไม่พบ criteria ที่ตรงกับ keyword: "${keyword}"`);
      return [];
    }
  } else {
    criteriaDocs = [osOnlyCriteria];
    logger.info('ใช้ criteria ที่พบจาก operating_system');
  }
  
  // รวม criteria (สูงสุด 6 รายการ)
  const allCriteria = criteriaDocs.slice(0, 6);
  logger.info(`จำนวน criteria ทั้งหมดที่จะประมวลผล: ${allCriteria.length}`);

  const vulnerabilities = [];
  const wss = getWss();
  const cpeNamesUsed = [];
  broadcastStatus(`กำลังประมวลผล criteria สำหรับ Asset: ${asset.device_name}`);

  // ดึงข้อมูลโดยใช้ criteria
  for (const doc of allCriteria) {
    if (!doc) continue;
    const cpeName = doc.criteria;
    logger.info(`ประมวลผล cpeName: "${cpeName}"`);
    if (!cpeNamesUsed.includes(cpeName)) {
      cpeNamesUsed.push(cpeName);
    }
    broadcastStatus(`ดึงข้อมูล CVE จาก NVD สำหรับ cpeName: ${cpeName}`);

    const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName=${encodeURIComponent(cpeName)}`;

    try {
      logger.info(`ดึงข้อมูล CVEs จาก URL: ${url}`);
      const response = await axiosInstance.get(url);
      const cves = response.data.vulnerabilities;
      logger.info(`ดึง CVEs จำนวน ${cves.length} รายการสำหรับ cpeName: "${cpeName}"`);
      broadcastStatus(`ดึงข้อมูล CVE สำเร็จสำหรับ cpeName: ${cpeName}`);

      // ประมวลผล CVEs
      for (let i = 0; i < cves.length; i += 10) {
        const batch = cves.slice(i, i + 10);
        logger.info(`ประมวลผล CVE ชุดที่ ${i / 10 + 1}: จำนวน ${batch.length} รายการ`);

        for (const vuln of batch) {
          // ตรวจสอบว่า CVE มีอยู่แล้วหรือไม่
          const existingCve = await Cve.findOne({ id: vuln.cve.id });

          // ถ้าไม่มี ให้เพิ่ม CVE ใหม่
          if (!existingCve) {
            logger.info(`เพิ่ม CVE ใหม่: ${vuln.cve.id}`);
            await Cve.updateOne(
              { id: vuln.cve.id },
              {
                $set: {
                  id: vuln.cve.id,
                  sourceIdentifier: vuln.cve.sourceIdentifier || "",
                  published: vuln.cve.published || vuln.published,
                  lastModified: vuln.cve.lastModified || vuln.lastModifiedDate,
                  vulnStatus: vuln.cve.vulnStatus || "",
                  descriptions: vuln.cve.descriptions || [],
                  metrics: vuln.cve.metrics || {},
                  weaknesses: vuln.cve.weaknesses || [],
                  configurations: vuln.cve.configurations || [],
                  references: vuln.cve.references || [],
                },
              },
              { upsert: true }
            );

            const cvss = getCvssScore(vuln.cve);
            const score = cvss.score;
            const riskLevel = getRiskLevel(score, cvss.version);

            const cpeMatches =
              vuln.cve.configurations?.flatMap((config) =>
                config.nodes?.flatMap((node) =>
                  node.cpeMatch?.map((match) => ({
                    criteria: match.criteria,
                    matchCriteriaId: match.matchCriteriaId || "No Match ID",
                  }))
                )
              ) || [];

            // เรียกใช้ฟังก์ชัน generateMitigationAdvice เพื่อสร้างคำแนะนำการแก้ไขช่องโหว่
            const advice = await generateMitigationAdvice(vuln.cve.id);
            logger.info(`คำแนะนำการแก้ไขช่องโหว่สำหรับ CVE ${vuln.cve.id}: ${advice}`);

            const vulnerabilityData = {
              asset: asset._id,
              device_name: asset.device_name,
              application_name: asset.application_name,
              operating_system: asset.operating_system,
              os_version: asset.os_version,
              cveId: vuln.cve.id,
              published: vuln.cve.published,
              lastModified: vuln.cve.lastModified,
              vulnStatus: vuln.cve.vulnStatus,
              descriptions: vuln.cve.descriptions,
              configurations: cpeMatches,
              riskLevel: riskLevel,
              cvssVersion: cvss.version,
              cvssScore: score,
              weaknesses: vuln.cve.weaknesses,
              cpeNameUsed: cpeNamesUsed,
              mitigationAdvice: advice, // เพิ่มฟิลด์นี้เพื่อเก็บคำแนะนำการแก้ไขช่องโหว่
            };

            await Vulnerability.updateOne(
              { cveId: vuln.cve.id },
              { $set: vulnerabilityData },
              { upsert: true }
            );

            // ตรวจสอบการแจ้งเตือน
            const notificationMessage = `New CVE for asset ${asset.device_name}: ${vuln.cve.id}`;
            const existingNotification = await Notification.findOne({ message: notificationMessage });
            if (!existingNotification) {
              if (wss) {
                const notificationData = { type: 'notification', message: notificationMessage };
                wss.broadcast(notificationData);

                // บันทึกการแจ้งเตือน
                const notification = new Notification({ message: notificationMessage });
                await notification.save();
              }
            }
          } else {
            logger.info(`CVE ${vuln.cve.id} มีอยู่ในฐานข้อมูลแล้ว`);
          }
        }

        if (i + 10 < cves.length) {
          logger.info('รอ 3 วินาทีก่อนดำเนินการชุดถัดไป');
          await delay(3000);
        }
      }

      logger.info('รอ 3 วินาทีก่อนดำเนินการ cpeName ถัดไป');
      await delay(3000);

    } catch (error) {
      logger.error(`เกิดข้อผิดพลาดในการดึงข้อมูลสำหรับ cpeName: ${cpeName}`, error);
      logger.info('ไม่พบ cpeName ในฐานข้อมูล');
      broadcastStatus(`เกิดข้อผิดพลาดในการดึงข้อมูล CVE สำหรับ cpeName: ${cpeName}`);

      continue; // ข้ามไปยัง cpeName ถัดไป
    }
  }

  logger.info('การประมวลผลเสร็จสิ้น');
  broadcastStatus(`ประมวลผล Asset ${asset.device_name} เสร็จสิ้น`);

  return vulnerabilities;
};

const mapAssetsToCves = async (asset = null, userId) => {
  try {
    const assets = asset ? [asset] : await Asset.find();
    const wss = getWss();
        broadcastStatus(`เริ่มแมป CVEs สำหรับ Asset: ${assetItem.device_name}`);

    for (const assetItem of assets) {
      // เพิ่มการบันทึก Log เพื่อแสดง Asset และ OS ที่กำลังประมวลผล
      logger.info(`Mapping CVEs for asset: ${assetItem.device_name}, OS: ${assetItem.operating_system} ${assetItem.os_version}`);
      broadcastStatus(`เริ่มแมป CVEs สำหรับ Asset: ${assetItem.device_name}`);

      // ส่งข้อมูลความคืบหน้าผ่าน WebSocket (ถ้าต้องการ)
      if (wss) {
        const progressMessage = `Mapping CVEs for asset: ${assetItem.device_name}, OS: ${assetItem.operating_system} ${assetItem.os_version}`;
        const progressData = { type: 'progress', message: progressMessage };
        wss.broadcast(progressData);
      }

      const cves = await fetchDataFromApi(assetItem, userId);

      const mappedCves = cves.map((cve) => {
        const cvss = getCvssScore(cve);
        const score = cvss.score;
        const riskLevel = getRiskLevel(score, cvss.version);

        const configurations = cve.configurations?.flatMap((config) =>
          config.nodes?.flatMap((node) =>
            node.cpeMatch?.map((match) => ({
              criteria: match.criteria,
              matchCriteriaId: match.matchCriteriaId,
            }))
          )
        ) || [];

        return {
          asset: assetItem._id,
          device_name: assetItem.device_name,
          application_name: assetItem.application_name,
          operating_system: assetItem.operating_system,
          os_version: assetItem.os_version,
          cveId: cve.id,
          cvssScore: score,
          riskLevel: riskLevel,
          descriptions: cve.descriptions,
          configurations: configurations,
          published: cve.published,
          lastModified: cve.lastModified,
          cvssVersion: cvss.version,
          weaknesses: cve.weaknesses,
          cpeNameUsed: cve.cpeNameUsed,
        };
      });

      // ตรวจสอบว่า CVE นั้นมีอยู่แล้วในฐานข้อมูลหรือไม่
      for (const mappedCve of mappedCves) {
        const existingVulnerability = await Vulnerability.findOne({
          asset: mappedCve.asset,
          cveId: mappedCve.cveId,
        });

        if (existingVulnerability) {
          continue;
        }

        await Vulnerability.create(mappedCve);

        // ส่งการแจ้งเตือนผ่าน WebSocket และบันทึกในฐานข้อมูล
        const notificationMessage = `New CVE found for asset ${assetItem.device_name}: ${mappedCve.cveId}`;

        // ตรวจสอบว่ามีการแจ้งเตือนนี้ในฐานข้อมูลแล้วหรือไม่
        const existingNotification = await Notification.findOne({ message: notificationMessage });
        if (!existingNotification) {
          if (wss) {
            const notificationData = { type: 'notification', message: notificationMessage };
            wss.broadcast(notificationData);

            // บันทึกการแจ้งเตือนในฐานข้อมูล
            const notification = new Notification({ message: notificationMessage });
            await notification.save();
            broadcastStatus(`แมป CVEs สำหรับ Asset ${assetItem.device_name} เสร็จสิ้น`);

          }
        }
      }
    }
  } catch (error) {
    logger.error("Error mapping assets to CVEs: %o", error);
  }
};


router.get("/update", authenticate, async (req, res) => {
  try {
    const deviceName = req.query.device_name;
    const userId = req.user.id;

    let asset = null;

    if (deviceName) {
      asset = await Asset.findOne({ device_name: deviceName });
      if (!asset) {
        return res.status(404).send("Asset not found");
      }
    }

    await mapAssetsToCves(asset, userId);
    res.send("Data updated and mapped successfully");
  } catch (error) {
    logger.error("Error updating and mapping data: %o", error); // ใช้ logger.error
    res.status(500).send("Error updating and mapping data");
  }
});

router.get(
  '/vulnerabilities',
  [
    query('operating_system').optional().isString().trim().escape(),
    query('os_version').optional().isString().trim().escape(),
    query('keyword').optional().isString().trim().escape(),
    query('riskLevel').optional().isString().trim().escape(), 
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1 }).toInt().default(50),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        operating_system,
        os_version,
        keyword,
        riskLevel,
        page = 1,
        limit = 50,
      } = req.query;

      const vulnerabilitiesQuery = {};

      if (operating_system) {
        vulnerabilitiesQuery.operating_system = operating_system;
      }

      if (os_version) {
        vulnerabilitiesQuery.os_version = os_version;
      }

      if (keyword) {
        vulnerabilitiesQuery.$or = [
          { operating_system: { $regex: new RegExp(keyword, 'i') } },
          { 'descriptions.value': { $regex: new RegExp(keyword, 'i') } },
        ];
      }

      if (riskLevel) {
        vulnerabilitiesQuery.riskLevel = riskLevel;
      }

      const totalCount = await Vulnerability.countDocuments(vulnerabilitiesQuery);

      const vulnerabilities = await Vulnerability.find(vulnerabilitiesQuery)
        .skip((page - 1) * limit)
        .limit(limit);

      res.json({ mappedVulnerabilities: vulnerabilities, totalCount });
    } catch (error) {
      logger.error('Error fetching vulnerabilities: %o', error);
      res.status(500).send('Error fetching data');
    }
  }
);


router.get('/assets/os-versions', authenticate, async (req, res) => {
  try {
    const uniqueOs = await Asset.distinct("operating_system");
    const versionsByOs = {};
    
    for (const os of uniqueOs) {
      versionsByOs[os] = await Asset.distinct("os_version", { operating_system: os });
    }

    res.json({ uniqueOs, versionsByOs });
  } catch (error) {
    logger.error("Error fetching OS and versions: %o", error); // ใช้ logger.error
    res.status(500).send("Error fetching data");
  }
});


// Add a new route to fetch a specific CVE by its ID
router.get('/vulnerabilities/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const vulnerability = await Vulnerability.findOne({ cveId: id });

    if (!vulnerability) {
      return res.status(404).send("Vulnerability not found");
    }

    res.json(vulnerability);
  } catch (error) {
    logger.error('Error fetching vulnerability: %o', error); // ใช้ logger.error
    res.status(500).send('Error fetching vulnerability');
  }
});


const checkMatchingCve = async (operating_system, os_version) => {
  const vulnerabilities = await Vulnerability.find({
    operating_system: operating_system,
    os_version: os_version,
  });

  return vulnerabilities.length > 0;
};

router.get('/assets-with-status', authenticate, async (req, res) => {
  try {
    const assets = await Asset.find();

    const assetWithStatus = await Promise.all(
      assets.map(async (asset) => {
        const match = await checkMatchingCve(asset.operating_system, asset.os_version);

        return {
          ...asset.toObject(),
          status: match ? 'True' : 'False'
        };
      })
    );

    res.json(assetWithStatus);
  } catch (error) {
    logger.error('Error fetching assets with status: %o', error); // ใช้ logger.error
    res.status(500).send('Error fetching assets with status');
  }
});

router.get('/notifications', authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    logger.error('Error fetching notifications: %o', error); // ใช้ logger.error
    res.status(500).send('Error fetching notifications');
  }
});

// Fetch CVSS data for vulnerability severity chart
router.get('/cvss-data', authenticate, async (req, res) => {
  try {
    const cvssData = await Vulnerability.find({}, { cvssScore: 1, riskLevel: 1, _id: 0 });
    res.json(cvssData);
  } catch (error) {
    logger.error('Error fetching CVSS data: %o', error); // ใช้ logger.error
    res.status(500).send('Error fetching CVSS data');
  }
});

// Fetch vulnerabilities over time
router.get('/asset-over-time', authenticate, async (req, res) => {
  try {
    const vulnerabilitiesOverTime = await Vulnerability.aggregate([
      {
        $group: {
          _id: { year: { $year: '$published' } },
          totalCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1 } }
    ]);
    res.json(vulnerabilitiesOverTime);
  } catch (error) {
    logger.error('Error fetching vulnerabilities over time: %o', error); // ใช้ logger.error
    res.status(500).send('Error fetching vulnerabilities over time');
  }
});

// Fetch CWE breakdown data
router.get('/cwe-breakdown', authenticate, async (req, res) => {
  try {
    const cweData = await Vulnerability.aggregate([
      { $unwind: '$weaknesses' },
      { $group: { _id: '$weaknesses.description.value', count: { $sum: 1 } } },
      { $project: { _id: 0, cwe: '$_id', count: 1 } },
      { $sort: { count: -1 } }
    ]);
    res.json(cweData);
  } catch (error) {
    logger.error('Error fetching CWE breakdown: %o', error); // ใช้ logger.error
    res.status(500).send('Error fetching CWE breakdown');
  }
});

// Fetch vulnerability distribution by OS
router.get('/vulnerability-summary', authenticate, async (req, res) => {
  try {
    const osData = await Vulnerability.aggregate([
      { $group: { _id: '$operating_system', count: { $sum: 1 } } },
      { $project: { _id: 0, operating_system: '$_id', count: 1 } }
    ]);
    res.json(osData);
  } catch (error) {
    logger.error('Error fetching vulnerability distribution by OS: %o', error); // ใช้ logger.error
    res.status(500).send('Error fetching vulnerability distribution by OS');
  }
});

// Fetch unpatched vulnerabilities
router.get('/unpatched-products', authenticate, async (req, res) => {
  try {
    const unpatchedData = await Vulnerability.find({ vulnStatus: 'Unpatched' });
    res.json(unpatchedData);
  } catch (error) {
    logger.error('Error fetching unpatched vulnerabilities: %o', error); // ใช้ logger.error
    res.status(500).send('Error fetching unpatched vulnerabilities');
  }
});

// Fetch attack vector data
router.get('/attack-vector', authenticate, async (req, res) => {
  try {
    const vectorData = await Vulnerability.aggregate([
      { $group: { _id: '$metrics.cvssMetricV2.cvssData.accessVector', count: { $sum: 1 } } },
      { $project: { _id: 0, attackVector: '$_id', count: 1 } }
    ]);
    res.json(vectorData);
  } catch (error) {
    logger.error('Error fetching attack vector data: %o', error); // ใช้ logger.error
    res.status(500).send('Error fetching attack vector data');
  }
});

router.get('/impact-score', authenticate, async (req, res) => {
  try {
    const impactData = await Vulnerability.aggregate([
      { 
        $facet: {
          cvssV2: [
            { $unwind: '$metrics.cvssMetricV2' },
            { 
              $group: {
                _id: null,
                confidentialityImpact: { 
                  $sum: { 
                    $cond: [
                      { $in: ['$metrics.cvssMetricV2.cvssData.confidentialityImpact', ['PARTIAL', 'COMPLETE', 'NONE']] }, 
                      1, 
                      0 
                    ] 
                  } 
                },
                integrityImpact: { 
                  $sum: { 
                    $cond: [
                      { $in: ['$metrics.cvssMetricV2.cvssData.integrityImpact', ['PARTIAL', 'COMPLETE', 'NONE']] }, 
                      1, 
                      0 
                    ] 
                  } 
                },
                availabilityImpact: { 
                  $sum: { 
                    $cond: [
                      { $in: ['$metrics.cvssMetricV2.cvssData.availabilityImpact', ['PARTIAL', 'COMPLETE', 'NONE']] }, 
                      1, 
                      0 
                    ] 
                  } 
                }
              }
            }
          ],
          cvssV3: [
            { $unwind: '$metrics.cvssMetricV30' },
            { 
              $group: {
                _id: null,
                confidentialityImpact: { 
                  $sum: { 
                    $cond: [
                      { $in: ['$metrics.cvssMetricV30.cvssData.confidentialityImpact', ['PARTIAL', 'COMPLETE', 'NONE']] }, 
                      1, 
                      0 
                    ] 
                  } 
                },
                integrityImpact: { 
                  $sum: { 
                    $cond: [
                      { $in: ['$metrics.cvssMetricV30.cvssData.integrityImpact', ['PARTIAL', 'COMPLETE', 'NONE']] }, 
                      1, 
                      0 
                    ] 
                  } 
                },
                availabilityImpact: { 
                  $sum: { 
                    $cond: [
                      { $in: ['$metrics.cvssMetricV30.cvssData.availabilityImpact', ['PARTIAL', 'COMPLETE', 'NONE']] }, 
                      1, 
                      0 
                    ] 
                  } 
                }
              }
            }
          ],
          cvssV31: [
            { $unwind: '$metrics.cvssMetricV31' },
            { 
              $group: {
                _id: null,
                confidentialityImpact: { 
                  $sum: { 
                    $cond: [
                      { $in: ['$metrics.cvssMetricV31.cvssData.confidentialityImpact', ['PARTIAL', 'COMPLETE', 'NONE']] }, 
                      1, 
                      0 
                    ] 
                  } 
                },
                integrityImpact: { 
                  $sum: { 
                    $cond: [
                      { $in: ['$metrics.cvssMetricV31.cvssData.integrityImpact', ['PARTIAL', 'COMPLETE', 'NONE']] }, 
                      1, 
                      0 
                    ] 
                  } 
                },
                availabilityImpact: { 
                  $sum: { 
                    $cond: [
                      { $in: ['$metrics.cvssMetricV31.cvssData.availabilityImpact', ['PARTIAL', 'COMPLETE', 'NONE']] }, 
                      1, 
                      0 
                    ] 
                  } 
                }
              }
            }
          ]
        }
      },
      {
        $project: {
          confidentialityImpact: { 
            $sum: ['$cvssV2.confidentialityImpact', '$cvssV3.confidentialityImpact', '$cvssV31.confidentialityImpact'] 
          },
          integrityImpact: { 
            $sum: ['$cvssV2.integrityImpact', '$cvssV3.integrityImpact', '$cvssV31.integrityImpact'] 
          },
          availabilityImpact: { 
            $sum: ['$cvssV2.availabilityImpact', '$cvssV3.availabilityImpact', '$cvssV31.availabilityImpact'] 
          }
        }
      }
    ]);
    res.json(impactData);
  } catch (error) {
    logger.error('Error fetching impact score data: %o', error); // ใช้ logger.error
    res.status(500).send('Error fetching impact score data');
  }
});
router.get('/os-weakpoints-per-year', authenticate, async (req, res) => {
  try {
    const osWeakPoints = await Vulnerability.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$published" },
            operating_system: "$operating_system",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.year",
          osCounts: {
            $push: {
              operating_system: "$_id.operating_system",
              count: "$count",
            },
          },
          totalCount: { $sum: "$count" },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id",
          osCounts: 1,
          totalCount: 1,
        },
      },
      {
        $sort: { year: 1 },
      },
    ]);

    res.json(osWeakPoints);
  } catch (error) {
    logger.error('Error fetching OS weak points per year: %o', error); // ใช้ logger.error
    res.status(500).send('Error fetching OS weak points per year');
  }
});

router.get('/weak-point-by-year', authenticate, async (req, res) => {
  try {
    const weakPointsByYear = await Vulnerability.aggregate([
      {
        $group: {
          _id: {
            year: { $year: { $toDate: "$published" } }, // แยกปีจากวันที่เผยแพร่
            operating_system: "$operating_system",      // แยกระบบปฏิบัติการ
          },
          count: { $sum: 1 }, // นับจำนวนช่องโหว่
        },
      },
      {
        $group: {
          _id: "$_id.year",
          operatingSystems: {
            $push: {
              operating_system: "$_id.operating_system",
              count: "$count",
            },
          },
          totalCount: { $sum: "$count" }, // นับจำนวนรวมในปีนั้นๆ
        },
      },
      {
        $project: {
          year: "$_id",
          operating_systems: {
            $slice: [
              {
                $filter: {
                  input: "$operatingSystems",
                  as: "os",
                  cond: { $gt: ["$$os.count", 0] },
                },
              },
              1, // แสดงระบบปฏิบัติการที่มีจำนวนสูงสุด
            ],
          },
          totalCount: 1,
        },
      },
      { $sort: { year: 1 } }, // เรียงตามปี
    ]);

    res.json(weakPointsByYear);
  } catch (error) {
    logger.error('Error fetching weak points by year: %o', error); // ใช้ logger.error
    res.status(500).send('Error fetching weak points by year');
  }
});

// Fetch the OS with the most vulnerabilities for each year
router.get('/top-os-by-year', authenticate, async (req, res) => {
  try {
    const topOSByYear = await Vulnerability.aggregate([
      {
        $group: {
          _id: { year: { $year: "$published" }, operating_system: "$operating_system" },
          totalVulns: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, totalVulns: -1 },  // Sort by year and then by number of vulnerabilities
      },
      {
        $group: {
          _id: "$_id.year",
          topOS: { $first: "$_id.operating_system" }, // Select the OS with the most vulnerabilities in each year
          totalVulns: { $first: "$totalVulns" },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id",
          operating_system: "$topOS",
          totalVulns: "$totalVulns",
        },
      },
      {
        $sort: { year: 1 }, // Ensure the result is sorted by year
      },
    ]);

    res.json(topOSByYear);
  } catch (error) {
    logger.error('Error fetching top OS by year: %o', error); // ใช้ logger.error
    res.status(500).send('Error fetching top OS by year');
  }
});

router.get('/top-5-os-current-year', authenticate, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    const top5OS = await Vulnerability.aggregate([
      {
        $match: {
          published: {
            $gte: new Date(`${currentYear}-01-01`),
            $lt: new Date(`${currentYear + 1}-01-01`)
          }
        }
      },
      {
        $group: {
          _id: "$operating_system",
          totalVulns: { $sum: 1 }
        }
      },
      {
        $sort: { totalVulns: -1 }
      },
      {
        $limit: 5
      }
    ]);

    res.json(top5OS);
  } catch (error) {
    logger.error('Error fetching top 5 OS: %o', error); // ใช้ logger.error
    res.status(500).send('Error fetching top 5 OS');
  }
});

module.exports = {
  router,
  fetchDataFromApi,
  mapAssetsToCves,
};
