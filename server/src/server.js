const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/db');
const setupSockets = require('./sockets');
const env = require('./config/env');
const User = require('./models/User');
const { seedData } = require('./scripts/seed');

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Auto-seed if running fresh database
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('⚡ Initial startup: Populating database with evaluation demo data...');
      await seedData();
    }

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.io
    const io = setupSockets(server, env.CLIENT_URL);
    app.set('io', io);

    // Start listening
    const PORT = env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 Server running on port ${PORT} [${env.NODE_ENV}]`);
      console.log(`📡 Client origin: ${env.CLIENT_URL}`);
      console.log(`🛡️  Multi-Tenant Isolation Plugin: ACTIVE`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log(`======================================================\n`);
    });
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
};

startServer();
