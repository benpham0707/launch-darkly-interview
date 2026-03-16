/**
 * Product Card Component
 *
 * Displays an individual product recommendation with all relevant details.
 *
 * Shows:
 * - Product image (placeholder)
 * - Product name and category
 * - Price and star rating
 * - Description
 * - Algorithm note (if complex algorithm, shows the score and why it was selected)
 *
 * The algorithm note is particularly important for the demo because it shows
 * how the complex algorithm scores products based on user preferences.
 *
 * Props:
 * @param {Object} product - Product object with all details
 * @param {string} algorithm - Which algorithm was used ('simple' or 'complex')
 */

function ProductCard({ product, algorithm }) {
  /**
   * Render star rating as visual stars.
   * Converts numeric rating (0-5) to filled and empty stars.
   */
  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <>
        {'★'.repeat(fullStars)}
        {hasHalfStar && '½'}
        {'☆'.repeat(emptyStars)}
      </>
    );
  };

  return (
    <div className="product-card">
      <img
        src={product.imageUrl}
        alt={product.name}
        className="product-image"
      />

      <div className="product-content">
        <div className="product-header">
          <h3 className="product-name">{product.name}</h3>
          <span className={`category-badge ${product.category}`}>
            {product.category}
          </span>
        </div>

        <p className="product-description">{product.description}</p>

        <div className="product-footer">
          <div className="product-price">${product.price}</div>
          <div className="product-rating">
            {renderStars(product.rating)}
            <span style={{ marginLeft: '0.25rem', color: '#4a5568' }}>
              {product.rating}
            </span>
          </div>
        </div>

        {algorithm === 'complex' && product.score !== undefined && (
          <div className="algorithm-note">
            <div className="product-score">Score: {product.score}</div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
              {product.algorithmNote}
            </div>
          </div>
        )}

        {algorithm === 'simple' && (
          <div className="algorithm-note">
            {product.algorithmNote}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductCard;
