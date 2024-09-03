// models/asset.js
const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  device_name: { type: String, required: true },
 application_name: { type: String, required: true },
 operating_system: { type: String, required: true },
  os_version: { type: String, required: true }
}, { strict: false });

const Asset = mongoose.model('Asset', assetSchema);

module.exports = Asset;
