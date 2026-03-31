/**
 * src/components/common/ErrorBoundary.jsx
 * React class component error boundary. Catches render errors anywhere in its
 * subtree and shows a user-friendly error UI with a Reload button.
 * Does NOT silence errors — re-throws in development via componentDidCatch.
 */

import React from 'react'

/**
 * ErrorBoundary wraps any subtree. On uncaught render error, shows an error
 * panel instead of a blank screen. The Reload button performs a full page reload.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Log for debugging — do NOT silence
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary__box">
            <h2 className="error-boundary__title">Something went wrong</h2>
            <p className="error-boundary__message">
              An unexpected error occurred. This has been logged. You can try reloading the page.
            </p>
            {this.state.error && (
              <pre className="error-boundary__detail">
                {this.state.error.toString()}
              </pre>
            )}
            <button className="btn btn--primary" onClick={this.handleReload}>
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
