/**
 * React Application Entry Point
 *
 * Sets up the React root and mounts the main App component.
 * This file is imported by index.html as the starting point for the client application.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
