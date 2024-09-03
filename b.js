const axios = require('axios');
const express = require('express');
const router = express.Router();
const Cve = require('../models/cve');
const Asset = require('../models/asset');
const Vulnerability = require('../models/vulnerability'); // ต้องสร้าง model สำหรับ Vulnerability ด้วย
const https = require('https');
const { query, validationResult } = require('express-validator');
const sanitize = require('mongo-sanitize');

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getCvssScore = (cve) => {
  if (cve.metrics && cve.metrics.cvssMetricV31 && cve.metrics.cvssMetricV31.length > 0) {
    return {
      score: cve.metrics.cvssMetricV31[0].cvssData.baseScore,
      version: '3.1'
    };
  } else if (cve.metrics && cve.metrics.cvssMetricV30 && cve.metrics.cvssMetricV30.length > 0) {
    return {
      score: cve.metrics.cvssMetricV30[0].cvssData.baseScore,
      version: '3.0'
    };
  } else if (cve.metrics && cve.metrics.cvssMetricV2 && cve.metrics.cvssMetricV2.length > 0) {
    return {
      score: cve.metrics.cvssMetricV2[0].cvssData.baseScore,
      version: '2.0'
    };
  } else {
    return {
      score: null,
      version: null
    };
  }
};

const getRiskLevel = (score) => {
  if (score >= 9.0) return 'Critical';
  if (score >= 7.0) return 'High';
  if (score >= 4.0) return 'Medium';
  return 'Low';
};

const fetchDataFromApi = async (asset) => {
  const { os, version } = asset;
  const keyword = `${os} ${version}`;
  const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(keyword)}`;
  console.log(`Fetching data from API using keyword: ${keyword}`);
  
  try {
    const response = await axiosInstance.get(url);
    const vulnerabilities = response.data.vulnerabilities;

    if (vulnerabilities.length > 0) {
      console.log(`Fetched ${vulnerabilities.length} vulnerabilities from API for OS: ${os}, Version: ${version}`);
    } else {
      console.log(`No vulnerabilities found for OS: ${os}, Version: ${version}`);
    }

    for (let i = 0; i < vulnerabilities.length; i += 10) {
      const batch = vulnerabilities.slice(i, i + 10);

      for (const vuln of batch) {
        const cvss = getCvssScore(vuln.cve); // Get the latest CVSS score and version
        const score = cvss.score;
        const riskLevel = getRiskLevel(score);

        // Preparing data to save in the Vulnerability collection
        const vulnerabilityData = {
          asset: asset._id,
          cveId: vuln.cve.id,
          sourceIdentifier: vuln.cve.sourceIdentifier,
          published: vuln.cve.published,
          lastModified: vuln.lastModifiedDate,
          vulnStatus: vuln.cve.vulnStatus,
          descriptions: vuln.cve.descriptions,
          metrics: vuln.cve.metrics,
          weaknesses: vuln.cve.weaknesses || [],
          configurations: vuln.cve.configurations,
          references: vuln.cve.references || [],
          riskLevel: riskLevel,
          cvssVersion: cvss.version, // Store the CVSS version
          cvssScore: score // Store the CVSS score
        };

        const vulnResult = await Vulnerability.updateOne(
          { cveId: vuln.cve.id },
          { $set: vulnerabilityData },
          { upsert: true }
        );

        if (vulnResult.upsertedCount > 0) {
          console.log(`New document inserted into vulnerability for CVE ID: ${vuln.cve.id}`);
        } else if (vulnResult.modifiedCount > 0) {
          console.log(`Document updated in vulnerability for CVE ID: ${vuln.cve.id}`);
        } else {
          console.log(`No changes made to the document in vulnerability for CVE ID: ${vuln.cve.id}`);
        }
      }

      if (i + 10 < vulnerabilities.length) {
        console.log('Waiting for 3 seconds before fetching the next batch...');
        await delay(3000); // หน่วงเวลา 3 วินาที
      }
    }
    
    console.log('Data update process completed for OS:', os, 'Version:', version);
    return vulnerabilities.map(vuln => vuln.cve);
  } catch (error) {
    console.error(`Error fetching data for OS: ${os}, Version: ${version}:`, error);
    return [];
  }
};

const fetchDataForAsset = async (asset) => {
  const sanitizedKeyword = sanitize(`${asset.os} ${asset.version}`);
  
  const existingData = await Cve.find({
    $or: [
      { 'configurations.nodes.cpeMatch.criteria': new RegExp(sanitizedKeyword, 'i') },
      { 'descriptions.value': new RegExp(sanitizedKeyword, 'i') },
      { id: new RegExp(sanitizedKeyword, 'i') },
      { sourceIdentifier: new RegExp(sanitizedKeyword, 'i') }
    ]
  });

  if (existingData.length > 0) {
    console.log(`Data found in DB for OS: ${asset.os}, Version: ${asset.version}`);
    return existingData;
  } else {
    console.log(`No data found in DB for OS: ${asset.os}, Version: ${asset.version}, fetching from API...`);
    return await fetchDataFromApi(asset);
  }
};

const mapAssetsToCves = async () => {
  try {
    const assets = await Asset.find();
    
    for (const asset of assets) {
      const cves = await fetchDataForAsset(asset);

      const mappedCves = cves.map(cve => {
        const cveData = cve.toObject ? cve.toObject() : cve;
        const cvss = getCvssScore(cveData); // Get the latest CVSS score and version
        const score = cvss.score;
        const riskLevel = getRiskLevel(score);

        return {
          asset: asset._id,
          cveId: cveData.id,
          sourceIdentifier: cveData.sourceIdentifier, // Ensure this exists
          published: cveData.published,
          lastModified: cveData.lastModified,
          vulnStatus: cveData.vulnStatus, // Ensure this exists
          descriptions: cveData.descriptions,
          metrics: cveData.metrics, // Ensure this exists
          weaknesses: cveData.weaknesses || [], // Ensure default empty array
          configurations: cveData.configurations,
          references: cveData.references || [], // Ensure default empty array
          riskLevel: riskLevel,
          cvssVersion: cvss.version, // Store the CVSS version
          cvssScore: score // Store the CVSS score
        };
      });

      await Vulnerability.insertMany(mappedCves);
      console.log(`Mapped CVEs for asset ${asset.name} and saved to vulnerabilities collection.`);
    }
  } catch (error) {
    console.error('Error mapping assets to CVEs:', error);
  }
};

// Route for updating and mapping assets to CVEs
router.get('/update', async (req, res) => {
  try {
    await mapAssetsToCves(); // อัปเดตอีกครั้งเพื่อความถูกต้อง
    res.send('Data updated and mapped successfully');
  } catch (error) {
    console.error('Error updating and mapping data:', error);
    res.status(500).send('Error updating and mapping data');
  }
});

// Route for fetching data from vulnerability collection
router.get('/vulnerabilities', [
  query('os').optional().isString().trim().escape(),
  query('version').optional().isString().trim().escape(),
  query('keyword').optional().isString().trim().escape()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const osFilter = req.query.os || '';
    const versionFilter = req.query.version || '';
    const keyword = req.query.keyword || '';

    let vulnerabilitiesQuery = {};
    if (osFilter) {
      vulnerabilitiesQuery.os = osFilter;
    }
    if (versionFilter) {
      vulnerabilitiesQuery.version = versionFilter;
    }
    if (keyword) {
      vulnerabilitiesQuery.$or = [
        { os: { $regex: new RegExp(keyword, 'i') } },
        { assetName: { $regex: new RegExp(keyword, 'i') } },
        { version: { $regex: new RegExp(keyword, 'i') } },
        { 'descriptions.value': { $regex: new RegExp(keyword, 'i') } }
      ];
    }

    const vulnerabilities = await Vulnerability.find(vulnerabilitiesQuery).limit(100);
    res.json({ mappedVulnerabilities: vulnerabilities });
  } catch (error) {
    console.error('Error fetching vulnerabilities:', error);
    res.status(500).send('Error fetching data');
  }
});

router.get('/assets/os-versions', async (req, res) => {
  try {
    const uniqueOs = await Asset.distinct('os');
    const versionsByOs = {};
    for (const os of uniqueOs) {
      versionsByOs[os] = await Asset.distinct('version', { os });
    }
    res.json({ uniqueOs, versionsByOs });
  } catch (error) {
    res.status(500).send('Error fetching data');
  }
});

// ส่งออก router และฟังก์ชัน fetchDataFromApi เพื่อใช้งานในไฟล์อื่น
module.exports = {
  router,
  fetchDataFromApi,
};
