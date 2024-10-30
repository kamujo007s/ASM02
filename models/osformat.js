// models/osformats.js
const mongoose = require('mongoose');

const osFormatSchema = new mongoose.Schema({
  original: { type: String, required: true },
  standard: { type: String, required: true },
  // เพิ่มฟิลด์อื่นๆ ตามต้องการ
}, { timestamps: true });

const OsFormat = mongoose.model('OsFormat', osFormatSchema);
module.exports = OsFormat;