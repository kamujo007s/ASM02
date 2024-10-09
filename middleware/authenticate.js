const jwt = require('jsonwebtoken');
require('dotenv').config(); // โหลดค่าจากไฟล์ .env

const jwtSecret = process.env.JWT_SECRET; // ใช้คีย์ลับจากไฟล์ .env

const authenticate = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).send('Unauthorized');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).send('Invalid token');
  }
};

module.exports = authenticate;