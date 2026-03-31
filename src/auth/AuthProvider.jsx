/**
 * src/auth/AuthProvider.jsx
 * Authentication context provider. Manages the full OAuth lifecycle:
 *   - OAuth callback handling (reads ?code= after HashRouter redirect)
 *   - Session restore from localStorage refresh token on page load
 *   - Silent token refresh scheduled before access token expires
 *   - signIn() / signOut() actions
 *
 * Security note: The refresh token is stored in localStorage for persistence
 * across browser sessions. This is a known XSS tradeoff — an attacker with
 * XSS access could steal the refresh token. The access token is kept in memory
 * only and is never written to any storage. For a higher-security deployment,
 * consider using httpOnly cookies via a backend session endpoint instead.
 *
 * Exposes via AuthContext: { user, accessToken, idToken, loading, error, signIn, signOut }
 */

import React, { createContext, useState, useEffect, useRef, useCallback } from 'react'
import { initiateOAuthFlow, exchangeCodeForTokens, refreshAccessToken } from './pkce.js'

export const AuthContext = createContext(null)

const REFRESH_TOKEN_KEY = 'auth_refresh_token'
// Refresh the access token 2 minutes before it expires
const REFRESH_BUFFER_MS = 2 * 60 * 1000

/**
 * Decodes a JWT payload without verifying the signature (client-side use only).
 * @param {string} token
 * @returns {object|null}
 */
function decodeJwt(token) {
  try {
    const payload = token.split('.')[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

/**
 * AuthProvider wraps the app and manages authentication state.
 * @param {{ children: React.ReactNode }} props
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // Access token and id_token live only in memory — never persisted to storage
  const [accessToken, setAccessToken] = useState(null)
  const [idToken, setIdToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Timer ref for scheduled token refresh
  const refreshTimerRef = useRef(null)

  /**
   * Schedules a silent token refresh `expiresIn` seconds from now, minus buffer.
   * @param {string} refreshToken
   * @param {number} expiresIn - seconds until access token expires
   */
  const scheduleRefresh = useCallback((refreshToken, expiresIn) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }
    const delay = (expiresIn * 1000) - REFRESH_BUFFER_MS
    if (delay <= 0) {
      // Already near expiry — refresh immediately
      performTokenRefresh(refreshToken)
      return
    }
    refreshTimerRef.current = setTimeout(() => {
      performTokenRefresh(refreshToken)
    }, delay)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Performs a silent refresh using the stored refresh token.
   * Updates access token in memory and reschedules the next refresh.
   * @param {string} refreshToken
   */
  const performTokenRefresh = useCallback(async (refreshToken) => {
    try {
      const tokens = await refreshAccessToken(refreshToken)
      setAccessToken(tokens.access_token)

      if (tokens.id_token) {
        setIdToken(tokens.id_token)
        const payload = decodeJwt(tokens.id_token)
        if (payload) {
          setUser({ sub: payload.sub, email: payload.email, name: payload.name, picture: payload.picture })
        }
      }

      scheduleRefresh(refreshToken, tokens.expires_in)
    } catch (err) {
      // Refresh failed — sign out the user
      console.error('Silent token refresh failed:', err)
      handleSignOut()
    }
  }, [scheduleRefresh]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Processes the OAuth callback code from the URL search params.
   * Called once on mount if ?code= is present in the URL.
   */
  const handleOAuthCallback = useCallback(async (code) => {
    try {
      const tokens = await exchangeCodeForTokens(code)
      const payload = decodeJwt(tokens.id_token)

      if (!payload) {
        throw new Error('Failed to decode id_token from OAuth response.')
      }

      setUser({ sub: payload.sub, email: payload.email, name: payload.name, picture: payload.picture })
      setAccessToken(tokens.access_token)
      setIdToken(tokens.id_token)

      if (tokens.refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
        scheduleRefresh(tokens.refresh_token, tokens.expires_in)
      }

      // Clean the code out of the URL so reloads don't re-attempt the exchange
      const url = new URL(window.location.href)
      url.searchParams.delete('code')
      url.searchParams.delete('scope')
      url.searchParams.delete('authuser')
      url.searchParams.delete('prompt')
      window.history.replaceState({}, document.title, url.toString())
    } catch (err) {
      setError(err.message)
    }
  }, [scheduleRefresh])

  // On mount: check for OAuth callback code or restore session from refresh token
  useEffect(() => {
    const init = async () => {
      try {
        // Check for OAuth callback — the code appears as a query param before the hash
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')

        if (code) {
          await handleOAuthCallback(code)
          setLoading(false)
          return
        }

        // Attempt session restore from persisted refresh token
        const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
        if (storedRefreshToken) {
          await performTokenRefresh(storedRefreshToken)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    init()

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Initiates the Google OAuth PKCE sign-in flow (redirects browser).
   */
  const signIn = useCallback(() => {
    setError(null)
    initiateOAuthFlow().catch((err) => setError(err.message))
  }, [])

  /**
   * Signs out the current user: clears state, removes refresh token,
   * cancels scheduled refresh.
   */
  const handleSignOut = useCallback(() => {
    setUser(null)
    setAccessToken(null)
    setIdToken(null)
    setError(null)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }
  }, [])

  const value = {
    user,
    accessToken,
    idToken,
    loading,
    error,
    signIn,
    signOut: handleSignOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
