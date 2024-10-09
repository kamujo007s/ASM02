const express = require('express');
const cron = require('node-cron');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const os = require('os');
const http = require('http');
const WebSocket = require('ws');
const app = express();
const connectDB = require('./db/connection');
const Asset = require('./models/asset');
const assetRoutes = require('./routes/asset');
const authRoutes = require('./routes/auth');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const assetList = require('./routes/assetList');
const { router: cveRoutes, fetchDataFromApi, setWebSocketServer } = require('./routes/route');

app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Database connection
connectDB();

// API Routes
app.use('/api/assets', assetRoutes);
app.use('/api/auth', authRoutes);
app.use('/cve', cveRoutes);
app.use('/assetList', assetList);

// Create HTTP server and WebSocket server
const server = http.createServer(app);
setWebSocketServer(server); // ตั้งค่า WebSocket server

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
const PORT = process.env.PORT || 3012;

const ifaces = os.networkInterfaces();

let ipAddress = '127.0.0.1';

Object.keys(ifaces).forEach(function (ifname) {
  ifaces[ifname].forEach(function (iface) {
    if ('IPv4' === iface.family && !iface.internal) {
      ipAddress = iface.address;
    }
  });
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`You can access the application at: http://${ipAddress}:${PORT}`);
  console.log(`local: http://localhost:${PORT}`);
  
  // Fetch initial CVE data
  await fetchCveDataOnStart();
});