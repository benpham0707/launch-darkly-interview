/**
 * Dashboard Component
 *
 * Displays transparent information about what LaunchDarkly is doing behind the scenes.
 * This is critical for the demo because it makes the feature flag integration visible
 * to the interviewer.
 *
 * Shows:
 * - Active algorithm variation ('simple' or 'complex')
 * - Mock engagement score (the experiment metric being tracked)
 * - User type (the targeting attribute)
 * - Flag name ('recommendation-algorithm')
 * - Brief explanation of how LaunchDarkly targeting works
 *
 * Props:
 * @param {string} algorithm - Which algorithm variation is active
 * @param {number} engagementScore - Mock engagement metric value
 * @param {string} userType - Current user type ('standard' or 'premium')
 * @param {boolean} loading - Loading state
 */

function Dashboard({ algorithm, engagementScore, userType, loading }) {
  if (loading) {
    return null;
  }

  return (
    <div className="dashboard">
      <h2>LaunchDarkly Integration Dashboard</h2>

      <div className="dashboard-grid">
        <div className="dashboard-item">
          <div className="dashboard-item-label">Active Algorithm</div>
          <div className="dashboard-item-value">
            <span className={`algorithm-badge ${algorithm}`}>
              {algorithm.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="dashboard-item">
          <div className="dashboard-item-label">Engagement Score</div>
          <div className="dashboard-item-value">{engagementScore}</div>
        </div>

        <div className="dashboard-item">
          <div className="dashboard-item-label">User Type</div>
          <div className="dashboard-item-value">{userType}</div>
        </div>

        <div className="dashboard-item">
          <div className="dashboard-item-label">Feature Flag</div>
          <div className="dashboard-item-value" style={{ fontSize: '1rem' }}>
            recommendation-algorithm
          </div>
        </div>
      </div>

      <div className="dashboard-explanation">
        <strong>How it works:</strong> LaunchDarkly evaluates the{' '}
        <code>recommendation-algorithm</code> flag for each user's context. The targeting
        rule checks the <code>user_type</code> attribute:
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
          <li>
            <strong>Premium users</strong> → receive the <code>complex</code> algorithm
            (personalized recommendations)
          </li>
          <li>
            <strong>Standard users</strong> → receive the <code>simple</code> algorithm
            (top-rated editorial picks)
          </li>
        </ul>
        The backend tracks engagement scores as custom events to measure which algorithm
        performs better in the LaunchDarkly experiment.
      </div>
    </div>
  );
}

export default Dashboard;
