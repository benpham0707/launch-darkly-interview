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
