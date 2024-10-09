const axios = require("axios");
const express = require("express");
const router = express.Router();
const Cve = require("../models/cve");
const Asset = require("../models/asset");
const Vulnerability = require("../models/vulnerability");
const https = require("https");
const { query, validationResult } = require("express-validator");
const helmet = require("helmet");
const WebSocket = require('ws'); // ตรวจสอบการนำเข้า WebSocket
const Notification = require('../models/notification'); // เพิ่มการนำเข้า Notification

const app = express();
app.use(helmet());

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
      score: 0.0,
      version: "Unknown",
    };
  }
};

const getRiskLevel = (score, version) => {
  if (version === "3.1" || version === "3.0") {
    if (score === 0.0) {
      return "None";
    } else if (score >= 0.1 && score <= 3.9) {
      return "Low";
    } else if (score >= 4.0 && score <= 6.9) {
      return "Medium";
    } else if (score >= 7.0 && score <= 8.9) {
      return "High";
    } else if (score >= 9.0 && score <= 10.0) {
      return "Critical";
    } else {
      return "Unknown";
    }
  } else if (version === "2.0") {
    if (score === 0.0) {
      return "None";
    } else if (score >= 0.1 && score <= 3.9) {
      return "Low";
    } else if (score >= 4.0 && score <= 6.9) {
      return "Medium";
    } else if (score >= 7.0 && score <= 10.0) {
      return "High";
    } else {
      return "Unknown";
    }
  } else {
    return "Unknown";
  }
};

// เพิ่มการตั้งค่า WebSocket

let wss;
const setWebSocketServer = (server) => {
  wss = new WebSocket.Server({ server }); // ตรวจสอบการสร้าง WebSocket.Server

  wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  };
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
      await delay(6000); // หน่วงเวลา 6 วินาทีระหว่างการร้องขอแต่ละครั้ง
      const chunk = vulnerabilities.slice(i, i + 10);

      for (const vuln of chunk) {
        const cve = vuln.cve;
        const existingCve = await Cve.findOne({ id: cve.id });

        if (!existingCve) {
          const newCve = new Cve({
            id: cve.id,
            sourceIdentifier: cve.sourceIdentifier,
            published: cve.published,
            lastModified: cve.lastModified,
            vulnStatus: cve.vulnStatus,
            descriptions: cve.descriptions,
            metrics: cve.metrics,
            weaknesses: cve.weaknesses,
            configurations: cve.configurations,
            references: cve.references,
          });
          await newCve.save();

          const { score, version } = getCvssScore(cve);
          const riskLevel = getRiskLevel(score, version);

          const vulnerability = new Vulnerability({
            asset: asset._id,
            operating_system: asset.operating_system,
            os_version: asset.os_version,
            cveId: newCve.id,
            published: newCve.published,
            lastModified: newCve.lastModified,
            vulnStatus: newCve.vulnStatus,
            descriptions: newCve.descriptions,
            riskLevel: riskLevel,
            cvssVersion: version,
            cvssScore: score,
            configurations: cve.configurations,
          });
          await vulnerability.save();

          // ส่งการแจ้งเตือนผ่าน WebSocket
          if (wss) {
            const notificationMessage = `New CVE found for asset ${asset.device_name}: ${newCve.id}`;
            wss.broadcast(notificationMessage);

            // บันทึกการแจ้งเตือนในฐานข้อมูล
            const notification = new Notification({ message: notificationMessage });
            await notification.save();
          }
        }
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
      await fetchDataFromApi(asset);
    }
  } catch (error) {
    console.error("Error mapping assets to CVEs:", error);
  }
};

const authenticate = (req, res, next) => {
  // เพิ่ม logic สำหรับการยืนยันตัวตน
  next();
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
      const { operating_system, os_version, keyword, riskLevel, page = 1, limit = 10 } = req.query;

      const query = {};
      if (operating_system) query.operating_system = operating_system;
      if (os_version) query.os_version = os_version;
      if (keyword) query.$text = { $search: keyword };
      if (riskLevel) query.riskLevel = riskLevel;

      const vulnerabilities = await Vulnerability.find(query)
        .skip((page - 1) * limit)
        .limit(limit);

      res.json(vulnerabilities);
    } catch (error) {
      console.error("Error fetching vulnerabilities:", error);
      res.status(500).send("Error fetching vulnerabilities");
    }
  }
);

router.get("/assets/os-versions", authenticate, async (req, res) => {
  try {
    const assets = await Asset.find().distinct("os_version");
    res.json(assets);
  } catch (error) {
    console.error("Error fetching OS versions:", error);
    res.status(500).send("Error fetching OS versions");
  }
});

router.get('/vulnerability-summary', authenticate, async (req, res) => {
  try {
    const summary = await Vulnerability.aggregate([
      {
        $group: {
          _id: "$riskLevel",
          count: { $sum: 1 },
        },
      },
    ]);
    res.json(summary);
  } catch (error) {
    console.error("Error fetching vulnerability summary:", error);
    res.status(500).send("Error fetching vulnerability summary");
  }
});

const checkMatchingCve = async (operating_system, os_version) => {
  const vulnerabilities = await Vulnerability.find({
    operating_system: operating_system,
    os_version: os_version,
  });

  return vulnerabilities.length > 0;
};

router.get('/asset-over-time', authenticate, async (req, res) => {
  try {
    const assets = await Asset.aggregate([
      {
        $group: {
          _id: { $substr: ["$createdAt", 0, 7] },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json(assets);
  } catch (error) {
    console.error("Error fetching assets over time:", error);
    res.status(500).send("Error fetching assets over time");
  }
});

router.get('/assets-with-status', authenticate, async (req, res) => {
  try {
    const assets = await Asset.aggregate([
      {
        $lookup: {
          from: "vulnerabilities",
          localField: "_id",
          foreignField: "asset",
          as: "vulnerabilities",
        },
      },
      {
        $project: {
          device_name: 1,
          operating_system: 1,
          os_version: 1,
          vulnerabilities: 1,
          riskLevel: {
            $cond: {
              if: { $gt: [{ $size: "$vulnerabilities" }, 0] },
              then: { $arrayElemAt: ["$vulnerabilities.riskLevel", 0] },
              else: "None",
            },
          },
        },
      },
    ]);
    res.json(assets);
  } catch (error) {
    console.error("Error fetching assets with status:", error);
    res.status(500).send("Error fetching assets with status");
  }
});

module.exports = {
  router,
  fetchDataFromApi,
  mapAssetsToCves,
  setWebSocketServer,
};