const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { body, validationResult } = require('express-validator');
require('dotenv').config(); // โหลดค่าจากไฟล์ .env

const router = express.Router();

const jwtSecret = process.env.JWT_SECRET; // ใช้คีย์ลับจากไฟล์ .env

// Register route
router.post(
  '/register',
  [
    body('username').isString().trim().escape(),
    body('password').isString().trim().escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
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
    body('username').isString().trim().escape(),
    body('password').isString().trim().escape(),
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

      const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '1h' });
      res.json({ token });
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).send('Server error during login');
    }
  }
);

module.exports = router;