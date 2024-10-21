const mongoose = require('mongoose');

// สร้าง schema สำหรับ Criteria
const criteriaSchema = new mongoose.Schema({
  criteria: {
    type: String,
    required: true,
  },
  assetName: {
    type: String,
    required: true,
  },
});

// สร้างโมเดลสำหรับ Criteria
const Criteria = mongoose.model('Criteria', criteriaSchema);

module.exports = Criteria;
