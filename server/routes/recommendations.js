/**
 * Recommendations Route Handler
 *
 * GET /api/recommendations
 * Query params:
 *   - user_id (string, default: 'anonymous')
 *   - user_type (string, default: 'standard') — 'standard' or 'premium'
 *
 * Flow:
 * 1. Build LD context from query params
 * 2. Evaluate 'recommendation-algorithm' flag → 'simple' or 'complex'
 * 3. Run the selected algorithm
 * 4. Track experiment metric via ldClient.track()
 * 5. Return recommendations + metadata
 */

const express = require('express');
const router = express.Router();
const { getClient, buildContext } = require('../launchdarkly');
const { getSimpleRecommendations } = require('../algorithms/simple');
const { getComplexRecommendations } = require('../algorithms/complex');
const products = require('../data/products');

// Mock user preference profiles
// In production, these would come from a user service or profile database
const USER_PREFERENCES = {
  standard: {
    favoriteCategories: ['home', 'books'],
    maxPrice: 60,
  },
  premium: {
    favoriteCategories: ['electronics', 'sports', 'books'],
    maxPrice: 200,
  },
};

router.get('/', async (req, res) => {
  try {
    const { user_id = 'anonymous', user_type = 'standard' } = req.query;
    const ldClient = getClient();

    // Step 1: Build the LaunchDarkly context
    const context = buildContext(user_id, user_type);

    // Step 2: Evaluate the feature flag
    // 'recommendation-algorithm' is a string flag with variations: 'simple', 'complex'
    // Fallback 'simple' is used if LaunchDarkly is unreachable (graceful degradation)
    const algorithm = await ldClient.variation(
      'recommendation-algorithm',
      context,
      'simple'  // fallback value — safe default if LD is down
    );

    // Step 3: Run the appropriate algorithm
    const userPrefs = USER_PREFERENCES[user_type] || USER_PREFERENCES.standard;
    let recommendations;

    if (algorithm === 'complex') {
      recommendations = getComplexRecommendations(products, userPrefs);
    } else {
      recommendations = getSimpleRecommendations(products);
    }

    // Step 4: Track experiment metric
    // This sends a mock engagement score to LaunchDarkly's experiment
    // Event key MUST match the metric's event key in the LD dashboard exactly
    const engagementScore = generateMockEngagement(algorithm);
    ldClient.track('recommendation-engagement', context, null, engagementScore);

    // Step 5: Return response
    res.json({
      algorithm,
      user: {
        id: user_id,
        type: user_type,
        preferences: userPrefs,
      },
      recommendations,
      experiment: {
        metricName: 'recommendation-engagement',
        engagementScore: Math.round(engagementScore),
      },
      meta: {
        totalProducts: products.length,
        returnedCount: recommendations.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations', message: error.message });
  }
});

/**
 * Generate a mock engagement score to simulate user behavior.
 * In production, this would be replaced by real metrics (click-through rate,
 * time-on-page, add-to-cart rate, etc.)
 *
 * The complex algorithm is biased slightly higher to simulate better personalization.
 */
function generateMockEngagement(algorithm) {
  if (algorithm === 'complex') {
    return Math.random() * 35 + 65;   // Range: 65-100 (personalized = higher engagement)
  }
  return Math.random() * 50 + 30;     // Range: 30-80 (generic = lower engagement)
}

module.exports = router;
