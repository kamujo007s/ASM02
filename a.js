const express = require('express');
const cron = require('node-cron');
const helmet = require('helmet');
const path = require('path');
const os = require('os'); 
const app = express();
const connectDB = require('./db/connection');
const assetRoutes = require('./routes/asset');
const { router: cveRoutes, fetchDataFromApi, mapAssetsToCves } = require('./routes/route'); // ดึง mapAssetsToCves มาด้วย

// Use Helmet for secure HTTP headers
app.use(helmet());

// Serve static files from the React app build folder
app.use(express.static(path.join(__dirname, 'front-end/build')));

// Database connection
connectDB();

// Routes
app.use('/cve', cveRoutes);
app.use('/api/assets', assetRoutes); // เพิ่มเส้นทางสำหรับ asset

// Serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'front-end/build', 'index.html'));
});

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

let ipAddress = '127.0.0.1';

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
});
