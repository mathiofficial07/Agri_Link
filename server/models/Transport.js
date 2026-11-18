const mongoose = require('mongoose');

const TransportSchema = new mongoose.Schema({
  transportId: { type: String, required: true, unique: true },
  auctionId: { type: String },
  cropName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, default: 'kg' },
  farmerId: { type: String, required: true },
  farmerName: { type: String },
  winnerId: { type: String, required: true },
  winnerName: { type: String },
  retailerId: { type: String },
  sourceLocation: { type: String, required: true },
  destinationLocation: { type: String, required: true },
  deviceId: { type: String, default: 'ESP8266_01' },
  status: {
    type: String,
    enum: ['CREATED', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED'],
    default: 'CREATED'
  },
  tempThresholdMax: { type: Number, default: 30.0 },
  humidityThresholdMax: { type: Number, default: 80.0 },
  createdTime: { type: Date, default: Date.now },
  deliveryTime: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Transport', TransportSchema);
