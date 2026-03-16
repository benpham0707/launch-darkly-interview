/**
 * Express Server Entry Point
 *
 * Initializes the LaunchDarkly client BEFORE starting the HTTP server.
 * This ensures flag evaluations are available from the first request.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initialize, shutdown } = require('./launchdarkly');
const recommendationsRouter = require('./routes/recommendations');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/recommendations', recommendationsRouter);

// Health check endpoint (useful for demo)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server only after LD client is ready
async function start() {
  const sdkKey = process.env.LAUNCHDARKLY_SDK_KEY;

  if (!sdkKey) {
    console.error('❌ LAUNCHDARKLY_SDK_KEY is not set in .env file');
    process.exit(1);
  }

  try {
    // Initialize LD client FIRST — blocks until ready
    await initialize(sdkKey);

    // THEN start accepting HTTP requests
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Recommendations: http://localhost:${PORT}/api/recommendations?user_id=user1&user_type=standard`);
      console.log(`📊 Premium user:    http://localhost:${PORT}/api/recommendations?user_id=user2&user_type=premium`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown — flush LD events before exiting
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await shutdown();
  process.exit(0);
});

start();
