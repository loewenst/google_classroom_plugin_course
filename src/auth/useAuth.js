/**
 * src/auth/useAuth.js
 * Convenience hook for consuming the AuthContext.
 * Throws a descriptive error if used outside of AuthProvider so developers
 * catch the misconfiguration at development time rather than silently getting null.
 */

import { useContext } from 'react'
import { AuthContext } from './AuthProvider.jsx'

/**
 * Returns the current auth context value: { user, accessToken, loading, error, signIn, signOut }.
 * @throws {Error} If called outside of an AuthProvider tree.
 * @returns {{ user: object|null, accessToken: string|null, loading: boolean, error: string|null, signIn: function, signOut: function }}
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error(
      'useAuth() was called outside of an <AuthProvider>. ' +
      'Wrap your component tree with <AuthProvider> in main.jsx.'
    )
  }
  return context
}
