// models/cve.js
const mongoose = require('mongoose');

const cveSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  sourceIdentifier: String,
  published: Date,
  lastModified: Date,
  vulnStatus: String,
  descriptions: Array,
  metrics: Object,
  weaknesses: Array,
  configurations: Array,
  references: Array
}, { strict: false });

const Cve = mongoose.model('Cve', cveSchema);

module.exports = Cve;
