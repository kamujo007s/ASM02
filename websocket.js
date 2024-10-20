// websocket.js
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

let wss;
let clients = new Map(); // Map เพื่อเก็บ clients และข้อมูลผู้ใช้

const initializeWebSocket = (server) => {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    const token = req.url.split('token=')[1]; // ดึง token จาก query param
    if (token) {
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          ws.close();
          return;
        }

        ws.user = decoded;
        const userId = decoded.id; // สมมติว่า token มีข้อมูล id ของผู้ใช้
        clients.set(userId, ws); // เก็บ ws ไว้ใน Map โดยใช้ userId เป็น key

        ws.on('close', () => {
          clients.delete(userId);
        });

        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
        });

        // หากคุณต้องการจัดการข้อความที่ส่งมาจากลูกค้า สามารถใช้ ws.on('message', ...) ได้ที่นี่
        // ws.on('message', (message) => {
        //   // จัดการกับข้อความที่ได้รับจากลูกค้า
        // });
      });
    } else {
      ws.close();
    }
  });

  // แนบฟังก์ชัน sendToUser และ broadcast เข้ากับ wss
  wss.sendToUser = (userId, data) => {
    const client = clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      client.send(message);
    }
  };

  wss.broadcast = (data) => {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };
};

const getWss = () => wss;

module.exports = { initializeWebSocket, getWss };
