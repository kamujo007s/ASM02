const express = require('express');
const router = express.Router();
const Cve = require("../models/cve");
const Asset = require("../models/asset");

const checkMatchingCve = async (operating_system, os_version) => {
  if (operating_system.toLowerCase().includes("linux")) {
    operating_system = "redhat"; // เปลี่ยนให้เป็น "redhat" สำหรับการค้นหาในฐานข้อมูล
  }

  // ดึง CVE ที่มี OS ตรงกัน
  const cves = await Cve.find({
    'configurations.nodes.cpeMatch': {
      $elemMatch: {
        criteria: new RegExp(`cpe:2.3:o:redhat:${operating_system.replace(/\s/g, '_').toLowerCase()}:`, 'i') // ตรวจสอบ OS ว่าตรงกัน
      }
    }
  });

  // ตรวจสอบว่า cve ใดบ้างที่มี version ตรงกันใน criteria
  const matchByVersion = cves.some(cve => {
    return cve.configurations.some(config => {
      return config.nodes.some(node => {
        return node.cpeMatch.some(match => {
          const osMatch = new RegExp(`cpe:.*:o:redhat:${operating_system.replace(/\s/g, '_')}:`).test(match.criteria);
          const versionMatch = new RegExp(`:${os_version}:`).test(match.criteria);
          
          if (osMatch && versionMatch) {
            console.log(`Match found for OS: ${operating_system} and Version: ${os_version}`);
            return true;
          } else {
            console.log(`No match found for OS: ${operating_system} or Version: ${os_version}`);
            return false;
          }
        });
      });
    });
  });

  // ถ้าไม่มี match โดย version, ให้เช็คเฉพาะ OS อย่างเดียว
  if (!matchByVersion) {
    const matchByOsOnly = cves.some(cve => {
      return cve.configurations.some(config => {
        return config.nodes.some(node => {
          return node.cpeMatch.some(match => {
            const osOnlyMatch = new RegExp(`cpe:.*:o:redhat:${operating_system.replace(/\s/g, '_')}:`).test(match.criteria);
            if (osOnlyMatch) {
              console.log(`OS match found for: ${operating_system} without version`);
              return true;
            }
            return false;
          });
        });
      });
    });

    return matchByOsOnly;
  }

  return matchByVersion;
};


// Route สำหรับดึงข้อมูล Asset พร้อม Status และ CVE IDs
router.get('/assets-with-status', async (req, res) => {
  try {
    const assets = await Asset.find(); // ดึงข้อมูล Asset ทั้งหมด

    const assetWithStatus = await Promise.all(
      assets.map(async (asset) => {
        const matchingCveIds = await checkMatchingCve(asset.operating_system, asset.os_version);

        return {
          ...asset.toObject(),
          status: matchingCveIds.length > 0 ? 'True' : 'False', // กำหนดสถานะ True/False
          matchingCveIds, // ส่ง CVE IDs ที่ตรงกันกลับไป
        };
      })
    );

    res.json(assetWithStatus); // ส่งข้อมูลกลับในรูป JSON
  } catch (error) {
    console.error('Error fetching assets with status:', error);
    res.status(500).send('Error fetching assets with status');
  }
});

// Route สำหรับดึงข้อมูล Asset พร้อม Status และ Criteria
router.get('/assets-with-status', async (req, res) => {
  try {
    const assets = await Asset.find(); // ดึงข้อมูล Asset ทั้งหมด

    const assetWithStatus = await Promise.all(
      assets.map(async (asset) => {
        const match = await checkMatchingCve(asset.operating_system, asset.os_version);
        const cves = await Cve.find({
          'configurations.nodes.cpeMatch': {
            $elemMatch: {
              criteria: new RegExp(`.*`, 'i') // กรองทุก CVE เพื่อส่งข้อมูล criteria ไปยัง Front-End
            }
          }
        });

        // ส่งข้อมูลกลับพร้อม Criteria
        return {
          ...asset.toObject(),
          status: match ? 'True' : 'False', // กำหนดสถานะ True/False
          criteriaList: cves.flatMap(cve => cve.configurations.flatMap(config =>
            config.nodes.flatMap(node => node.cpeMatch.map(match => match.criteria))
          ))
        };
      })
    );

    res.json(assetWithStatus); // ส่งข้อมูลกลับในรูป JSON
  } catch (error) {
    console.error('Error fetching assets with status:', error);
    res.status(500).send('Error fetching assets with status');
  }
});

module.exports = router;
