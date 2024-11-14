const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
require('dotenv').config();

let wss;
let clients = new Map();

const initializeWebSocket = (server) => {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    ws.isAlive = true;

    // จัดการ pong จากไคลเอ็นต์
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // ตรวจสอบคุกกี้จากคำขอเชื่อมต่อ WebSocket
    const cookies = req.headers.cookie;
    if (!cookies) {
      ws.send(JSON.stringify({ type: 'error', message: 'No cookies found. Authentication required.' }));
      ws.close();
      return;
    }

    const parsedCookies = cookie.parse(cookies);
    const token = parsedCookies.token;

    if (!token) {
      ws.send(JSON.stringify({ type: 'error', message: 'Authorization token missing.' }));
      ws.close();
      return;
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid or expired token.' }));
        ws.close();
        return;
      }

      ws.user = decoded; // เก็บข้อมูลผู้ใช้ที่ถอดรหัสจาก JWT
      const userId = decoded.userId; // ใช้ 'userId' ตามการตั้งค่าใน auth.js
      clients.set(userId, ws);

      ws.on('close', () => {
        clients.delete(userId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      // จัดการข้อความอื่น ๆ ที่ได้รับหลังจากการยืนยันตัวตน
      ws.on('message', (msg) => {
        // ตัวอย่างการจัดการข้อความ
        console.log(`Received message from user ${userId}: ${msg}`);
        // คุณสามารถเพิ่มการจัดการข้อความเพิ่มเติมได้ที่นี่
      });
    });
  });

  // ตรวจสอบการเชื่อมต่อว่ายังมีชีวิตอยู่หรือไม่
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        console.log('Terminating dead connection');
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  // ฟังก์ชั่นสำหรับส่งข้อความไปยังทุก client
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