# PRD: Dynamic Recommendation Engine with LaunchDarkly

## Project Overview

Build a full-stack mock e-commerce recommendation engine that uses **LaunchDarkly feature flags** and **LaunchDarkly experimentation** to dynamically switch between two recommendation algorithms based on user attributes.

**This is a take-home interview exercise for LaunchDarkly's Full Stack Engineer Intern role.** The code will be reviewed line-by-line in a live code review session, so every line must be clean, well-commented, and explainable.

### Core Requirements (from LaunchDarkly)
1. Must integrate the LaunchDarkly SDK
2. Must manage at least **one feature flag**
3. Must manage at least **one experiment**
4. Must be built in Python, JavaScript + Node.js, or Go
5. Must be demo-able live during the interview
6. AI tools are allowed, but the developer must explain every line

### Tech Stack Decision
- **Backend**: Node.js + Express (LaunchDarkly has first-class Node server SDK)
- **Frontend**: React with Vite (fast scaffolding, clean component model)
- **Feature Flags**: `@launchdarkly/node-server-sdk` (server-side evaluation = secure)
- **Data**: In-memory JSON (no database needed)
- **Styling**: Tailwind CSS via CDN or basic CSS modules

---

## Architecture

### System Flow
```
User visits app → Frontend sends GET /api/recommendations?user_id=X&user_type=Y
    → Backend builds LaunchDarkly context { kind: 'user', key: user_id, user_type }
    → Backend calls ldClient.variation('recommendation-algorithm', context, 'simple')
    → LaunchDarkly returns 'simple' or 'complex' based on targeting rules
    → Backend runs the selected algorithm against product catalog
    → Backend calls ldClient.track('recommendation-engagement', context, null, score)
    → Backend returns { algorithm, recommendations, experimentMetric }
    → Frontend renders product cards + algorithm indicator dashboard
```

### Directory Structure
```
launchdarkly-rec-engine/
├── server/
│   ├── index.js                 # Express server entry point + LD client init
│   ├── launchdarkly.js          # LD client singleton + helper functions
│   ├── routes/
│   │   └── recommendations.js   # GET /api/recommendations route handler
│   ├── algorithms/
│   │   ├── simple.js            # Static curated list algorithm
│   │   └── complex.js           # Weighted scoring algorithm
│   └── data/
│       └── products.js          # Mock product catalog (25-30 products)
├── client/
│   ├── index.html               # Vite entry HTML
│   ├── src/
│   │   ├── main.jsx             # React entry point
│   │   ├── App.jsx              # Main app layout + state management
│   │   ├── App.css              # Global styles
│   │   └── components/
│   │       ├── UserSelector.jsx  # Toggle between standard/premium user
│   │       ├── ProductCard.jsx   # Individual product recommendation card
│   │       ├── Dashboard.jsx     # Shows active algorithm + metrics
│   │       └── Header.jsx        # App header with branding
│   ├── package.json
│   └── vite.config.js
├── .env                          # LAUNCHDARKLY_SDK_KEY=sdk-xxx (gitignored)
├── .env.example                  # LAUNCHDARKLY_SDK_KEY=your-sdk-key-here
├── .gitignore
├── package.json                  # Root package.json with scripts
└── README.md                     # Architecture doc + setup instructions
```

---

## Implementation Specifications

### 1. Root package.json

```json
{
  "name": "launchdarkly-rec-engine",
  "version": "1.0.0",
  "description": "Dynamic recommendation engine powered by LaunchDarkly feature flags and experimentation",
  "scripts": {
    "server": "node server/index.js",
    "client": "cd client && npm run dev",
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "install-all": "npm install && cd client && npm install"
  },
  "dependencies": {
    "@launchdarkly/node-server-sdk": "^9.7.0",
    "express": "^4.21.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "concurrently": "^9.0.0"
  }
}
```

### 2. server/launchdarkly.js — LaunchDarkly Client Singleton

This is the most critical file. It initializes the LD client once at startup and exports helpers.

```javascript
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
```

### 3. server/data/products.js — Mock Product Catalog

Create a realistic mock catalog with 25-30 products across 5 categories. Each product needs: id, name, category, price, rating (1-5), description, imageUrl (placeholder), and addedDate.

```javascript
/**
 * Mock e-commerce product catalog.
 * In production, this would come from a database or product API.
 * 
 * Categories: electronics, books, clothing, home, sports
 * Each product has: id, name, category, price, rating, description, imageUrl, addedDate
 */

const products = [
  // ELECTRONICS (6 products)
  {
    id: 'elec-001',
    name: 'Wireless Noise-Canceling Headphones',
    category: 'electronics',
    price: 79.99,
    rating: 4.7,
    description: 'Premium ANC headphones with 30-hour battery life',
    imageUrl: 'https://placehold.co/300x200/1a1a2e/ffffff?text=Headphones',
    addedDate: '2026-03-01',
  },
  {
    id: 'elec-002',
    name: 'Portable Bluetooth Speaker',
    category: 'electronics',
    price: 49.99,
    rating: 4.3,
    description: 'Waterproof speaker with 360-degree sound',
    imageUrl: 'https://placehold.co/300x200/1a1a2e/ffffff?text=Speaker',
    addedDate: '2026-02-15',
  },
  {
    id: 'elec-003',
    name: 'USB-C Hub 7-in-1',
    category: 'electronics',
    price: 34.99,
    rating: 4.5,
    description: 'Multi-port adapter with HDMI, USB 3.0, and SD card',
    imageUrl: 'https://placehold.co/300x200/1a1a2e/ffffff?text=USB+Hub',
    addedDate: '2026-01-20',
  },
  {
    id: 'elec-004',
    name: 'Mechanical Keyboard',
    category: 'electronics',
    price: 129.99,
    rating: 4.8,
    description: 'Hot-swappable switches with RGB backlighting',
    imageUrl: 'https://placehold.co/300x200/1a1a2e/ffffff?text=Keyboard',
    addedDate: '2026-03-10',
  },
  {
    id: 'elec-005',
    name: 'Wireless Mouse',
    category: 'electronics',
    price: 29.99,
    rating: 4.1,
    description: 'Ergonomic design with silent clicks',
    imageUrl: 'https://placehold.co/300x200/1a1a2e/ffffff?text=Mouse',
    addedDate: '2025-12-01',
  },
  {
    id: 'elec-006',
    name: 'Smart Watch Fitness Tracker',
    category: 'electronics',
    price: 199.99,
    rating: 4.6,
    description: 'Heart rate, GPS, sleep tracking, 5-day battery',
    imageUrl: 'https://placehold.co/300x200/1a1a2e/ffffff?text=Watch',
    addedDate: '2026-02-28',
  },

  // BOOKS (5 products)
  {
    id: 'book-001',
    name: 'System Design Interview Vol. 2',
    category: 'books',
    price: 39.99,
    rating: 4.9,
    description: 'Advanced distributed systems design patterns',
    imageUrl: 'https://placehold.co/300x200/16213e/ffffff?text=System+Design',
    addedDate: '2026-01-15',
  },
  {
    id: 'book-002',
    name: 'Designing Data-Intensive Applications',
    category: 'books',
    price: 44.99,
    rating: 4.8,
    description: 'The big ideas behind reliable, scalable systems',
    imageUrl: 'https://placehold.co/300x200/16213e/ffffff?text=DDIA',
    addedDate: '2025-11-01',
  },
  {
    id: 'book-003',
    name: 'The Pragmatic Programmer',
    category: 'books',
    price: 34.99,
    rating: 4.6,
    description: 'Timeless advice for modern software craftspeople',
    imageUrl: 'https://placehold.co/300x200/16213e/ffffff?text=Pragmatic',
    addedDate: '2025-10-15',
  },
  {
    id: 'book-004',
    name: 'Clean Code',
    category: 'books',
    price: 29.99,
    rating: 4.4,
    description: 'A handbook of agile software craftsmanship',
    imageUrl: 'https://placehold.co/300x200/16213e/ffffff?text=Clean+Code',
    addedDate: '2025-09-01',
  },
  {
    id: 'book-005',
    name: 'Staff Engineer: Leadership Beyond Management',
    category: 'books',
    price: 27.99,
    rating: 4.7,
    description: 'Navigating the path to staff-plus engineering roles',
    imageUrl: 'https://placehold.co/300x200/16213e/ffffff?text=Staff+Eng',
    addedDate: '2026-03-05',
  },

  // CLOTHING (5 products)
  {
    id: 'cloth-001',
    name: 'Merino Wool Quarter-Zip',
    category: 'clothing',
    price: 89.99,
    rating: 4.5,
    description: 'Temperature-regulating pullover for all seasons',
    imageUrl: 'https://placehold.co/300x200/0f3460/ffffff?text=Quarter+Zip',
    addedDate: '2026-02-01',
  },
  {
    id: 'cloth-002',
    name: 'Stretch Chino Pants',
    category: 'clothing',
    price: 59.99,
    rating: 4.3,
    description: 'Comfortable everyday pants with hidden stretch',
    imageUrl: 'https://placehold.co/300x200/0f3460/ffffff?text=Chinos',
    addedDate: '2026-01-10',
  },
  {
    id: 'cloth-003',
    name: 'Lightweight Rain Jacket',
    category: 'clothing',
    price: 74.99,
    rating: 4.2,
    description: 'Packable waterproof jacket, weighs under 8oz',
    imageUrl: 'https://placehold.co/300x200/0f3460/ffffff?text=Rain+Jacket',
    addedDate: '2026-03-12',
  },
  {
    id: 'cloth-004',
    name: 'Running Sneakers',
    category: 'clothing',
    price: 119.99,
    rating: 4.6,
    description: 'Responsive cushioning for daily training',
    imageUrl: 'https://placehold.co/300x200/0f3460/ffffff?text=Sneakers',
    addedDate: '2026-02-20',
  },
  {
    id: 'cloth-005',
    name: 'Classic Denim Jacket',
    category: 'clothing',
    price: 69.99,
    rating: 4.0,
    description: 'Timeless trucker-style jacket',
    imageUrl: 'https://placehold.co/300x200/0f3460/ffffff?text=Denim',
    addedDate: '2025-11-15',
  },

  // HOME (5 products)
  {
    id: 'home-001',
    name: 'Smart LED Desk Lamp',
    category: 'home',
    price: 45.99,
    rating: 4.4,
    description: 'Adjustable color temperature with USB charging port',
    imageUrl: 'https://placehold.co/300x200/1a1a40/ffffff?text=Desk+Lamp',
    addedDate: '2026-01-25',
  },
  {
    id: 'home-002',
    name: 'Pour-Over Coffee Maker',
    category: 'home',
    price: 32.99,
    rating: 4.7,
    description: 'Borosilicate glass with reusable stainless filter',
    imageUrl: 'https://placehold.co/300x200/1a1a40/ffffff?text=Coffee+Maker',
    addedDate: '2026-02-10',
  },
  {
    id: 'home-003',
    name: 'Minimalist Bookshelf',
    category: 'home',
    price: 149.99,
    rating: 4.1,
    description: 'Floating wall-mounted shelf, holds 40+ books',
    imageUrl: 'https://placehold.co/300x200/1a1a40/ffffff?text=Bookshelf',
    addedDate: '2025-12-15',
  },
  {
    id: 'home-004',
    name: 'Ceramic Plant Pot Set',
    category: 'home',
    price: 24.99,
    rating: 4.3,
    description: 'Set of 3 pots with drainage holes and saucers',
    imageUrl: 'https://placehold.co/300x200/1a1a40/ffffff?text=Plant+Pots',
    addedDate: '2026-03-08',
  },
  {
    id: 'home-005',
    name: 'Weighted Blanket 15lb',
    category: 'home',
    price: 59.99,
    rating: 4.8,
    description: 'Glass bead filling with cooling cotton cover',
    imageUrl: 'https://placehold.co/300x200/1a1a40/ffffff?text=Blanket',
    addedDate: '2026-01-05',
  },

  // SPORTS (5 products)
  {
    id: 'sport-001',
    name: 'Yoga Mat Premium',
    category: 'sports',
    price: 39.99,
    rating: 4.5,
    description: '6mm thick, non-slip, eco-friendly TPE material',
    imageUrl: 'https://placehold.co/300x200/533483/ffffff?text=Yoga+Mat',
    addedDate: '2026-02-05',
  },
  {
    id: 'sport-002',
    name: 'Resistance Bands Set',
    category: 'sports',
    price: 19.99,
    rating: 4.6,
    description: '5 bands with varying resistance levels + carry bag',
    imageUrl: 'https://placehold.co/300x200/533483/ffffff?text=Bands',
    addedDate: '2026-03-01',
  },
  {
    id: 'sport-003',
    name: 'Insulated Water Bottle 32oz',
    category: 'sports',
    price: 28.99,
    rating: 4.7,
    description: 'Keeps drinks cold 24hrs, hot 12hrs',
    imageUrl: 'https://placehold.co/300x200/533483/ffffff?text=Bottle',
    addedDate: '2026-01-18',
  },
  {
    id: 'sport-004',
    name: 'Jump Rope Speed Cable',
    category: 'sports',
    price: 14.99,
    rating: 4.2,
    description: 'Adjustable length, ball-bearing handles',
    imageUrl: 'https://placehold.co/300x200/533483/ffffff?text=Jump+Rope',
    addedDate: '2025-12-20',
  },
  {
    id: 'sport-005',
    name: 'Foam Roller',
    category: 'sports',
    price: 22.99,
    rating: 4.4,
    description: 'High-density EVA foam for deep tissue recovery',
    imageUrl: 'https://placehold.co/300x200/533483/ffffff?text=Foam+Roller',
    addedDate: '2026-02-25',
  },
];

module.exports = products;
```

### 4. server/algorithms/simple.js — Simple Recommendation Algorithm

The "editorial picks" approach. Returns top-rated products in a static, deterministic order.

```javascript
/**
 * Simple Recommendation Algorithm
 * 
 * Returns a static list of top-rated products sorted by rating.
 * This is the "safe" default — deterministic, fast, no computation.
 * Think of it as "editorial picks" or "staff favorites."
 * 
 * Time complexity: O(n log n) for sort
 * Space complexity: O(n) for the sorted copy
 * 
 * @param {Array} products - Full product catalog
 * @param {number} limit - Number of recommendations to return (default 6)
 * @returns {Array} Top-rated products with algorithm metadata
 */
function getSimpleRecommendations(products, limit = 6) {
  return products
    .slice()                                    // Don't mutate the original array
    .sort((a, b) => b.rating - a.rating)        // Sort by rating descending
    .slice(0, limit)                            // Take top N
    .map(product => ({
      ...product,
      algorithmNote: 'Selected by highest rating (editorial picks)',
    }));
}

module.exports = { getSimpleRecommendations };
```

### 5. server/algorithms/complex.js — Complex Recommendation Algorithm

Weighted scoring engine that considers category affinity, price, rating, and recency.

```javascript
/**
 * Complex Recommendation Algorithm
 * 
 * Uses a weighted scoring model that factors in:
 * 1. Category affinity (does this match user's preferred categories?)
 * 2. Price sensitivity (is this within the user's budget?)
 * 3. Rating quality (normalized 0-1 from the 1-5 star scale)
 * 4. Recency bonus (products added in the last 30 days get a boost)
 * 
 * Weights are tunable — in production, these would be optimized
 * via experimentation, which is exactly what LaunchDarkly enables.
 * 
 * Time complexity: O(n log n) for sort after O(n) scoring pass
 * Space complexity: O(n) for scored product copies
 * 
 * @param {Array} products - Full product catalog
 * @param {Object} userPreferences - User's preference profile
 * @param {string[]} userPreferences.favoriteCategories - Preferred categories
 * @param {number} userPreferences.maxPrice - Price ceiling
 * @param {number} limit - Number of recommendations to return (default 6)
 * @returns {Array} Scored and ranked products with algorithm metadata
 */

// Scoring weights — configurable constants
const WEIGHTS = {
  categoryAffinity: 0.35,    // Highest weight: category match matters most
  priceMatch: 0.20,          // Price sensitivity
  ratingQuality: 0.30,       // Product quality signal
  recencyBonus: 0.15,        // Freshness factor
};

function getComplexRecommendations(products, userPreferences, limit = 6) {
  const { favoriteCategories = [], maxPrice = 100 } = userPreferences;
  
  // Use a Set for O(1) category lookup instead of Array.includes() which is O(n)
  const categorySet = new Set(favoriteCategories);
  
  const scored = products.map(product => {
    const score = calculateScore(product, categorySet, maxPrice);
    return {
      ...product,
      score: Math.round(score * 100) / 100,  // Round to 2 decimal places
      algorithmNote: `Scored ${score.toFixed(2)} (category: ${categorySet.has(product.category) ? '✓' : '✗'}, price: ${product.price <= maxPrice ? '✓' : '✗'})`,
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Calculate a composite recommendation score for a product.
 * Each factor is normalized to [0, 1] before weighting.
 */
function calculateScore(product, categorySet, maxPrice) {
  // Factor 1: Category affinity (binary — matches or doesn't)
  const categoryScore = categorySet.has(product.category) ? 1.0 : 0.3;

  // Factor 2: Price match (inverse — cheaper relative to budget = better)
  const priceScore = product.price <= maxPrice
    ? 1.0 - (product.price / maxPrice) * 0.5    // Within budget: 0.5–1.0
    : Math.max(0.1, 1.0 - (product.price / maxPrice));  // Over budget: penalty

  // Factor 3: Rating quality (normalize 1-5 scale to 0-1)
  const ratingScore = (product.rating - 1) / 4;  // Maps 1→0, 5→1

  // Factor 4: Recency bonus (products added in last 30 days)
  const daysSinceAdded = Math.floor(
    (Date.now() - new Date(product.addedDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const recencyScore = daysSinceAdded <= 30 ? 1.0 : daysSinceAdded <= 60 ? 0.6 : 0.3;

  // Weighted composite score
  return (
    categoryScore * WEIGHTS.categoryAffinity +
    priceScore * WEIGHTS.priceMatch +
    ratingScore * WEIGHTS.ratingQuality +
    recencyScore * WEIGHTS.recencyBonus
  );
}

module.exports = { getComplexRecommendations, calculateScore, WEIGHTS };
```

### 6. server/routes/recommendations.js — Route Handler

This ties everything together. Single GET endpoint.

```javascript
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
```

### 7. server/index.js — Express Server Entry Point

```javascript
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
```

### 8. Frontend — React Components

#### client/package.json
```json
{
  "name": "rec-engine-client",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0"
  }
}
```

#### client/vite.config.js
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

#### client/src/App.jsx

Main app component. Manages user state, fetches recommendations, displays results.

Key behaviors:
- Default user: user_id='user-1', user_type='standard'
- When user toggles to premium, re-fetches recommendations automatically
- Shows algorithm indicator, engagement score, and which flag variation was served
- Displays product cards in a responsive grid
- Shows a "Dashboard" panel that makes the LD integration transparent for the demo

```
State:
  - userId (string)
  - userType ('standard' | 'premium')
  - recommendations (array of product objects)
  - algorithm ('simple' | 'complex')
  - engagementScore (number)
  - loading (boolean)
  - error (string | null)

On mount and on userType change:
  → fetch GET /api/recommendations?user_id={userId}&user_type={userType}
  → update all state from response

Layout:
  <Header />
  <UserSelector userType={userType} onChange={setUserType} userId={userId} onChangeId={setUserId} />
  <Dashboard algorithm={algorithm} engagementScore={engagementScore} userType={userType} />
  <div className="product-grid">
    {recommendations.map(product => <ProductCard key={product.id} product={product} algorithm={algorithm} />)}
  </div>
```

#### client/src/components/UserSelector.jsx

Lets the user switch between standard and premium, and optionally change user ID.

- Two large buttons for "Standard User" and "Premium User" (highlight the active one)
- A text input for user ID (so you can demo multiple different users in the code review)
- Explain in comments: changing user_type changes the LD context, which changes which flag variation is served

#### client/src/components/Dashboard.jsx

Transparent info panel showing what LaunchDarkly is doing behind the scenes. This is critical for the demo.

Display:
- Active algorithm: "simple" or "complex" with a colored badge
- Engagement score: the mock metric being tracked
- User type: standard or premium
- Flag name: "recommendation-algorithm"
- A brief explanation: "LaunchDarkly evaluates the flag for this user's context and serves the appropriate algorithm variation"

#### client/src/components/ProductCard.jsx

Individual product card displaying:
- Product image (placeholder URL)
- Product name
- Category badge
- Price
- Star rating (rendered as ★ characters)
- If algorithm is 'complex': show the score and the algorithmNote

#### client/src/components/Header.jsx

Simple header with:
- App name: "RecEngine"
- Subtitle: "Powered by LaunchDarkly Feature Flags"
- LaunchDarkly logo or icon (optional, can use an emoji 🏴 or text)

### 9. Styling

Use a clean, modern design. The app should look professional during the demo. Key design choices:
- Dark-ish header, light content area
- Card-based product layout (CSS Grid, 3 columns on desktop, 1 on mobile)
- Color-coded algorithm badges: blue for 'simple', purple/green for 'complex'
- Smooth transitions when switching user types
- Dashboard panel with a subtle border/shadow to distinguish it from product cards

### 10. .gitignore

```
node_modules/
.env
dist/
.DS_Store
```

### 11. .env.example

```
LAUNCHDARKLY_SDK_KEY=your-sdk-key-here
PORT=3001
```

### 12. README.md

Write a thorough README covering:

1. **Project title and one-line description**
2. **Architecture section** — explain the system flow (client → server → LD → algorithm → response)
3. **Design decisions** — why server-side SDK, why singleton, why fallback defaults, why this algorithm design
4. **Setup instructions** — step by step: clone, env vars, npm install, npm run dev
5. **LaunchDarkly configuration** — how to set up the flag, targeting rule, metric, and experiment in the dashboard
6. **Demo walkthrough** — what to show during the live review (toggle user types, show LD dashboard side-by-side)
7. **Extension ideas** — third algorithm (collaborative filtering), real metrics, percentage rollouts

---

## LaunchDarkly Dashboard Configuration Checklist

These must be configured in the LaunchDarkly UI BEFORE testing the app:

### Feature Flag
- **Flag key**: `recommendation-algorithm`
- **Flag type**: String
- **Variations**:
  - Variation 1: `simple` (name: "Simple Algorithm")
  - Variation 2: `complex` (name: "Complex Algorithm")
- **Targeting rule**: IF `user_type` is one of `premium` → serve `complex`
- **Default rule**: serve `simple`
- **Flag state**: ON (toggle it on in Test environment)

### Metric
- **Event kind**: Custom
- **Event key**: `recommendation-engagement` (MUST match the track() call in code EXACTLY)
- **Measurement**: Value / Size
- **Aggregation**: Average value per user, higher is better
- **Units without events**: Exclude
- **Unit of measure**: score
- **Metric name**: Recommendation Engagement Score

### Experiment
- **Name**: Algorithm Performance Test
- **Hypothesis**: The complex algorithm will drive higher average engagement scores than the simple algorithm
- **Flag**: recommendation-algorithm
- **Metric**: Recommendation Engagement Score
- **Variations**: Both (simple and complex)
- **Audience**: All users (100%)
- **Status**: Started (click Start to begin collecting data)

---

## Critical Notes for the AI Code Editor

1. **Do NOT use the LaunchDarkly client-side SDK.** Use `@launchdarkly/node-server-sdk` only. The flag evaluation happens on the server.
2. **The LD client MUST be a singleton.** Initialize once in `launchdarkly.js`, import the getter everywhere else. Never create a new client per request.
3. **The event key in `ldClient.track()` MUST exactly match the metric's event key in the dashboard**: `recommendation-engagement`
4. **The context attribute `user_type` MUST match the targeting rule attribute name exactly** (not `userType`, not `type`).
5. **The variation() fallback value ('simple') ensures graceful degradation** if LaunchDarkly is unreachable.
6. **Every function should have a JSDoc comment** explaining what it does, why it exists, and its parameters. This code will be reviewed line-by-line.
7. **Export `calculateScore` and `WEIGHTS` from complex.js** — the interviewer may ask you to modify the scoring weights live.
8. **The frontend proxy in vite.config.js** routes `/api/*` to the Express backend so CORS isn't an issue in development.
9. **Use `concurrently` in the root package.json** to start both server and client with one command: `npm run dev`.
10. **The mock engagement score in `generateMockEngagement()` is intentionally biased** — complex scores higher to simulate better personalization. Be ready to explain this design choice.