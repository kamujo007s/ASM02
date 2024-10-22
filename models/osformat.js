// models/osformat.js
const mongoose = require("mongoose");

const OSFormatSchema = new mongoose.Schema({
  name: { type: String, required: true },
});

module.exports = mongoose.model("OSFormat", OSFormatSchema);
