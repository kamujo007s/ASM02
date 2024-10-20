// routes/asset.js

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
const Notification = require('../models/notification'); // Import Notification model
const { getWss } = require('../websocket'); // Import getWss

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

const upload = multer({ storage: storage });

// Helper function to process CSV
const processCsv = async (filePath) => {
  return new Promise((resolve, reject) => {
    const assets = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row) => {
        if (row.device_name && row.application_name && row.operating_system && row.os_version) {
          assets.push({
            device_name: row.device_name,
            application_name: row.application_name,
            operating_system: row.operating_system,
            os_version: row.os_version,
            contact: row.contact || '',
          });
        } else {
          console.error('Invalid row detected:', row);
        }
      })
      .on('end', () => {
        if (assets.length === 0) {
          reject(new Error('No valid assets found in the CSV file.'));
        } else {
          resolve(assets);
        }
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

const processExcel = async (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  const assets = worksheet.map(row => {
    const { Device_Name, Application_Name, Operating_System, OS_Version } = row;

    if (!Device_Name || !Application_Name || !Operating_System || !OS_Version) {
      console.error('Missing required fields in row:', row);
      return null;
    }

    return {
      device_name: Device_Name,
      application_name: Application_Name,
      operating_system: Operating_System,
      os_version: OS_Version,
    };
  }).filter(asset => asset !== null);

  if (assets.length === 0) {
    throw new Error('No valid assets found in the Excel file.');
  }

  return assets;
};

// Middleware for authentication
router.use(authenticate);

// Route to handle file upload
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const fileType = path.extname(req.file.originalname).toLowerCase();
    let assets = [];

    const userId = req.user.id; // ดึง userId จาก middleware authenticate

    if (fileType === '.csv') {
      assets = await processCsv(req.file.path);
    } else if (fileType === '.xlsx' || fileType === '.xls') {
      assets = await processExcel(req.file.path);
    } else {
      return res.status(400).send('Unsupported file type');
    }

    if (assets.length === 0) {
      return res.status(400).send('No valid assets found in the file');
    }

    await Asset.insertMany(assets);

    const wss = getWss();

    for (const asset of assets) {
      mapAssetsToCves(asset);

      // ไม่ต้องส่งข้อมูลความคืบหน้าอีกต่อไป
    }

    // ส่งการแจ้งเตือนผ่าน WebSocket
    if (wss) {
      const notificationMessage = `New assets added from file: ${req.file.originalname}`;
      const notificationData = { type: 'notification', message: notificationMessage };
      wss.broadcast(notificationData);

      // Save notification in database
      const notification = new Notification({ message: notificationMessage });
      await notification.save();
    }

    res.status(200).send('File uploaded and assets added successfully');
  } catch (error) {
    console.error('Error uploading file:', error);
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
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const newAsset = new Asset(req.body);
      await newAsset.save();

      const userId = req.user.id; // ดึง userId จาก middleware authenticate

      // ไม่ต้องใช้ await ที่นี่ เพื่อไม่ให้บล็อกการตอบกลับ
      mapAssetsToCves(newAsset, userId);

      // Send notification via WebSocket
      const wss = getWss();
      if (wss) {
        const notificationMessage = `New asset added: ${newAsset.device_name}`;
        const notificationData = { type: 'notification', message: notificationMessage };
        wss.broadcast(notificationData);

        // Save notification in database
        const notification = new Notification({ message: notificationMessage });
        await notification.save();
      }

      res.status(201).send(newAsset);
    } catch (error) {
      console.error('Error adding asset manually:', error);
      res.status(500).send('Server error during asset addition');
    }
  }
);

module.exports = router;
