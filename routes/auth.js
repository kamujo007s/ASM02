// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { body, validationResult } = require('express-validator');
const authenticateMiddleware = require('../middleware/authenticate');
require('dotenv').config();

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET;

// Register route
router.post(
  '/register',
  [
    body('username').isString().trim().escape().notEmpty().withMessage('Username is required'),
    body('password').isString().trim().escape().isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      const user = new User({ username, password });
      await user.save();
      res.status(201).send('User registered successfully');
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).send('Server error during registration');
    }
  }
);

// Login route
router.post(
  '/login',
  [
    body('username').isString().trim().escape().notEmpty().withMessage('Username is required'),
    body('password').isString().trim().escape().notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      const user = await User.findOne({ username });
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).send('Invalid credentials');
      }

      const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '1d' });

      // เก็บ JWT ใน HttpOnly Cookie แทนการใช้ LocalStorage
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // ตั้งเป็น true ถ้าใช้ HTTPS
        sameSite: 'Lax', // หรือ 'Strict' สำหรับการรักษาความปลอดภัยที่สูงขึ้น
        path: '/',
        maxAge: 24 * 60 * 60 * 1000, // อายุของคุกกี้ (1 วัน)
        // ไม่ระบุ domain
      });
      res.json({ message: 'Login successful' });
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).send('Server error during login');
    }
  }
);

// Get current user
router.get('/me', authenticateMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout route (optional)
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
  });
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;