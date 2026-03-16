/**
 * LaunchDarkly Client Singleton
 *
 * Initializes a single LD client instance shared across all requests.
 * The server-side SDK key is used (not client-side ID) because:
 * 1. Algorithm selection logic stays opaque to the client
 * 2. Server-side evaluation is more secure
 * 3. SDK key never leaves the backend
 */

const LaunchDarkly = require('@launchdarkly/node-server-sdk');

let ldClient = null;

/**
 * Initialize the LaunchDarkly client.
 * Must be called once at server startup, before any flag evaluations.
 * @param {string} sdkKey - LaunchDarkly SDK key from Project Settings > Environments > Test
 */
async function initialize(sdkKey) {
  ldClient = LaunchDarkly.init(sdkKey);

  try {
    await ldClient.waitForInitialization({ timeout: 10 });
    console.log('✅ LaunchDarkly client initialized successfully');
  } catch (err) {
    console.error('❌ LaunchDarkly client failed to initialize:', err);
    throw err;
  }
}

/**
 * Get the initialized LD client instance.
 * Throws if called before initialize().
 */
function getClient() {
  if (!ldClient) {
    throw new Error('LaunchDarkly client not initialized. Call initialize() first.');
  }
  return ldClient;
}

/**
 * Build a LaunchDarkly context for a given user.
 * Contexts describe the "who" being evaluated for flag targeting.
 * @param {string} userId - Unique user identifier
 * @param {string} userType - 'standard' or 'premium' (used for targeting rules)
 */
function buildContext(userId, userType) {
  return {
    kind: 'user',
    key: userId,
    user_type: userType,       // Custom attribute — must match targeting rule attribute name exactly
    name: `User ${userId}`,
  };
}

/**
 * Gracefully shut down the LD client.
 * Flushes any pending analytics events before closing.
 */
async function shutdown() {
  if (ldClient) {
    await ldClient.flush();
    ldClient.close();
    console.log('LaunchDarkly client shut down');
  }
}

module.exports = { initialize, getClient, buildContext, shutdown };
