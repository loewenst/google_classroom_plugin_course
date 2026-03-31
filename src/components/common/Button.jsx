/**
 * src/components/common/Button.jsx
 * Reusable button component with variant support and loading spinner.
 * Variants: primary (default), secondary, danger.
 * Shows an inline spinner and disables click when loading=true.
 */

import React from 'react'
import Spinner from './Spinner.jsx'

/**
 * @param {{ children: React.ReactNode, onClick?: function, variant?: 'primary'|'secondary'|'danger', disabled?: boolean, loading?: boolean, type?: string }} props
 */
function Button({ children, onClick, variant = 'primary', disabled = false, loading = false, type = 'button', className = '', ...rest }) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} ${loading ? 'btn--loading' : ''} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading && <Spinner size="sm" />}
      <span className={loading ? 'btn__label--hidden' : ''}>{children}</span>
    </button>
  )
}

export default Button
