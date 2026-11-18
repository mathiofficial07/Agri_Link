const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI;
    if (!connStr) {
      console.warn('⚠️ MONGODB_URI not found in environment. Database operations will run with fallback mode.');
      return;
    }
    const conn = await mongoose.connect(connStr);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
  }
};

module.exports = connectDB;
