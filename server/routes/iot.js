const express = require('express');
const router = express.Router();
const SensorData = require('../models/SensorData');
const Transport = require('../models/Transport');
const Notification = require('../models/Notification');
const { getIO } = require('../services/socketService');

// In-memory fallback buffer for IoT sensor readings when offline
const inMemorySensorLogs = [];

// @route   POST /api/v1/iot/sensor-data
// @desc    Receive live telemetry reading from ESP8266 + DHT22 hardware sensor
router.post('/sensor-data', async (req, res) => {
  try {
    const { device_id, transport_id, deviceId, transportId, temperature, humidity } = req.body;

    const devId = device_id || deviceId || 'ESP8266_01';
    const transId = transport_id || transportId || 'TR001';
    const temp = parseFloat(temperature);
    const hum = parseFloat(humidity);

    if (isNaN(temp) || isNaN(hum)) {
      return res.status(400).json({ success: false, message: 'Invalid temperature or humidity values.' });
    }

    const readingData = {
      deviceId: devId,
      transportId: transId,
      temperature: temp,
      humidity: hum,
      recordedAt: new Date()
    };

    // Store in in-memory fallback array
    inMemorySensorLogs.unshift(readingData);
    if (inMemorySensorLogs.length > 200) inMemorySensorLogs.pop();

    // Try saving to DB asynchronously (with timeout catch)
    try {
      const sensorReading = new SensorData(readingData);
      await Promise.race([
        sensorReading.save(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 2000))
      ]);
    } catch (dbErr) {
      console.warn('⚠️ MongoDB save skipped/timed out, using in-memory log storage.');
    }

    const maxTempThreshold = 30.0;
    const isAlert = temp > maxTempThreshold;

    // Broadcast live telemetry reading to room transport:<transId> via Socket.IO
    try {
      const io = getIO();
      io.to(`transport:${transId}`).emit('transport:telemetry', {
        deviceId: devId,
        transportId: transId,
        temperature: temp,
        humidity: hum,
        isAlert,
        recordedAt: readingData.recordedAt
      });
    } catch (ioErr) {
      // Socket optional
    }

    res.status(200).json({
      success: true,
      message: 'Sensor data received successfully',
      data: readingData
    });

  } catch (error) {
    console.error('IoT sensor data ingestion error:', error);
    res.status(500).json({ success: false, message: 'Error processing sensor telemetry: ' + error.message });
  }
});

// @route   GET /api/v1/iot/sensor-data/:transportId
// @desc    Get telemetry history for a specific transport
router.get('/sensor-data/:transportId', async (req, res) => {
  try {
    let logs = [];
    try {
      logs = await Promise.race([
        SensorData.find({ transportId: req.params.transportId }).sort({ recordedAt: -1 }).limit(100),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 2000))
      ]);
    } catch (dbErr) {
      logs = inMemorySensorLogs.filter(l => l.transportId === req.params.transportId);
    }

    if (!logs || logs.length === 0) {
      logs = inMemorySensorLogs;
    }

    res.json({ success: true, count: logs.length, sensorHistory: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve sensor history' });
  }
});

router.inMemorySensorLogs = inMemorySensorLogs;

module.exports = router;
