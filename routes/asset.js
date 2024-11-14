const express = require('express');
const router = express.Router();
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const path = require('path');
const Asset = require('../models/asset');
const { mapAssetsToCves } = require('./route');
const xlsx = require('xlsx');
const { body, validationResult } = require('express-validator');
const authenticate = require('../middleware/authenticate');
const Notification = require('../models/notification');
const logger = require('../logger');
const { getWss } = require('../websocket');

// Config Multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads/');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const allowedMimeTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'));
    }
    cb(null, true);
  }
});

const processCsv = async (filePath) => {
  return new Promise((resolve, reject) => {
    const assets = [];
    let isFirstRow = true;

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        if (isFirstRow) {
          logger.info('CSV Headers: %o', Object.keys(row));
          isFirstRow = false;
        }
        logger.info('Processing row: %o', row);
        if (row.device_name && row.application_name && row.operating_system && row.os_version) {
          assets.push({
            device_name: row.device_name,
            application_name: row.application_name,
            operating_system: row.operating_system,
            os_version: row.os_version,
            contact: row.contact || '',
          });
        } else {
          logger.warn('Invalid row data: %o', row);
        }
      })
      .on('end', () => {
        logger.info('Total assets processed: %d', assets.length);
        if (assets.length === 0) {
          reject(new Error('No valid assets found in the file'));
        } else {
          resolve(assets);
        }
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

// Middleware for authentication
router.use(authenticate);

router.post('/upload', upload.single('file'), async (req, res) => {
  const wss = getWss();
  try {
    const fileType = path.extname(req.file.originalname).toLowerCase();
    let assets = [];

    const userId = req.user.userId;

    if (fileType === '.csv') {
      assets = await processCsv(req.file.path);
    } else if (fileType === '.xlsx' || fileType === '.xls') {
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(sheet);
      jsonData.forEach(row => {
        if (row.device_name && row.application_name && row.operating_system && row.os_version) {
          assets.push({
            device_name: row.device_name,
            application_name: row.application_name,
            operating_system: row.operating_system,
            os_version: row.os_version,
            contact: row.contact || '',
          });
        } else {
          logger.warn('Invalid row data: %o', row);
        }
      });
    } else {
      return res.status(400).send('Unsupported file type');
    }

    if (assets.length === 0) {
      return res.status(400).send('No valid assets found in the file');
    }

    await Asset.insertMany(assets);

    if (wss) {
      wss.broadcast({ type: 'status', status: 'เริ่มต้นการแมป CVE สำหรับ Asset' });
    }

    for (const asset of assets) {
      try {
        await mapAssetsToCves(asset, userId);
        if (wss) {
          wss.broadcast({ type: 'status', status: `ดึงข้อมูล CVE สำเร็จสำหรับ Asset: ${asset.device_name}` });
        }
      } catch (error) {
        logger.error('Error mapping asset to CVEs:', error);
        if (wss) {
          wss.broadcast({ type: 'status', status: `เกิดข้อผิดพลาดในการดึงข้อมูล CVE สำหรับ Asset: ${asset.device_name}` });
        }
      }
    }

    if (wss) {
      const notificationMessage = `New assets added from file: ${req.file.originalname}`;
      wss.broadcast({ type: 'notification', message: notificationMessage });
      const notification = new Notification({ message: notificationMessage });
      await notification.save();
    }

    res.status(200).send('File uploaded and assets added successfully');
  } catch (error) {
    logger.error('Error uploading file:', error);
    res.status(500).send('Server error during file upload');
  } finally {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

// Route to handle manual asset addition
router.post(
  '/',
  [
    body('device_name').isString().trim().escape(),
    body('application_name').isString().trim().escape(),
    body('operating_system').isString().trim().escape(),
    body('os_version').isString().trim().escape(),
    body('contact').optional().isString().trim().escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors: %o', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const wss = getWss();

    try {
      const newAsset = new Asset(req.body);
      await newAsset.save();

      const userId = req.user.userId; // ดึง userId จาก middleware authenticate

      if (wss) {
        wss.broadcast({ type: 'status', status: `เริ่มต้นการแมป CVE สำหรับ Asset: ${newAsset.device_name}` });
      }

      // ไม่ต้องใช้ await ที่นี่ เพื่อไม่ให้บล็อกการตอบกลับ
      mapAssetsToCves(newAsset, userId).then(() => {
        if (wss) {
          wss.broadcast({ type: 'status', status: `ดึงข้อมูล CVE สำเร็จสำหรับ Asset: ${newAsset.device_name}` });
        }
      }).catch((error) => {
        logger.error('Error mapping asset to CVEs:', error);
        if (wss) {
          wss.broadcast({ type: 'status', status: `เกิดข้อผิดพลาดในการดึงข้อมูล CVE สำหรับ Asset: ${newAsset.device_name}` });
        }
      });

      // Send notification via WebSocket
      if (wss) {
        const notificationMessage = `New asset added: ${newAsset.device_name}`;
        wss.broadcast({ type: 'notification', message: notificationMessage });

        // Save notification in database
        const notification = new Notification({ message: notificationMessage });
        await notification.save();
      }

      res.status(201).send(newAsset);
    } catch (error) {
      logger.error('Error adding asset manually:', error);
      res.status(500).send('Server error during asset addition');
    }
  }
);

module.exports = router;