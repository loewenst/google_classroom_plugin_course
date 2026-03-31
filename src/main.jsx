/**
 * src/main.jsx
 * Application entry point.
 * Mounts the React tree with HashRouter (required for GitHub Pages static hosting),
 * AuthProvider (OAuth session management), and the top-level App component.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider.jsx'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
)
