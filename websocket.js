//websocket.js
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

let wss;

/**
 * Initialize WebSocket Server
 * @param {http.Server} server - The HTTP server to attach WebSocket to
 */
const initializeWebSocket = (server) => {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    const token = req.url.split('token=')[1]; // Get token from the query param
    if (token) {
      // Verify token using JWT or your session mechanism
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          console.log('Invalid token');
          ws.close();
          return;
        }

        // console.log('New client connected with token:', decoded);
        ws.user = decoded;

        ws.on('close', () => {
          // console.log('Client disconnected');
        });

        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
        });
      });
    } else {
      console.log('No token provided');
      ws.close();
    }
  });

  wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
        console.log('Notification sent:', data);
      }
    });
  };
};

/**
 * Get the WebSocket Server instance
 * @returns {WebSocket.Server} The WebSocket Server instance
 */
const getWss = () => wss;

module.exports = { initializeWebSocket, getWss };
