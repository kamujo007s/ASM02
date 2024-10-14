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
const helmet = require("helmet");
const WebSocket = require('ws');
const authenticate = require("../middleware/authenticate");
const { getWss } = require('../websocket'); // Import getWss

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'axios/1.7.3',
    'Accept-Encoding': 'gzip, compress, deflate, br'
  }
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

// Helper functions
const fetchDataFromApi = async (asset) => {
  if (!asset || !asset.operating_system || !asset.os_version) {
    console.error("Invalid asset data:", asset);
    return [];
  }
  const { operating_system, os_version } = asset;
  let keyword = `${operating_system}`;
  if (keyword.toLowerCase().includes("linux")) {
    keyword = `Red Hat ${os_version}` || `Red Hat Linux ${os_version}`;
  }
  const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(
    keyword
  )}`;
  console.log(`Fetching data from API using keyword: ${keyword}`);

  try {
    const response = await axiosInstance.get(url);
    const vulnerabilities = response.data.vulnerabilities;

    for (let i = 0; i < vulnerabilities.length; i += 10) {
      const batch = vulnerabilities.slice(i, i + 10);         

      for (const vuln of batch) {
        // ตรวจสอบว่า CVE มีอยู่ในฐานข้อมูลแล้วหรือไม่
        const existingCve = await Cve.findOne({ id: vuln.cve.id });
        if (existingCve) {
          console.log(`CVE ${vuln.cve.id} already exists in database. Skipping.`);
          continue; // ถ้ามีอยู่แล้ว ข้ามการอัปเดต
        }

        const result = await Cve.updateOne(
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
        };

        const vulnResult = await Vulnerability.updateOne(
          { cveId: vuln.cve.id },
          { $set: vulnerabilityData },
          { upsert: true }
        );

        // ส่งการแจ้งเตือนผ่าน WebSocket
        const wss = getWss();
        if (wss) {
          const notificationMessage = `New CVE of ${asset.operating_system}: ${vuln.cve.id}`;
          wss.broadcast(notificationMessage);

          // บันทึกการแจ้งเตือนในฐานข้อมูล
          const notification = new Notification({ message: notificationMessage });
          await notification.save();
        }
      }

      if (i + 10 < vulnerabilities.length) {
        await delay(3000);
      }
    }

    return vulnerabilities.map((vuln) => vuln.cve);
  } catch (error) {
    console.error(
      `Error fetching data for OS: ${operating_system}, Version: ${os_version}:`,
      error
    );
    return [];
  }
};


const mapAssetsToCves = async (asset) => {
  try {
    const cves = await fetchDataFromApi(asset);

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
        asset: asset._id,
        device_name: asset.device_name,
        application_name: asset.application_name,
        operating_system: asset.operating_system,
        os_version: asset.os_version,
        cveId: cve.id,
        cvssScore: score,
        riskLevel: riskLevel,
        descriptions: cve.descriptions,
        configurations: configurations,
        published: cve.published,
        lastModified: cve.lastModified,
        cvssVersion: cvss.version,
        weaknesses: cve.weaknesses,
      };
    });

    // ตรวจสอบว่า CVE นั้นมีอยู่แล้วในฐานข้อมูลหรือไม่
    for (const mappedCve of mappedCves) {
      const existingVulnerability = await Vulnerability.findOne({
        asset: mappedCve.asset,
        cveId: mappedCve.cveId,
      });

      if (existingVulnerability) {
        console.log(`Vulnerability for CVE ${mappedCve.cveId} already exists. Skipping.`);
        continue;
      }

      await Vulnerability.create(mappedCve);

      // ส่งการแจ้งเตือนผ่าน WebSocket และบันทึกในฐานข้อมูล
      const notificationMessage = `New CVE found for asset ${asset.device_name}: ${mappedCve.cveId}`;
      
      // ตรวจสอบว่ามีการแจ้งเตือนนี้ในฐานข้อมูลแล้วหรือไม่
      const existingNotification = await Notification.findOne({ message: notificationMessage });
      if (!existingNotification) {
        const wss = getWss();
        if (wss) {
          wss.broadcast(notificationMessage);

          // บันทึกการแจ้งเตือนในฐานข้อมูล
          const notification = new Notification({ message: notificationMessage });
          await notification.save();
        }
      } else {
        console.log(`Notification for CVE ${mappedCve.cveId} already exists. Skipping.`);
      }
    }

    console.log(`Mapped CVEs for asset ${asset.device_name} and saved to vulnerabilities collection.`);
  } catch (error) {
    console.error("Error mapping assets to CVEs:", error);
  }
};



router.get("/update", authenticate, async (req, res) => {
  try {
    await mapAssetsToCves();
    res.send("Data updated and mapped successfully");
  } catch (error) {
    console.error("Error updating and mapping data:", error);
    res.status(500).send("Error updating and mapping data");
  }
});

router.get(
  "/vulnerabilities",
  [
    query("operating_system").optional().isString().trim().escape(),
    query("os_version").optional().isString().trim().escape(),
    query("keyword").optional().isString().trim().escape(),
    query("riskLevel").optional().isString().trim().escape(), 
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1 }).toInt(),
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

      let vulnerabilitiesQuery = {};

      if (operating_system) {
        vulnerabilitiesQuery.operating_system = operating_system;
      }

      if (os_version) {
        vulnerabilitiesQuery.os_version = os_version;
      }

      if (keyword) {
        vulnerabilitiesQuery.$or = [
          { operating_system: { $regex: new RegExp(keyword, "i") } },
          { assetName: { $regex: new RegExp(keyword, "i") } },
          { os_version: { $regex: new RegExp(keyword, "i") } },
          { "descriptions.value": { $regex: new RegExp(keyword, "i") } },
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
      console.error("Error fetching vulnerabilities:", error);
      res.status(500).send("Error fetching data");
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
    console.error("Error fetching OS and versions:", error);
    res.status(500).send("Error fetching data");
  }
});

// router.get('/vulnerability-summary', authenticate, async (req, res) => {
//   try {
//     const summary = await Vulnerability.aggregate([
//       {
//         $group: {
//           _id: {
//             operating_system: '$operating_system',
//             os_version: '$os_version',  
//             riskLevel: '$riskLevel',
//           },
//           count: { $sum: 1 },
//         },
//       },
//       {
//         $group: {
//           _id: {
//             operating_system: '$_id.operating_system',
//             os_version: '$_id.os_version',
//           },
//           riskLevels: {
//             $push: {
//               riskLevel: '$_id.riskLevel',
//               count: '$count',
//             },
//           },
//           totalCount: { $sum: '$count' },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           operating_system: '$_id.operating_system',
//           os_version: '$_id.os_version',
//           riskLevels: 1,
//           totalCount: 1,
//         },
//       },
//       {
//         $sort: { 'operating_system': 1, 'os_version': 1 }
//       }
//     ]);

//     res.json(summary);
//   } catch (error) {
//     console.error('Error fetching vulnerability summary:', error);
//     res.status(500).send('Error fetching vulnerability summary');
//   }
// });

const checkMatchingCve = async (operating_system, os_version) => {
  const vulnerabilities = await Vulnerability.find({
    operating_system: operating_system,
    os_version: os_version,
  });

  return vulnerabilities.length > 0;
};

// router.get('/asset-over-time', authenticate, async (req, res) => {
//   try {
//     const assetOverTime = await Vulnerability.aggregate([
//       {
//         $group: {
//           _id: {
//             year: { $year: "$published" },
//             operating_system: "$operating_system",
//           },
//           count: { $sum: 1 },
//         },
//       },
//       {
//         $group: {
//           _id: "$_id.year",
//           osCounts: {
//             $push: {
//               operating_system: "$_id.operating_system",
//               count: "$count",
//             },
//           },
//           totalCount: { $sum: '$count' },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           year: "$_id",
//           osCounts: 1,
//           totalCount: 1,
//         },
//       },
//       {
//         $sort: { year: 1 },
//       },
//     ]);

//     res.json(assetOverTime);
//   } catch (error) {
//     console.error('Error fetching asset data over time:', error);
//     res.status(500).send('Error fetching asset data over time');
//   }
// });

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
    console.error('Error fetching assets with status:', error);
    res.status(500).send('Error fetching assets with status');
  }
});

router.get('/notifications', authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).send('Error fetching notifications');
  }
});

router.get('/cwe-breakdown', authenticate, async (req, res) => {
  try {
    const cweBreakdown = await Vulnerability.aggregate([
      { $unwind: '$weaknesses' },  // แยกข้อมูล weaknesses ออกเป็นรายการเดียว
      {
        $group: {
          _id: '$weaknesses.description',  // รวมกลุ่มตาม description ของ weaknesses
          count: { $sum: 1 },  // นับจำนวนครั้งที่ CWE ปรากฏ
        },
      },
      {
        $project: {
          _id: 0,
          cwe: '$_id',
          count: 1,
        },
      },
      {
        $sort: { count: -1 },  // เรียงจากมากไปน้อย
      },
    ]);

    res.json(cweBreakdown);
  } catch (error) {
    console.error('Error fetching CWE breakdown:', error);
    res.status(500).send('Error fetching CWE breakdown');
  }
});

router.get('/attack-vector', authenticate, async (req, res) => {
  try {
    const attackVectorData = await Vulnerability.aggregate([
      { $match: { cvssScore: { $exists: true } } },  // ตรวจสอบว่า cvssScore มีอยู่
      {
        $group: {
          _id: '$cvssScore',  // รวมกลุ่มตาม score
          count: { $sum: 1 },  // นับจำนวน
        },
      },
      {
        $project: {
          _id: 0,
          attackVector: '$_id',
          count: 1,
        },
      },
    ]);

    res.json(attackVectorData);
  } catch (error) {
    console.error('Error fetching attack vector data:', error);
    res.status(500).send('Error fetching attack vector data');
  }
});

router.get('/unpatched-products', authenticate, async (req, res) => {
  try {
    const unpatchedProducts = await Vulnerability.aggregate([
      { $match: { vulnStatus: 'Unpatched' } },  // ดึงเฉพาะสินค้าที่ไม่ได้ patch
      {
        $group: {
          _id: {
            operating_system: '$operating_system',
            os_version: '$os_version',
          },
          unpatched: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          operating_system: '$_id.operating_system',
          os_version: '$_id.os_version',
          unpatched: 1,
        },
      },
    ]);

    res.json(unpatchedProducts);
  } catch (error) {
    console.error('Error fetching unpatched products:', error);
    res.status(500).send('Error fetching unpatched products');
  }
});


// Fetch CVSS data for vulnerability severity chart
router.get('/cvss-data', authenticate, async (req, res) => {
  try {
    const cvssData = await Vulnerability.find({}, { cvssScore: 1, _id: 0 });
    res.json(cvssData);
  } catch (error) {
    console.error('Error fetching CVSS data:', error);
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
    console.error('Error fetching vulnerabilities over time:', error);
    res.status(500).send('Error fetching vulnerabilities over time');
  }
});

// Fetch CWE breakdown data
router.get('/cwe-breakdown', authenticate, async (req, res) => {
  try {
    const cweData = await Vulnerability.aggregate([
      { $unwind: '$weaknesses' },
      { $group: { _id: '$weaknesses.description', count: { $sum: 1 } } },
      { $project: { _id: 0, cwe: '$_id', count: 1 } },
      { $sort: { count: -1 } }
    ]);
    res.json(cweData);
  } catch (error) {
    console.error('Error fetching CWE breakdown:', error);
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
    console.error('Error fetching vulnerability distribution by OS:', error);
    res.status(500).send('Error fetching vulnerability distribution by OS');
  }
});

// Fetch unpatched vulnerabilities
router.get('/unpatched-products', authenticate, async (req, res) => {
  try {
    const unpatchedData = await Vulnerability.find({ vulnStatus: 'Unpatched' });
    res.json(unpatchedData);
  } catch (error) {
    console.error('Error fetching unpatched vulnerabilities:', error);
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
    console.error('Error fetching attack vector data:', error);
    res.status(500).send('Error fetching attack vector data');
  }
});

// Fetch impact score analysis data
router.get('/impact-score', authenticate, async (req, res) => {
  try {
    const impactData = await Vulnerability.aggregate([
      { $group: { _id: '$metrics.cvssMetricV2.impactScore', count: { $sum: 1 } } },
      { $project: { _id: 0, impactScore: '$_id', count: 1 } }
    ]);
    res.json(impactData);
  } catch (error) {
    console.error('Error fetching impact score data:', error);
    res.status(500).send('Error fetching impact score data');
  }
});

// Fetch vulnerabilities by asset
router.get('/asset-vulnerabilities', authenticate, async (req, res) => {
  try {
    const assetVulnerabilityData = await Vulnerability.aggregate([
      { $group: { _id: '$asset', count: { $sum: 1 } } },
      { $project: { _id: 0, asset: '$_id', count: 1 } }
    ]);
    res.json(assetVulnerabilityData);
  } catch (error) {
    console.error('Error fetching vulnerabilities by asset:', error);
    res.status(500).send('Error fetching vulnerabilities by asset');
  }
});

// Fetch CVE details for table
router.get('/cve-details', authenticate, async (req, res) => {
  try {
    const cveDetails = await Vulnerability.find({}, { cveId: 1, descriptions: 1, published: 1, lastModified: 1, cvssScore: 1 });
    res.json(cveDetails);
  } catch (error) {
    console.error('Error fetching CVE details:', error);
    res.status(500).send('Error fetching CVE details');
  }
});


module.exports = {
  router,
  fetchDataFromApi,
  mapAssetsToCves,
};
