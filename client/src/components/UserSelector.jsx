/**
 * User Selector Component
 *
 * Allows the user to switch between 'standard' and 'premium' user types,
 * and optionally change the user ID.
 *
 * Why this matters for the demo:
 * - Changing user_type changes the LaunchDarkly context
 * - This triggers different flag evaluation results (targeting rules)
 * - Premium users get the 'complex' algorithm, standard users get 'simple'
 * - This visually demonstrates how LaunchDarkly targets users based on attributes
 *
 * Props:
 * @param {string} userId - Current user ID
 * @param {string} userType - Current user type ('standard' or 'premium')
 * @param {function} onUserIdChange - Callback when user ID changes
 * @param {function} onUserTypeChange - Callback when user type changes
 */

function UserSelector({ userId, userType, onUserIdChange, onUserTypeChange }) {
  return (
    <div className="user-selector">
      <h2>Select User Type</h2>

      <div className="user-type-buttons">
        <button
          className={`user-type-button ${userType === 'standard' ? 'active' : ''}`}
          onClick={() => onUserTypeChange('standard')}
        >
          Standard User
        </button>
        <button
          className={`user-type-button ${userType === 'premium' ? 'active' : ''}`}
          onClick={() => onUserTypeChange('premium')}
        >
          Premium User
        </button>
      </div>

      <div className="user-id-input">
        <label htmlFor="userId">User ID (for demo purposes):</label>
        <input
          type="text"
          id="userId"
          value={userId}
          onChange={(e) => onUserIdChange(e.target.value)}
          placeholder="Enter user ID"
        />
      </div>
    </div>
  );
}

export default UserSelector;
