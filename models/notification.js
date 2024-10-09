const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: '6m' } // ลบอัตโนมัติหลังจาก 6 เดือน
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;