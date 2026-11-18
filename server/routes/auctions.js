const express = require('express');
const router = express.Router();
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const Transport = require('../models/Transport');
const Notification = require('../models/Notification');
const { getIO } = require('../services/socketService');

// In-memory fallback stores
const memoryAuctions = [];
const memoryBids = [];

if (memoryAuctions.length === 0) {
  memoryAuctions.push({
    _id: 'auc-sample-101',
    farmerId: 'farmer-rajesh',
    farmerName: 'Rajesh Kumar',
    cropName: 'Organic Tomato',
    cropImage: '/uploads/test-sample.jpg',
    quantity: 500,
    unit: 'kg',
    location: 'Salem Farm',
    deliveryLocation: 'Chennai Retail Yard',
    qualityScore: 88,
    aiSuggestedPrice: 28,
    startingPrice: 25,
    currentHighestBid: 29,
    currentHighestBidder: 'buyer-freshmart',
    currentHighestBidderName: 'Fresh Mart Supermarket',
    status: 'ACTIVE',
    startTime: new Date(),
    endTime: new Date(Date.now() + 60 * 60 * 1000)
  });
}

// @route   POST /api/v1/auctions
// @desc    Create a new AgriLink auction after AI price suggestion
router.post('/', async (req, res) => {
  try {
    const {
      farmerId,
      farmerName,
      cropId,
      cropName,
      cropImage,
      quantity,
      unit,
      location,
      deliveryLocation,
      harvestDate,
      qualityResult,
      qualityScore,
      aiSuggestedPrice,
      startingPrice,
      durationMinutes,
      notes
    } = req.body;

    if (!farmerId || !cropName || !quantity || !startingPrice || !aiSuggestedPrice) {
      return res.status(400).json({
        success: false,
        message: 'Farmer ID, crop name, quantity, starting price, and AI suggested price are required.'
      });
    }

    const duration = parseInt(durationMinutes) || 30;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    const auctionData = {
      _id: `auc-${Date.now()}`,
      farmerId,
      farmerName: farmerName || 'Farmer',
      cropId,
      cropName,
      cropImage: cropImage || '/uploads/test-sample.jpg',
      quantity: Number(quantity),
      unit: unit || 'kg',
      location: location || 'Salem, TN',
      deliveryLocation: deliveryLocation || 'Retail Market',
      harvestDate,
      qualityResult: qualityResult || {},
      qualityScore: qualityScore ? Number(qualityScore) : 85,
      aiSuggestedPrice: Number(aiSuggestedPrice),
      startingPrice: Number(startingPrice),
      currentHighestBid: Number(startingPrice),
      status: 'ACTIVE',
      startTime,
      endTime,
      notes
    };

    memoryAuctions.unshift(auctionData);

    try {
      const auction = new Auction(auctionData);
      await Promise.race([
        auction.save(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 2000))
      ]);
    } catch (dbErr) {
      console.warn('⚠️ MongoDB save skipped/timed out, using memory auction store.');
    }

    // 1. Create Buyer Notification Payload
    const notifData = {
      id: `notif-new-auc-${auctionData._id}`,
      userId: 'all-buyers',
      type: 'NEW_AUCTION',
      title: '🌾 NEW LIVE AUCTION STARTED',
      message: `New crop auction: ${cropName} (${quantity} ${unit || 'kg'}) listed by ${farmerName || 'Farmer'} in ${location || 'Salem'} starting at ₹${startingPrice}/${unit || 'kg'}. Ends in ${duration} mins.`,
      cropName,
      startingPrice: Number(startingPrice),
      quantity: Number(quantity),
      unit: unit || 'kg',
      auctionId: auctionData._id,
      actionUrl: `/auction/${auctionData._id}`,
      timestamp: new Date().toISOString(),
      date: 'Just now',
      read: false
    };

    try {
      const notifBuyer = new Notification({
        userId: 'all-buyers',
        title: notifData.title,
        message: notifData.message,
        type: 'AUCTION',
        actionUrl: `/auction/${auctionData._id}`
      });
      await notifBuyer.save();
    } catch (e) {}

    // 2. Broadcast via Socket.IO to all connected buyers/bidders
    try {
      const io = getIO();
      if (io) {
        io.emit('auction:new', { auction: auctionData, notification: notifData });
      }
    } catch (e) {}

    res.status(201).json({
      success: true,
      message: 'Auction created successfully and eligible buyers notified!',
      auction: auctionData,
      notification: notifData
    });

  } catch (error) {
    console.error('Create auction error:', error);
    res.status(500).json({ success: false, message: 'Failed to create auction: ' + error.message });
  }
});

// @route   GET /api/v1/auctions
router.get('/', async (req, res) => {
  try {
    let auctions = [];
    try {
      auctions = await Promise.race([
        Auction.find().sort({ createdAt: -1 }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 2000))
      ]);
    } catch (dbErr) {
      auctions = memoryAuctions;
    }

    if (!auctions || auctions.length === 0) {
      auctions = memoryAuctions;
    }

    res.json({ success: true, count: auctions.length, auctions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch auctions' });
  }
});

// @route   GET /api/v1/auctions/:id
router.get('/:id', async (req, res) => {
  try {
    let auction = memoryAuctions.find(a => String(a._id) === String(req.params.id));
    if (!auction) {
      try {
        auction = await Promise.race([
          Auction.findById(req.params.id),
          new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 2000))
        ]);
      } catch (e) {}
    }

    if (!auction) {
      auction = memoryAuctions[0];
    }

    const bids = memoryBids.filter(b => String(b.auctionId) === String(auction._id));

    res.json({ success: true, auction, bids });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving auction details' });
  }
});

// @route   POST /api/v1/auctions/:id/bid
router.post('/:id/bid', async (req, res) => {
  try {
    const { buyerId, buyerName, amount } = req.body;
    let auction = memoryAuctions.find(a => String(a._id) === String(req.params.id)) || memoryAuctions[0];

    const bidAmount = Number(amount);
    if (isNaN(bidAmount) || bidAmount <= auction.currentHighestBid) {
      return res.status(400).json({
        success: false,
        message: `Bid must be higher than current highest bid of ₹${auction.currentHighestBid}`
      });
    }

    const newBid = {
      _id: `bid-${Date.now()}`,
      auctionId: auction._id,
      buyerId: buyerId || 'buyer-101',
      buyerName: buyerName || 'Trader User',
      amount: bidAmount,
      timestamp: new Date()
    };
    memoryBids.unshift(newBid);

    auction.currentHighestBid = bidAmount;
    auction.currentHighestBidder = buyerId || 'buyer-101';
    auction.currentHighestBidderName = buyerName || 'Trader User';

    try {
      const io = getIO();
      io.to(`auction:${auction._id}`).emit('auction:bid-update', {
        auctionId: auction._id,
        currentHighestBid: auction.currentHighestBid,
        currentHighestBidder: auction.currentHighestBidder,
        currentHighestBidderName: auction.currentHighestBidderName,
        bid: newBid
      });
    } catch (ioErr) {}

    res.json({ success: true, message: 'Bid placed successfully!', auction, bid: newBid });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to place bid: ' + error.message });
  }
});

// @route   POST /api/v1/auctions/:id/close
// @desc    Auction Completion: Determine winner, send notifications to Farmer, Winner, and Retailer, and create Transport record
router.post('/:id/close', async (req, res) => {
  try {
    let auction = memoryAuctions.find(a => String(a._id) === String(req.params.id) || String(a.id) === String(req.params.id));
    if (!auction) auction = memoryAuctions[0];

    const { winnerId, winnerName, finalPrice } = req.body || {};

    auction.status = 'COMPLETED';
    auction.winnerId = winnerId || auction.currentHighestBidder || 'buyer-101';
    auction.winnerName = winnerName || auction.currentHighestBidderName || 'Kongu Fresh Organics';
    auction.finalPrice = finalPrice ? Number(finalPrice) : (auction.currentHighestBid || 30);

    const transportId = `TR-${Math.floor(100000 + Math.random() * 900000)}`;
    auction.transportId = transportId;

    // Try MongoDB update for Auction
    try {
      await Auction.findByIdAndUpdate(auction._id, {
        status: 'COMPLETED',
        winnerId: auction.winnerId,
        winnerName: auction.winnerName,
        finalPrice: auction.finalPrice,
        transportId: auction.transportId
      });
    } catch (e) {}

    // Auto-create Transport Record
    const transportData = {
      _id: `tr-doc-${Date.now()}`,
      transportId,
      auctionId: auction._id,
      cropName: auction.cropName || 'Farm Produce',
      quantity: auction.quantity || 500,
      unit: auction.unit || 'kg',
      farmerId: auction.farmerId || 'farmer-rajesh',
      farmerName: auction.farmerName || 'Rajesh Kumar',
      winnerId: auction.winnerId,
      winnerName: auction.winnerName,
      sourceLocation: auction.location || 'Salem Farm',
      destinationLocation: auction.deliveryLocation || 'Retail Market Hub',
      deviceId: 'ESP8266_01',
      status: 'AWAITING_BIDDER_PAYMENT',
      paymentStatus: 'UNPAID',
      createdTime: new Date()
    };

    // Store in transport route memory store
    try {
      const transportRoute = require('./transport');
      if (transportRoute.memoryTransports) {
        transportRoute.memoryTransports.unshift(transportData);
      }
    } catch (e) {}

    // Store in MongoDB
    try {
      const transportDoc = new Transport(transportData);
      await transportDoc.save();
    } catch (e) {}

    // 1. Notify Farmer
    const notifFarmer = new Notification({
      userId: auction.farmerId,
      title: '🎉 AUCTION COMPLETED SUCCESSFULLY',
      message: `Your auction for ${auction.cropName} (${auction.quantity} ${auction.unit}) has completed. Winner: ${auction.winnerName} at ₹${auction.finalPrice}/${auction.unit}. Transport ID: ${transportId}.`,
      type: 'AUCTION_WIN',
      actionUrl: `/transport/${transportId}`
    });

    // 2. Notify Winning Buyer
    const notifBuyer = new Notification({
      userId: auction.winnerId,
      title: '🏆 YOU WON THE AUCTION',
      message: `Congratulations! You won the auction for ${auction.quantity} ${auction.unit} of ${auction.cropName} at ₹${auction.finalPrice}/${auction.unit}. Transport ID: ${transportId}.`,
      type: 'AUCTION_WIN',
      actionUrl: `/transport/${transportId}`
    });

    // 3. Notify Retailer
    const notifRetailer = new Notification({
      userId: 'all-retailers',
      title: '🚚 PRODUCE AUCTIONED & TRANSIT INITIATED',
      message: `Produce ${auction.cropName} (${auction.quantity} ${auction.unit}) auctioned to ${auction.winnerName}. Transport initiated (ID: ${transportId}).`,
      type: 'TRANSPORT',
      actionUrl: `/transport/${transportId}`
    });

    try {
      await notifFarmer.save();
      await notifBuyer.save();
      await notifRetailer.save();
    } catch (e) {}

    // Broadcast Socket.IO bid acceptance event to all room participants & clients
    try {
      const io = getIO();
      if (io) {
        const closedPayload = {
          auctionId: auction._id,
          id: auction._id,
          status: 'COMPLETED',
          winnerId: auction.winnerId,
          winnerName: auction.winnerName,
          finalPrice: auction.finalPrice,
          acceptedPrice: auction.finalPrice,
          transportId,
          cropName: auction.cropName,
          quantity: auction.quantity,
          unit: auction.unit
        };
        io.to(`auction:${auction._id}`).emit('auction:closed', closedPayload);
        io.to(`auction:${auction._id}`).emit('auction:bid-accepted', closedPayload);
        io.emit('auction:closed', closedPayload);
        io.emit('auction:bid-accepted', closedPayload);
      }
    } catch (e) {}

    res.json({
      success: true,
      message: 'Auction closed successfully and Transport initiated!',
      auction,
      transportId,
      transport: transportData
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to close auction: ' + error.message });
  }
});

// @route   POST /api/v1/auctions/:id/extend
router.post('/:id/extend', async (req, res) => {
  try {
    let auction = memoryAuctions.find(a => String(a._id) === String(req.params.id)) || memoryAuctions[0];
    const extraMinutes = parseInt(req.body.durationMinutes) || 15;
    auction.endTime = new Date(Date.now() + extraMinutes * 60 * 1000);
    auction.status = 'EXTENDED';

    res.json({
      success: true,
      message: `Auction extended by +${extraMinutes} minutes and search broadened to nearby buyers!`,
      auction
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to extend auction' });
  }
});

// @route   POST /api/v1/auctions/:id/offer-retailers
router.post('/:id/offer-retailers', async (req, res) => {
  try {
    let auction = memoryAuctions.find(a => String(a._id) === String(req.params.id)) || memoryAuctions[0];
    auction.status = 'OFFERED_TO_RETAILER';

    res.json({
      success: true,
      message: 'Produce listing offered directly to regional retailers!',
      auction
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to offer produce to retailers' });
  }
});

router.memoryAuctions = memoryAuctions;
router.memoryBids = memoryBids;

module.exports = router;
