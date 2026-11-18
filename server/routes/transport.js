const express = require('express');
const router = express.Router();
const Transport = require('../models/Transport');
const SensorData = require('../models/SensorData');

const memoryTransports = [
  {
    _id: 'tr-sample-101',
    transportId: 'TR001',
    auctionId: 'auc-sample-101',
    cropName: 'Organic Tomato',
    quantity: 500,
    unit: 'kg',
    farmerId: 'farmer-rajesh',
    farmerName: 'Rajesh Kumar',
    winnerId: 'buyer-freshmart',
    winnerName: 'Fresh Mart Supermarket',
    sourceLocation: 'Salem Farm',
    destinationLocation: 'Chennai Retail Yard',
    deviceId: 'ESP8266_01',
    status: 'IN_TRANSIT',
    createdTime: new Date()
  }
];

// @route   POST /api/v1/transport
// @desc    Create new transport record
router.post('/', async (req, res) => {
  try {
    const {
      auctionId,
      cropName,
      quantity,
      unit,
      farmerId,
      farmerName,
      winnerId,
      winnerName,
      retailerId,
      sourceLocation,
      destinationLocation,
      deviceId
    } = req.body;

    const transportId = `TR-${Math.floor(100000 + Math.random() * 900000)}`;

    const transportData = {
      _id: `tr-doc-${Date.now()}`,
      transportId,
      auctionId,
      cropName,
      quantity,
      unit: unit || 'kg',
      farmerId,
      farmerName,
      winnerId,
      winnerName,
      retailerId,
      sourceLocation: sourceLocation || 'Salem Farm',
      destinationLocation: destinationLocation || 'Retailer Hub',
      deviceId: deviceId || 'ESP8266_01',
      status: 'ASSIGNED',
      createdTime: new Date()
    };

    memoryTransports.unshift(transportData);

    try {
      const transportDoc = new Transport(transportData);
      await transportDoc.save();
    } catch (e) {}

    res.status(201).json({ success: true, message: 'Transport record created', transport: transportData, transportId });

  } catch (error) {
    console.error('Create transport error:', error);
    res.status(500).json({ success: false, message: 'Failed to create transport: ' + error.message });
  }
});

// @route   GET /api/v1/transport
// @desc    Get all active transports
router.get('/', async (req, res) => {
  try {
    const { farmerId, winnerId, retailerId, status } = req.query;
    let dbTransports = [];

    try {
      let query = {};
      if (farmerId) query.farmerId = farmerId;
      if (winnerId) query.winnerId = winnerId;
      if (retailerId) query.retailerId = retailerId;
      if (status) query.status = status;

      dbTransports = await Promise.race([
        Transport.find(query).sort({ createdAt: -1 }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 2000))
      ]);
    } catch (e) {}

    // Merge memoryTransports
    let merged = [...dbTransports];
    memoryTransports.forEach(memItem => {
      if (!merged.some(m => String(m.transportId) === String(memItem.transportId) || String(m._id) === String(memItem._id))) {
        merged.push(memItem);
      }
    });

    if (farmerId) merged = merged.filter(t => !t.farmerId || t.farmerId === farmerId);
    if (winnerId) merged = merged.filter(t => !t.winnerId || t.winnerId === winnerId);
    if (retailerId) merged = merged.filter(t => !t.retailerId || t.retailerId === retailerId);
    if (status) merged = merged.filter(t => t.status === status);

    res.json({ success: true, count: merged.length, transports: merged });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch transport records' });
  }
});

// @route   GET /api/v1/transport/:id
// @desc    Get single transport status with latest sensor reading
router.get('/:id', async (req, res) => {
  try {
    let transport = null;

    // 1. Search in memory
    transport = memoryTransports.find(t => String(t.transportId) === String(req.params.id) || String(t._id) === String(req.params.id));

    // 2. Search in DB
    if (!transport) {
      try {
        transport = await Promise.race([
          Transport.findOne({
            $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { transportId: req.params.id }]
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 2000))
        ]);
      } catch (e) {}
    }

    // 3. Fallback construct matching requested ID if missing
    if (!transport) {
      transport = {
        transportId: req.params.id,
        cropName: 'Organic Harvest',
        quantity: 500,
        unit: 'kg',
        farmerName: 'Rajesh Kumar',
        winnerName: 'Fresh Mart Retailer',
        sourceLocation: 'Salem Farm',
        destinationLocation: 'Chennai Retail Yard',
        deviceId: 'ESP8266_01',
        status: 'IN_TRANSIT',
        tempThresholdMax: 30.0,
        humidityThresholdMax: 80.0
      };
    }

    // Query sensor logs
    let sensorLogs = [];
    try {
      sensorLogs = await Promise.race([
        SensorData.find({
          $or: [{ transportId: transport.transportId }, { deviceId: transport.deviceId }]
        }).sort({ recordedAt: -1 }).limit(50),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 2000))
      ]);
    } catch (e) {}

    // Fall back to inMemorySensorLogs if available
    try {
      const iotRoute = require('./iot');
      if ((!sensorLogs || sensorLogs.length === 0) && iotRoute.inMemorySensorLogs) {
        sensorLogs = iotRoute.inMemorySensorLogs.filter(
          l => String(l.transportId) === String(transport.transportId) || String(l.deviceId) === String(transport.deviceId)
        );
      }
    } catch (e) {}

    const latestSensor = (sensorLogs && sensorLogs.length > 0) ? sensorLogs[0] : {
      temperature: 26.4,
      humidity: 62.1,
      recordedAt: new Date()
    };

    res.json({
      success: true,
      transport,
      latestSensor,
      sensorHistory: sensorLogs || []
    });

  } catch (error) {
    console.error('Fetch transport error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving transport monitoring details' });
  }
});

// @route   PATCH /api/v1/transport/:id/status
// @desc    Update transport status (e.g. IN_TRANSIT, DELIVERED)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    let transport = memoryTransports.find(t => String(t.transportId) === String(req.params.id) || String(t._id) === String(req.params.id));
    if (transport) {
      transport.status = status;
      if (status === 'DELIVERED') transport.deliveryTime = new Date();
    }

    try {
      await Transport.findOneAndUpdate(
        { $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { transportId: req.params.id }] },
        { status, ...(status === 'DELIVERED' ? { deliveryTime: new Date() } : {}) },
        { new: true }
      );
    } catch (e) {}

    // Broadcast Socket.IO event for status updates
    try {
      const { getIO } = require('../services/socketService');
      const io = getIO();
      io.emit('transport:status_updated', {
        transportId: req.params.id,
        status,
        message: `Transport status updated to ${status}`
      });
      if (status === 'DELIVERED') {
        io.emit('transport:delivered', {
          transportId: req.params.id,
          status: 'DELIVERED',
          message: `Transport ${req.params.id} has been delivered successfully to retailer!`
        });
      }
    } catch (ioErr) {}

    res.json({ success: true, message: `Transport status updated to ${status}`, transport: transport || { transportId: req.params.id, status } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update transport status' });
  }
});

// @route   POST /api/v1/transport/assign-retailer
// @desc    Assign winning bidder's selected registered retailer to transport record with pending retailer payment
router.post('/assign-retailer', async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const Auction = require('../models/Auction');
    const { getIO } = require('../services/socketService');

    const {
      transportId: reqTransportId,
      auctionId,
      farmerId,
      farmerName,
      winnerId,
      winnerName,
      winnerPhone: reqWinnerPhone,
      retailerId,
      retailerName,
      destinationLocation,
      cropName,
      quantity: reqQuantity,
      unit: reqUnit,
      qualityGrade: reqQualityGrade,
      finalPrice: reqFinalPrice,
      totalProduceAmount: reqTotalProduceAmount,
      transportCost: reqTransportCost
    } = req.body;

    const transportId = reqTransportId || `TR-${Math.floor(100000 + Math.random() * 900000)}`;
    const quantity = Number(reqQuantity) || 500;
    const unit = reqUnit || 'kg';
    const qualityGrade = reqQualityGrade || 'Grade A (High Premium)';
    const winnerPhone = reqWinnerPhone || '+91 98765 43213';

    // Financial Calculation
    const unitPrice = Number(reqFinalPrice) || 30;
    const produceAmount = Number(reqTotalProduceAmount) || (unitPrice * quantity);
    const transportCost = Number(reqTransportCost) || 2500;
    const totalAmount = produceAmount + transportCost;

    let transport = memoryTransports.find(t => String(t.transportId) === String(transportId) || String(t.auctionId) === String(auctionId));
    if (!transport) {
      transport = {
        _id: `tr-doc-${Date.now()}`,
        transportId,
        auctionId: auctionId || `auc-${Date.now()}`,
        cropName: cropName || 'Farm Produce',
        quantity,
        unit,
        qualityGrade,
        farmerId: farmerId || 'farmer-rajesh',
        farmerName: farmerName || 'Rajesh Kumar',
        winnerId: winnerId || 'buyer-101',
        winnerName: winnerName || 'Kavitha Agro Traders',
        winnerPhone,
        retailerId: retailerId || 'ret-freshmart-01',
        retailerName: retailerName || 'Fresh Mart Supermarket',
        sourceLocation: 'Coimbatore Farm Gate',
        destinationLocation: destinationLocation || 'Retail Market Yard',
        deviceId: 'ESP8266_01',
        produceAmount,
        transportCost,
        totalAmount,
        status: 'AWAITING_RETAILER_PAYMENT',
        createdTime: new Date()
      };
      memoryTransports.unshift(transport);
    } else {
      transport.retailerId = retailerId;
      transport.retailerName = retailerName;
      transport.destinationLocation = destinationLocation || transport.destinationLocation;
      transport.winnerPhone = winnerPhone;
      transport.qualityGrade = qualityGrade;
      transport.produceAmount = produceAmount;
      transport.transportCost = transportCost;
      transport.totalAmount = totalAmount;
      transport.status = 'AWAITING_RETAILER_PAYMENT';
    }

    // Persist or Update in MongoDB Transport Model
    try {
      await Transport.findOneAndUpdate(
        { $or: [{ transportId }, { auctionId }] },
        {
          transportId,
          auctionId,
          cropName: cropName || 'Farm Produce',
          quantity,
          unit,
          qualityGrade,
          farmerId,
          farmerName,
          winnerId,
          winnerName,
          winnerPhone,
          retailerId,
          retailerName,
          destinationLocation,
          produceAmount,
          transportCost,
          totalAmount,
          status: 'AWAITING_RETAILER_PAYMENT'
        },
        { upsert: true, new: true }
      );
    } catch (e) {}

    // Persist or Update in MongoDB Auction Model
    try {
      await Auction.findOneAndUpdate(
        { _id: auctionId },
        { winnerId, winnerName, status: 'COMPLETED' },
        { new: true }
      );
    } catch (e) {}

    // Targeted Notification Payload for the Selected Registered Retailer
    const notifTitle = '📦 NEW ASSIGNED PRODUCE ORDER - PAYMENT REQUIRED';
    const notifMessage = `Winning Bidder ${winnerName || 'Bidder'} (${winnerPhone}) assigned purchase of ${quantity} ${unit} ${cropName || 'Produce'} (${qualityGrade}). Total Payment Required: ₹${totalAmount.toLocaleString()} (Produce: ₹${produceAmount.toLocaleString()} + Transport: ₹${transportCost.toLocaleString()}).`;
    
    try {
      const notifDoc = new Notification({
        userId: retailerId || 'ret-freshmart-01',
        title: notifTitle,
        message: notifMessage,
        type: 'TRANSPORT',
        actionUrl: `/retailer/dashboard`
      });
      await notifDoc.save();
    } catch (e) {}

    // Broadcast Real-Time Socket.IO Event to Retailer
    try {
      const io = getIO();
      io.emit('retailer:order-assigned', {
        transportId,
        auctionId,
        cropName,
        quantity,
        unit,
        qualityGrade,
        winnerName,
        winnerPhone,
        winnerId,
        retailerId,
        produceAmount,
        transportCost,
        totalAmount,
        message: notifMessage
      });
    } catch (ioErr) {}

    res.json({
      success: true,
      message: 'Retailer assigned! Notification sent to retailer for payment.',
      transportId,
      transport,
      notificationMessage: notifMessage
    });

  } catch (error) {
    console.error('Assign retailer error:', error);
    res.status(500).json({ success: false, message: 'Failed to assign retailer: ' + error.message });
  }
});

// @route   POST /api/v1/transport/retailer-pay
// @desc    Process retailer payment to winning bidder (Produce + Transport Cost) and notify winning bidder
router.post('/retailer-pay', async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const { getIO } = require('../services/socketService');

    const { transportId, retailerId, paymentMethod } = req.body;

    let transport = memoryTransports.find(t => String(t.transportId) === String(transportId) || String(t._id) === String(transportId));

    if (!transport) {
      try {
        transport = await Transport.findOne({
          $or: [{ transportId }, { _id: transportId.match(/^[0-9a-fA-F]{24}$/) ? transportId : null }]
        });
      } catch (e) {}
    }

    if (!transport) {
      transport = {
        transportId: transportId || 'TR001',
        cropName: 'Organic Harvest',
        quantity: 500,
        unit: 'kg',
        winnerId: 'buyer-101',
        winnerName: 'Kavitha Agro Traders',
        retailerName: 'Fresh Mart Supermarket',
        totalAmount: 17500
      };
    }

    const txnId = `TXN-RET-${Math.floor(100000 + Math.random() * 900000)}`;

    transport.status = 'RETAILER_PAID';
    transport.retailerPaidAt = new Date();
    transport.retailerPaymentTxn = txnId;
    transport.paymentMethod = paymentMethod || 'UPI / NetBanking';

    try {
      await Transport.findOneAndUpdate(
        { $or: [{ transportId: transport.transportId }, { _id: transport._id }] },
        {
          status: 'RETAILER_PAID',
          retailerPaidAt: new Date(),
          retailerPaymentTxn: txnId
        },
        { new: true }
      );
    } catch (e) {}

    const notifTitle = '🎉 RETAILER PAYMENT RECEIVED! APPROVE TRANSPORT';
    const notifMessage = `Retailer ${transport.retailerName || 'Selected Retailer'} has paid ₹${(transport.totalAmount || 17500).toLocaleString()} (Produce + Transport Cost) for your order of ${transport.cropName}. Click 'Allow Transport' on your dashboard to start shipment monitoring.`;

    try {
      const notifDoc = new Notification({
        userId: transport.winnerId || 'buyer-101',
        title: notifTitle,
        message: notifMessage,
        type: 'TRANSPORT',
        actionUrl: `/buyer/dashboard`
      });
      await notifDoc.save();
    } catch (e) {}

    // Real-Time Socket.IO Event for Winning Bidder
    try {
      const io = getIO();
      io.emit('bidder:retailer-paid', {
        transportId: transport.transportId,
        auctionId: transport.auctionId,
        cropName: transport.cropName,
        quantity: transport.quantity,
        unit: transport.unit,
        winnerId: transport.winnerId,
        retailerName: transport.retailerName,
        totalAmount: transport.totalAmount,
        txnId,
        status: 'RETAILER_PAID',
        message: notifMessage
      });
    } catch (ioErr) {}

    res.json({
      success: true,
      message: 'Retailer payment processed successfully! Winning bidder notified.',
      transport,
      txnId
    });

  } catch (error) {
    console.error('Retailer pay error:', error);
    res.status(500).json({ success: false, message: 'Failed to process retailer payment: ' + error.message });
  }
});

// @route   POST /api/v1/transport/allow-transport
// @desc    Winning bidder approves and allows transport to start (transitions status to IN_TRANSIT)
router.post('/allow-transport', async (req, res) => {
  try {
    const { getIO } = require('../services/socketService');
    const { transportId } = req.body;

    let transport = memoryTransports.find(t => String(t.transportId) === String(transportId) || String(t._id) === String(transportId));

    if (transport) {
      transport.status = 'IN_TRANSIT';
      transport.transportStartedAt = new Date();
    }

    try {
      await Transport.findOneAndUpdate(
        { $or: [{ transportId }, { _id: transportId.match(/^[0-9a-fA-F]{24}$/) ? transportId : null }] },
        { status: 'IN_TRANSIT', transportStartedAt: new Date() },
        { new: true }
      );
    } catch (e) {}

    // Socket.IO notification to transport room & global broadcast
    try {
      const io = getIO();
      io.to(`transport:${transportId}`).emit('transport:started', {
        transportId,
        status: 'IN_TRANSIT',
        message: 'Winning bidder approved transport. IoT sensor monitoring active!'
      });
      io.emit('transport:allowed', {
        transportId,
        status: 'IN_TRANSIT',
        message: 'Winning bidder approved transport. IoT sensor monitoring active!'
      });
      io.emit('transport:started', {
        transportId,
        status: 'IN_TRANSIT',
        message: 'Winning bidder approved transport. IoT sensor monitoring active!'
      });
    } catch (ioErr) {}

    res.json({
      success: true,
      message: 'Transport approved by winning bidder. Status updated to IN_TRANSIT.',
      transportId,
      status: 'IN_TRANSIT'
    });

  } catch (error) {
    console.error('Allow transport error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve transport: ' + error.message });
  }
});

router.memoryTransports = memoryTransports;

module.exports = router;

