const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'INFO' }, // INFO, AUCTION, BID, TRANSPORT, ALERT
  readStatus: { type: Boolean, default: false },
  actionUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
