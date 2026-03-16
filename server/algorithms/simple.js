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
