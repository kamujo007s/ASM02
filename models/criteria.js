// models/criteria.js
const mongoose = require('mongoose');

// สร้าง schema สำหรับ Criteria
const criteriaSchema = new mongoose.Schema({
  criteria: {
    type: String,
    required: true,
    unique: true, // กำหนดให้ criteria ต้องไม่ซ้ำกัน
  },
  assetName: {
    type: String,
    required: true,
  },
});

// สร้าง unique composite index ถ้าจำเป็น (ตัวอย่าง)
criteriaSchema.index({ criteria: 1, assetName: 1 }, { unique: true });

const Criteria = mongoose.model('Criteria', criteriaSchema);

module.exports = Criteria;
