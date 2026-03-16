/**
 * Header Component
 *
 * Displays the application branding and subtitle.
 * This is a presentational component with no state or side effects.
 * The LaunchDarkly branding makes it clear during the demo that this is
 * a feature flag driven application.
 */

function Header() {
  return (
    <header className="header">
      <h1>RecEngine</h1>
      <p>Powered by LaunchDarkly Feature Flags & Experimentation</p>
    </header>
  );
}

export default Header;
