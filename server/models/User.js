const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  role: {
    type: String,
    enum: ['farmer', 'buyer', 'retailer', 'aggregator', 'admin'],
    required: true
  },
  address: { type: String },
  location: { type: String },
  isVerified: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
