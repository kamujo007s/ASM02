//notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: '90d' } // ลบอัตโนมัติหลังจาก 90 วัน
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;