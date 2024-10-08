const axios = require("axios");
const express = require("express");
const router = express.Router();
const Cve = require("../models/cve");
const Asset = require("../models/asset");
const Vulnerability = require("../models/vulnerability"); // ต้องสร้าง model สำหรับ Vulnerability ด้วย
const https = require("https");
const { query, validationResult } = require("express-validator");
const e = require("express");

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
  return "Unknown"; // กรณีที่ไม่ตรงกับเงื่อนไขด้านบน
};

const fetchDataFromApi = async (asset) => {
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

        // ตรวจสอบว่า configurations มีข้อมูลที่ต้องการหรือไม่
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
          configurations: cpeMatches, // เก็บ configurations ที่สร้างใหม่
          riskLevel: riskLevel,
          cvssVersion: cvss.version,
          cvssScore: score,
        };

        const vulnResult = await Vulnerability.updateOne(
          { cveId: vuln.cve.id },
          { $set: vulnerabilityData },
          { upsert: true }
        );
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


const mapAssetsToCves = async () => {
  try {
    const assets = await Asset.find();

    for (const asset of assets) {
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
        };
      });

      await Vulnerability.insertMany(mappedCves);
      console.log(
        `Mapped CVEs for asset ${asset.device_name} and saved to vulnerabilities collection.`
      );
    }
  } catch (error) {
    console.error("Error mapping assets to CVEs:", error);
  }
};

router.get("/update", async (req, res) => {
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

router.get("/assets/os-versions", async (req, res) => {
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

router.get('/vulnerability-summary', async (req, res) => {
  try {
    const summary = await Vulnerability.aggregate([
      {
        $group: {
          _id: {
            operating_system: '$operating_system',
            os_version: '$os_version',  
            riskLevel: '$riskLevel',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: {
            operating_system: '$_id.operating_system',
            os_version: '$_id.os_version',
          },
          riskLevels: {
            $push: {
              riskLevel: '$_id.riskLevel',
              count: '$count',
            },
          },
          totalCount: { $sum: '$count' },
        },
      },
      {
        $project: {
          _id: 0,
          operating_system: '$_id.operating_system',
          os_version: '$_id.os_version',
          riskLevels: 1,
          totalCount: 1,
        },
      },
      {
        $sort: { 'operating_system': 1, 'os_version': 1 }
      }
    ]);

    res.json(summary);
  } catch (error) {
    console.error('Error fetching vulnerability summary:', error);
    res.status(500).send('Error fetching vulnerability summary');
  }
});

const checkMatchingCve = async (operating_system, os_version) => {
  const vulnerabilities = await Vulnerability.find({
    operating_system: operating_system,
    os_version: os_version,
  });

  return vulnerabilities.length > 0;
};
router.get('/asset-over-time', async (req, res) => {
  try {
    const assetOverTime = await Vulnerability.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$published" },  // กลุ่มตามปี
            operating_system: "$operating_system",  // กลุ่มตาม OS
          },
          count: { $sum: 1 },  // นับจำนวน Asset ที่มีช่องโหว่
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
          totalCount: { $sum: "$count" },  // รวมจำนวนทั้งหมดในแต่ละปี
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id",  // กำหนดชื่อฟิลด์เป็นปี
          osCounts: 1,   // เก็บข้อมูล OS และจำนวนที่เกี่ยวข้อง
          totalCount: 1, // เก็บข้อมูลจำนวนทั้งหมด
        },
      },
      {
        $sort: { year: 1 },  // จัดเรียงตามปี
      },
    ]);

    res.json(assetOverTime);
  } catch (error) {
    console.error('Error fetching asset data over time:', error);
    res.status(500).send('Error fetching asset data over time');
  }
});

router.get('/assets-with-status', async (req, res) => {
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

module.exports = {
  router,
  fetchDataFromApi,
  mapAssetsToCves,
};
