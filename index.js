// index.js
const express = require('express');
const cron = require('node-cron');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const os = require('os');
const http = require('http');
const app = express();
const connectDB = require('./db/connection');
const Asset = require('./models/asset');
const Notification = require('./models/notification');
const assetRoutes = require('./routes/asset');
const authRoutes = require('./routes/auth');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const authenticateMiddleware = require('./middleware/authenticate');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const myCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

const { router: cveRoutes, fetchDataFromApi, mapAssetsToCves } = require('./routes/route');

const { initializeWebSocket } = require('./websocket'); // Import initializeWebSocket

app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Database connection
connectDB();

// Rate limit for notifications API
const notificationsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per minute
  message: 'Too many requests, please try again later.',
});

// API Routes with rate limit
app.use('/api/assets', authenticateMiddleware, assetRoutes);
app.use('/api/auth', authRoutes);
app.use('/cve', authenticateMiddleware, cveRoutes);


// Use the rate limiter for the notifications route
app.use('/cve/notifications', notificationsLimiter, authenticateMiddleware, async (req, res) => {
  const cachedNotifications = myCache.get('notifications');

  if (cachedNotifications) {
    return res.json(cachedNotifications);
  }

  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    myCache.set('notifications', notifications); // Cache notifications for 1 minute
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching notifications' });
  }
});

// Create HTTP server
const server = http.createServer(app);
// Initialize WebSocket server
initializeWebSocket(server);
// Schedule tasks
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

// Schedule the task to remove old notifications every day at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    await Notification.deleteMany({ createdAt: { $lt: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) } });
    console.log('Old notifications removed successfully');
  } catch (error) {
    console.error('Error removing old notifications:', error);
  }
});

// Schedule the task to map assets to CVEs every day at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    await mapAssetsToCves();
    console.log('Assets mapped to CVEs successfully');
  } catch (error) {
    console.error('Error mapping assets to CVEs:', error);
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
