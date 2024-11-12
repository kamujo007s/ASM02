// middleware/authenticate.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateMiddleware = (req, res, next) => {
  const token = req.cookies.token; // อ่าน JWT จากคุกกี้

  if (!token) {
    return res.status(401).json({ message: 'Authorization token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      return res.status(403).json({ message: 'Invalid token' });
    }

    req.user = decoded; // แนบข้อมูลผู้ใช้ที่ถอดรหัสจาก JWT
    next();
  });
};

module.exports = authenticateMiddleware;