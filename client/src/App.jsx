/**
 * Main Application Component
 *
 * Manages the entire application state and coordinates between child components.
 *
 * State management:
 * - userId: The unique identifier for the current user
 * - userType: Either 'standard' or 'premium', used for LaunchDarkly context targeting
 * - recommendations: Array of product objects returned from the API
 * - algorithm: Which algorithm was used ('simple' or 'complex'), determined by LaunchDarkly
 * - engagementScore: Mock metric value for the experiment
 * - loading: Loading state during API fetch
 * - error: Error message if API request fails
 *
 * Flow:
 * 1. On mount and whenever userType changes, fetch recommendations from backend
 * 2. Backend evaluates LaunchDarkly flag based on user context
 * 3. Backend returns recommendations + metadata (algorithm used, engagement score)
 * 4. Display results in a responsive grid with dashboard showing LD integration
 */

import { useState, useEffect } from 'react';
import Header from './components/Header';
import UserSelector from './components/UserSelector';
import Dashboard from './components/Dashboard';
import ProductCard from './components/ProductCard';

function App() {
  const [userId, setUserId] = useState('user-1');
  const [userType, setUserType] = useState('standard');
  const [recommendations, setRecommendations] = useState([]);
  const [algorithm, setAlgorithm] = useState('');
  const [engagementScore, setEngagementScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch recommendations from the backend API.
   * This triggers LaunchDarkly flag evaluation on the server side.
   * Runs on component mount and whenever userId or userType changes.
   */
  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/recommendations?user_id=${userId}&user_type=${userType}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        setRecommendations(data.recommendations);
        setAlgorithm(data.algorithm);
        setEngagementScore(data.experiment.engagementScore);
      } catch (err) {
        setError(err.message);
        console.error('Failed to fetch recommendations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [userId, userType]);

  return (
    <div className="app">
      <Header />

      <main className="main-content">
        <UserSelector
          userId={userId}
          userType={userType}
          onUserIdChange={setUserId}
          onUserTypeChange={setUserType}
        />

        <Dashboard
          algorithm={algorithm}
          engagementScore={engagementScore}
          userType={userType}
          loading={loading}
        />

        {error && (
          <div className="error-message">
            <p>Error: {error}</p>
          </div>
        )}

        {loading ? (
          <div className="loading">
            <p>Loading recommendations...</p>
          </div>
        ) : (
          <div className="product-grid">
            {recommendations.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                algorithm={algorithm}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
