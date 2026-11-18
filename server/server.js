const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const http = require('http');

require('dotenv').config();

// Connect MongoDB & Socket.IO
const connectMongoDB = require('./config/db');
const { initSocket } = require('./services/socketService');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const cropRoutes = require('./routes/crops');
const orderRoutes = require('./routes/orders');
const aggregatorRoutes = require('./routes/aggregator');
const paymentRoutes = require('./routes/payments');
const qrRoutes = require('./routes/qr');
const analyticsRoutes = require('./routes/analytics');
const uploadRoutes = require('./routes/upload');
const aiQualityRoutes = require('./routes/ai-quality');
const farmerRoutes = require('./routes/farmer');
const retailerRoutes = require('./routes/retailer');
const notificationRoutes = require('./routes/notifications');
const mlRoutes = require('./routes/ml');
const pricingRoutes = require('./routes/pricing');

// New AgriLink routes
const auctionRoutes = require('./routes/auctions');
const transportRoutes = require('./routes/transport');
const iotRoutes = require('./routes/iot');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const app = express();

// Trust proxy for express-rate-limit
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// Ensure upload directories exist
const fs = require('fs');
const path = require('path');
const uploadDirs = ['uploads', 'uploads/quality-checks', 'uploads/quality-ml'];
uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Static files
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static('uploads'));

app.use('/logo.png', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static('agritrack-logo.png'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
const apiVersion = process.env.API_VERSION || 'v1';
app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/users`, userRoutes);
app.use(`/api/${apiVersion}/crops`, cropRoutes);
app.use(`/api/${apiVersion}/orders`, orderRoutes);
app.use(`/api/${apiVersion}/aggregator`, aggregatorRoutes);
app.use(`/api/${apiVersion}/payments`, paymentRoutes);
app.use(`/api/${apiVersion}/qr`, qrRoutes);
app.use(`/api/${apiVersion}/analytics`, analyticsRoutes);
app.use(`/api/${apiVersion}/upload`, uploadRoutes);
app.use(`/api/${apiVersion}/ai-quality`, aiQualityRoutes);
app.use(`/api/${apiVersion}/farmer`, farmerRoutes);
app.use(`/api/${apiVersion}/retailer`, retailerRoutes);
app.use(`/api/${apiVersion}/notifications`, notificationRoutes);
app.use(`/api/${apiVersion}/ml`, mlRoutes);
app.use(`/api/${apiVersion}/pricing`, pricingRoutes);

// AgriLink core routes
app.use(`/api/${apiVersion}/auctions`, auctionRoutes);
app.use(`/api/${apiVersion}/transport`, transportRoutes);
app.use(`/api/${apiVersion}/iot`, iotRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: '🌾 Welcome to AgriLink API',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health'
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('\n🛑 Received shutdown signal, closing server gracefully...');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Create HTTP server & Attach Socket.IO
const server = http.createServer(app);
initSocket(server);

// Start server
const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    await connectMongoDB();

    server.listen(PORT, () => {
      console.log(`🚀 AgriLink Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`📡 API Version: ${apiVersion}`);
      console.log(`🔌 Socket.IO Live Bidding & IoT Ingestion Ready`);
      console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
      }
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
