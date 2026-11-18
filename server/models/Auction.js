const mongoose = require('mongoose');

const AuctionSchema = new mongoose.Schema({
  farmerId: { type: String, required: true },
  farmerName: { type: String, default: 'Farmer' },
  cropId: { type: String },
  cropName: { type: String, required: true },
  cropImage: { type: String },
  quantity: { type: Number, required: true },
  unit: { type: String, default: 'kg' },
  location: { type: String, default: 'Local Market' },
  deliveryLocation: { type: String, default: 'Retail Market' },
  harvestDate: { type: String },
  qualityResult: { type: Object },
  qualityScore: { type: Number, default: 85 },
  aiSuggestedPrice: { type: Number, required: true },
  startingPrice: { type: Number, required: true },
  currentHighestBid: { type: Number, required: true },
  currentHighestBidder: { type: String, default: null },
  currentHighestBidderName: { type: String, default: null },
  eligibleBuyers: [{ type: String }],
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'NO_BID', 'EXTENDED', 'OFFERED_TO_RETAILER'],
    default: 'ACTIVE'
  },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date, required: true },
  winnerId: { type: String, default: null },
  winnerName: { type: String, default: null },
  finalPrice: { type: Number, default: null },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Auction', AuctionSchema);
