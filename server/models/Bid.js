const mongoose = require('mongoose');

const BidSchema = new mongoose.Schema({
  auctionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true },
  buyerId: { type: String, required: true },
  buyerName: { type: String, required: true },
  amount: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Bid', BidSchema);
