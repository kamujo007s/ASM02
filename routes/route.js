const axios = require("axios");
const express = require("express");
const router = express.Router();
const Cve = require("../models/cve");
const Asset = require("../models/asset");
const Vulnerability = require("../models/vulnerability"); // ต้องสร้าง model สำหรับ Vulnerability ด้วย
const https = require("https");
const { query, validationResult } = require("express-validator");
const sanitize = require("mongo-sanitize");

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
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
  } else if (version === "2.0") {
    if (score >= 0.0 && score <= 3.9) return "Low";
    if (score >= 4.0 && score <= 6.9) return "Medium";
    if (score >= 7.0 && score <= 10.0) return "High";
  }
  return "Unknown"; // กรณีที่ไม่ตรงกับเงื่อนไขด้านบน
};

const fetchDataFromApi = async (asset) => {
  const { operating_system, os_version } = asset;
  const keyword = `${operating_system} ${os_version}`;
  const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(
    keyword
  )}`;
  console.log(`Fetching data from API using keyword: ${keyword}`);

  try {
    const response = await axiosInstance.get(url);
    const vulnerabilities = response.data.vulnerabilities;

    if (vulnerabilities.length > 0) {
      console.log(
        `Fetched ${vulnerabilities.length} vulnerabilities from API for OS: ${operating_system}, Version: ${os_version}`
      );
    } else {
      console.log(
        `No vulnerabilities found for OS: ${operating_system}, Version: ${os_version}`
      );
    }

    for (let i = 0; i < vulnerabilities.length; i += 10) {
      const batch = vulnerabilities.slice(i, i + 10);

      for (const vuln of batch) {
        const result = await Cve.updateOne(
          { id: vuln.cve.id },
          {
            $set: {
              ...vuln.cve,
              lastModifiedDate:
                vuln.lastModifiedDate || vuln.cve.lastModifiedDate,
              operating_system: operating_system,
              os_version: os_version,
            },
          },
          { upsert: true }
        );

        console.log(
          `Mapping CVE ID: ${vuln.cve.id} to Asset: ${asset.device_name}`
        );

        const cvss = getCvssScore(vuln.cve);
        const score = cvss.score;
        const riskLevel = getRiskLevel(score, cvss.version);
        const cveData = await Cve.findOne({ id: vuln.cve.id });
        const lastModified = cveData.lastModified;

        // Extract cpeMatch from configurations
        const cpeMatches = cveData.configurations
          .flatMap((config) =>
            config.nodes.flatMap((node) => node.cpeMatch || [])
          )
          .map((cpeMatch) => ({
            criteria: cpeMatch.criteria,
            matchCriteriaId: cpeMatch.matchCriteriaId,
          }));

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
          configurations: cpeMatches, // Store cpeMatches in the vulnerability data
          riskLevel: riskLevel,
          cvssVersion: cvss.version,
          cvssScore: score,
        };

        const vulnResult = await Vulnerability.updateOne(
          { cveId: vuln.cve.id },
          { $set: vulnerabilityData },
          { upsert: true }
        );

        if (vulnResult.upsertedCount > 0) {
          console.log(
            `New document inserted into vulnerability for CVE ID: ${vuln.cve.id}`
          );
        } else if (vulnResult.modifiedCount > 0) {
          console.log(
            `Document updated in vulnerability for CVE ID: ${vuln.cve.id}`
          );
        } else {
          console.log(
            `No changes made to the document in vulnerability for CVE ID: ${vuln.cve.id}`
          );
        }
      }

      if (i + 10 < vulnerabilities.length) {
        console.log("Waiting for 3 seconds before fetching the next batch...");
        await delay(3000);
      }
    }

    console.log(
      "Data update process completed for OS:",
      operating_system,
      "Version:",
      os_version
    );
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
      const cves = await fetchDataFromApi(asset); // ใช้ fetchDataFromApi เพื่อดึงข้อมูล CVE

      const mappedCves = cves.map((cve) => {
        const cveData = cve.toObject ? cve.toObject() : cve;
        const cvss = getCvssScore(cveData);
        const score = cvss.score; // แยกค่าจาก cvss object
        const riskLevel = getRiskLevel(score, cvss.version); // ใช้ score และ version ในการคำนวณระดับความเสี่ยง

        const configurations = cveData.configurations?.flatMap(config =>
          config.nodes?.flatMap(node =>
            node.cpeMatch?.map(match => ({
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
          cveId: cveData.id,
          cvssScore: score, // เก็บเฉพาะคะแนนของ CVSS
          riskLevel: riskLevel,
          descriptions: cveData.descriptions,
          configurations: configurations,
          published: cveData.published,
          lastModified: cveData.lastModified,
          cvssVersion: cvss.version, // เก็บเวอร์ชันของ CVSS
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



// Route for updating and mapping assets to CVEs
router.get("/update", async (req, res) => {
  try {
    await mapAssetsToCves(); // อัปเดตอีกครั้งเพื่อความถูกต้อง
    res.send("Data updated and mapped successfully");
  } catch (error) {
    console.error("Error updating and mapping data:", error);
    res.status(500).send("Error updating and mapping data");
  }
});

// Route for fetching data from vulnerability collection
router.get(
  "/vulnerabilities",
  [
    query("operating_system").optional().isString().trim().escape(),
    query("os_version").optional().isString().trim().escape(),
    query("keyword").optional().isString().trim().escape(),
    query("riskLevel").optional().isString().trim().escape(), // เพิ่มพารามิเตอร์นี้
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
        os,
        version,
        keyword,
        riskLevel,
        page = 1,
        limit = 50,
      } = req.query;

      let vulnerabilitiesQuery = {};
      if (os) {
        vulnerabilitiesQuery.os = os;
      }
      if (version) {
        vulnerabilitiesQuery.version = version;
      }
      if (keyword) {
        vulnerabilitiesQuery.$or = [
          { os: { $regex: new RegExp(keyword, "i") } },
          { assetName: { $regex: new RegExp(keyword, "i") } },
          { version: { $regex: new RegExp(keyword, "i") } },
          { "descriptions.value": { $regex: new RegExp(keyword, "i") } },
        ];
      }
      if (riskLevel) {
        vulnerabilitiesQuery.riskLevel = riskLevel;
      }

      const totalCount = await Vulnerability.countDocuments(
        vulnerabilitiesQuery
      );
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
      versionsByOs[os] = await Asset.distinct("os_version", { os });
    }
    res.json({ uniqueOs, versionsByOs });
  } catch (error) {
    res.status(500).send("Error fetching data");
  }
});

// ส่งออก router และฟังก์ชัน fetchDataFromApi เพื่อใช้งานในไฟล์อื่น
module.exports = {
  router,
  fetchDataFromApi,
  mapAssetsToCves,
};
