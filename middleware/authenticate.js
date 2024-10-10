// middleware/authenticate.js
const jwt = require('jsonwebtoken'); // JWT library สำหรับตรวจสอบ token
require('dotenv').config(); // โหลดค่าจากไฟล์ .env

const authenticateMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]; // ตัดคำว่า 'Bearer' ออก
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid token' });
      }
      req.user = user; // เก็บข้อมูลผู้ใช้ไว้ใน req.user
      next();
    });
  } else {
    return res.status(401).json({ message: 'Authorization token required' });
  }
};

module.exports = authenticateMiddleware;