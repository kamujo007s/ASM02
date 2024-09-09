// index.js
const express = require('express');
const cron = require('node-cron');
const helmet = require('helmet');
const cors = require('cors'); // เพิ่มการนำเข้า CORS
const path = require('path');
const os = require('os');
const app = express();
const connectDB = require('./db/connection');
const Asset = require('./models/asset');
const assetRoutes = require('./routes/asset');
const bodyParser = require('body-parser');

const assetList = require('./routes/assetList');
const { router: cveRoutes, fetchDataFromApi } = require('./routes/route');

app.use(helmet());
app.use(cors()); // ใช้ CORS เพื่ออนุญาตคำขอจาก Frontend
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database connection
connectDB();

// Static file serving for the React app
app.use(express.static(path.join(__dirname, 'front-end/build')));

// API Routes
app.use('/api/assets', assetRoutes); // เส้นทางสำหรับจัดการ assets
app.use('/cve', cveRoutes); // เส้นทางสำหรับจัดการ CVE
app.use('/assetList', assetList); // เส้นทางสำหรับจัดการ assets

// Serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'front-end/build', 'index.html'));
});

// Fetch CVE data for all assets when the server starts
const fetchCveDataOnStart = async () => {
  try {
    const assets = await Asset.find();
    for (const asset of assets) {
      await fetchDataFromApi(asset);
    }
    console.log('Initial CVE data fetched successfully for all assets');
  } catch (error) {
    console.error('Error fetching initial CVE data:', error);
  }
};

// Schedule the task to run every 3 days at midnight
cron.schedule('0 0 */3 * *', async () => {
  try {
    const assets = await Asset.find();
    for (const asset of assets) {
      await fetchDataFromApi(asset);
    }
    console.log('CVE data updated successfully for all assets');
  } catch (error) {
    console.error('Error updating CVE data:', error);
  }
});

// Start the server
const PORT = process.env.PORT || 3000;

const ifaces = os.networkInterfaces();

let ipAddress = '127.0.0.1'; // ใช้ localhost ถ้าหา IP Address ไม่เจอ

Object.keys(ifaces).forEach(function (ifname) {
  ifaces[ifname].forEach(function (iface) {
    if ('IPv4' === iface.family && !iface.internal) {
      ipAddress = iface.address;
    }
  });
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`You can access the application at: http://${ipAddress}:${PORT}`);
  
  // Fetch initial CVE data
  await fetchCveDataOnStart();
});
