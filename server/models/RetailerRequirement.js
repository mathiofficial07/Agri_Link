const mongoose = require('mongoose');

const RetailerRequirementSchema = new mongoose.Schema({
  requirementId: { type: String, required: true, unique: true },
  retailerId: { type: String, required: true },
  retailerName: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  cropName: { type: String, required: true },
  minQuantity: { type: Number, default: 50 },
  maxQuantity: { type: Number, default: 5000 },
  unit: { type: String, default: 'kg' },
  minQualityGrade: { type: String, default: 'B' },
  deliveryAddress: { type: String, required: true },
  location: { type: String, required: true },
  status: {
    type: String,
    enum: ['ACTIVE', 'FULFILLED', 'PAUSED'],
    default: 'ACTIVE'
  }
}, { timestamps: true });

module.exports = mongoose.model('RetailerRequirement', RetailerRequirementSchema);
