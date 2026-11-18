const mongoose = require('mongoose');

const SensorDataSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  transportId: { type: String, required: true },
  temperature: { type: Number, required: true },
  humidity: { type: Number, required: true },
  recordedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('SensorData', SensorDataSchema);
