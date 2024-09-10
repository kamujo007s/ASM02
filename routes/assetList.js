const express = require('express');
const router = express.Router();
const Cve = require("../models/cve");
const Asset = require("../models/asset");

const checkMatchingCve = async (operating_system, os_version) => {
  // ใช้ Regex เพื่อแยกชื่อ OS สำหรับ Red Hat และ Windows
  const osPatternWindows = /windows\s*server\s*(\d{4})?/i; // จับกลุ่ม Windows Server 2016, Windows Server 2012
  const osPatternRedHat = /linux\s*red\s*hat\s*(\d+(\.\d+)*)?/i; // จับกลุ่ม Red Hat Linux 6.0, 7.9 เป็นต้น
  
  let baseOsName = null;
  let versionMatch = null;
  
  // ตรวจจับ Windows Server
  if (osPatternWindows.test(operating_system)) {
    const osMatch = operating_system.toLowerCase().match(osPatternWindows);
    baseOsName = osMatch[0];
    const year = osMatch[1];
    
    // ใช้ year ถ้ามี
    const yearRegex = year ? new RegExp(`windows_server_${year}`, 'i') : new RegExp(`windows_server`, 'i');
  
    // ค้นหา CVE สำหรับ Windows Server
    const cves = await Cve.find({
      'configurations.nodes.cpeMatch': {
        $elemMatch: {
          $or: [
            { criteria: new RegExp(`cpe:.*:o:microsoft:${baseOsName}.*:${os_version}:`, 'i') }, // OS + Version
            { criteria: yearRegex } // OS อย่างเดียวพร้อมจับปี
          ]
        }
      }
    });

    return checkCveMatches(cves, baseOsName, os_version, yearRegex); // ตรวจสอบผลลัพธ์จาก Windows
  }

  // ตรวจจับ Red Hat Linux
  if (osPatternRedHat.test(operating_system)) {
    const osMatch = operating_system.toLowerCase().match(osPatternRedHat);
    baseOsName = osMatch[0]; // ชื่อ OS เช่น "linux red hat"
    versionMatch = osMatch[1]; // ตัวเลขเวอร์ชัน เช่น "6.0" หรือ "7.9"

    const versionRegex = versionMatch
      ? new RegExp(`redhat:linux:${versionMatch}`, 'i') // OS + Version
      : new RegExp(`redhat:linux`, 'i'); // เฉพาะ OS

    // ค้นหา CVE สำหรับ Red Hat
    const cves = await Cve.find({
      'configurations.nodes.cpeMatch': {
        $elemMatch: {
          $or: [
            { criteria: new RegExp(`cpe:.*:o:redhat:linux.*:${os_version}:`, 'i') }, // OS + Version
            { criteria: versionRegex } // OS อย่างเดียว
          ]
        }
      }
    });

    return checkCveMatches(cves, baseOsName, os_version, versionRegex); // ตรวจสอบผลลัพธ์จาก Red Hat
  }

  return false; // ไม่เจอ OS ที่ตรงกัน
};

const checkCveMatches = (cves, baseOsName, os_version, regex) => {
  const matchByVersion = cves.some(cve => {
    return cve.configurations.some(config => {
      return config.nodes.some(node => {
        return node.cpeMatch.some(match => {
          return new RegExp(`cpe:.*:o:${baseOsName}.*:${os_version}:`, 'i').test(match.criteria); // ตรวจสอบ OS + Version
        });
      });
    });
  });

  if (!matchByVersion) {
    const matchByOsOnly = cves.some(cve => {
      return cve.configurations.some(config => {
        return config.nodes.some(node => {
          return node.cpeMatch.some(match => {
            return regex.test(match.criteria); // ตรวจจับเฉพาะ OS
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

  return false;

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
