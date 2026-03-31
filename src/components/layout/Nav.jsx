/**
 * src/components/layout/Nav.jsx
 * Shared navigation bar used by both TeacherLayout and StudentLayout.
 * Renders the app title, provided nav links, and a sign-out button.
 */

import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'

/**
 * @param {{
 *   links: Array<{ to: string, label: string }>,
 *   title?: string
 * }} props
 */
function Nav({ links = [], title = 'Classroom Plugin' }) {
  const { user, signOut } = useAuth()
  const location = useLocation()

  return (
    <nav className="nav" aria-label="Main navigation">
      <div className="nav__brand">
        <span className="nav__title">{title}</span>
      </div>

      <ul className="nav__links" role="list">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className={`nav__link ${location.pathname === link.to ? 'nav__link--active' : ''}`}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="nav__user">
        {user && (
          <>
            {user.picture && (
              <img
                src={user.picture}
                alt={user.name || user.email}
                className="nav__avatar"
                width={28}
                height={28}
              />
            )}
            <span className="nav__email">{user.name || user.email}</span>
          </>
        )}
        <button className="btn btn--secondary nav__signout" onClick={signOut}>
          Sign out
        </button>
      </div>
    </nav>
  )
}

export default Nav
