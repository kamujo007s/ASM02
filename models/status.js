// models/status.js
const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const Status = mongoose.model('Status', statusSchema);

module.exports = Status;