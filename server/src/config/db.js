const mongoose = require('mongoose');
const env = require('./env');

let memoryServer = null;

/**
 * Connects to MongoDB Atlas (if MONGO_URI provided) or falls back to an embedded
 * in-memory MongoDB server for instant zero-config evaluation.
 */
const connectDB = async () => {
  try {
    let uri = env.MONGO_URI;

    if (!uri) {
      console.log('⚡ No MONGO_URI provided. Starting in-memory MongoDB server (mongodb-memory-server)...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      uri = memoryServer.getUri();
      console.log(`✅ In-memory MongoDB started at: ${uri}`);
    } else {
      console.log(`Connecting to MongoDB at: ${uri.split('@')[1] || uri}...`);
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });

    console.log(`🚀 MongoDB connected successfully to database: "${mongoose.connection.name}"`);
    return mongoose.connection;
  } catch (error) {
    // If external Mongo connection timed out/failed and we haven't tried memory server yet, fall back gracefully
    if (!memoryServer && env.MONGO_URI) {
      console.warn(`⚠️ Failed to connect to external MONGO_URI (${error.message}). Falling back to memory-server...`);
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create();
        const fallbackUri = memoryServer.getUri();
        await mongoose.connect(fallbackUri);
        console.log(`✅ In-memory MongoDB started as fallback at: ${fallbackUri}`);
        return mongoose.connection;
      } catch (memErr) {
        console.error('❌ Failed to start in-memory MongoDB fallback:', memErr);
        throw memErr;
      }
    }

    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
    }
  } catch (err) {
    console.error('Error disconnecting MongoDB:', err.message);
  }
};

module.exports = {
  connectDB,
  disconnectDB
};
