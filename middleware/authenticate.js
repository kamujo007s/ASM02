// middleware/authenticate.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.error('Invalid token:', err);
        return res.status(403).json({ message: 'Invalid token' });
      }
      req.user = user;
      next();
    });
  } else {
    console.error('Authorization token required');
    return res.status(401).json({ message: 'Authorization token required' });
  }
};

module.exports = authenticateMiddleware;
