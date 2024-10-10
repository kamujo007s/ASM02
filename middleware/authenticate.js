const jwt = require('jsonwebtoken');
require('dotenv').config(); // โหลดค่าจากไฟล์ .env

const jwtSecret = process.env.JWT_SECRET; // ใช้คีย์ลับจากไฟล์ .env

if (!jwtSecret) {
  throw new Error('JWT_SECRET is not defined in the environment variables');
}

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).send('Unauthorized: No token provided');
  }

  const token = authHeader.split(' ')[1]; // แยก Bearer ออกจาก token
  if (!token) {
    return res.status(401).send('Unauthorized: Malformed token');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).send('Unauthorized: Invalid token');
  }
};

module.exports = authenticate;