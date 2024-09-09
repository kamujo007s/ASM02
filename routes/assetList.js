const express = require('express');
const router = express.Router();
const Cve = require("../models/cve");
const Asset = require("../models/asset");

const checkMatchingCve = async (operating_system, os_version) => {
    // ใช้ Regex เพื่อแยกชื่อ OS และตัวเลขปี
    const osPattern = /windows\s*server\s*(\d{4})?/i; // จับกลุ่ม Windows Server 2016, Windows Server 2012 เป็นต้น
    const osMatch = operating_system.toLowerCase().match(osPattern);
  
    if (!osMatch) return false; // ถ้าไม่สามารถจับคู่ได้ ให้คืนค่า false
  
    const baseOsName = osMatch[0]; // ชื่อ OS เช่น "windows server"
    const year = osMatch[1]; // ตัวเลขปี เช่น "2016" หรือ "2012"
  
    // ถ้ามีปีอยู่ ให้ตรวจสอบปีใน criteria
    const yearRegex = year ? new RegExp(`windows_server_${year}`, 'i') : new RegExp(`windows_server`, 'i');
  
    // ค้นหา CVE ที่ตรงกับ OS และ OS Version (รวมทั้งการจับคู่ปีใน criteria ด้วย)
    const cves = await Cve.find({
      'configurations.nodes.cpeMatch': {
        $elemMatch: {
          $or: [
            { criteria: new RegExp(`cpe:.*:o:microsoft:${baseOsName}.*:${os_version}:`, 'i') }, // OS + Version + Year (ถ้ามี)
            { criteria: yearRegex } // ตรวจสอบเฉพาะปีและ OS อย่างเดียว
          ]
        }
      }
    });
  
    const matchByVersion = cves.some(cve => {
      return cve.configurations.some(config => {
        return config.nodes.some(node => {
          return node.cpeMatch.some(match => {
            return new RegExp(`cpe:.*:o:microsoft:${baseOsName}.*:${os_version}:`, 'i').test(match.criteria); // ตรวจสอบ OS + Version
          });
        });
      });
    });
  
    if (!matchByVersion) {
      const matchByOsOnly = cves.some(cve => {
        return cve.configurations.some(config => {
          return config.nodes.some(node => {
            return node.cpeMatch.some(match => {
              return yearRegex.test(match.criteria); // ตรวจจับปีและ OS อย่างเดียว
            });
          });
        });
      });
  
      if (matchByOsOnly) {
        return true;
      }
    } else {
      return true;
    }
  
    return false; // ถ้าไม่เจอการจับคู่คืนค่า false
  };
  

// Route สำหรับดึงข้อมูล Asset พร้อม Status
router.get('/assets-with-status', async (req, res) => {
  try {
    const assets = await Asset.find(); // ดึงข้อมูล Asset ทั้งหมด

    const assetWithStatus = await Promise.all(
      assets.map(async (asset) => {
        const match = await checkMatchingCve(asset.operating_system, asset.os_version);

        return {
          ...asset.toObject(),
          status: match ? 'True' : 'False' // กำหนดสถานะ True/False
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
