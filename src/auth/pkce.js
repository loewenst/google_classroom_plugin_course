/**
 * src/auth/pkce.js
 * PKCE (Proof Key for Code Exchange) OAuth 2.0 helpers for Google Sign-In.
 * Responsible for generating the code verifier/challenge and initiating the OAuth redirect.
 * Token exchange and refresh are proxied through the Cloud Function (see services/cloudFunction.js)
 * so GOOGLE_CLIENT_SECRET never reaches the browser.
 *
 * Flow: generateCodeVerifier → generateCodeChallenge → initiateOAuthFlow (redirects)
 *       → on callback: exchangeCodeForTokens → on expiry: refreshAccessToken
 */

import {
  exchangeCodeForTokens as cfExchangeCode,
  refreshAccessToken as cfRefreshToken,
} from '../services/cloudFunction.js'

const VERIFIER_KEY = 'pkce_code_verifier'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || window.location.origin
const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.students',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
].join(' ')

/**
 * Generates a cryptographically random code verifier (43–128 chars, URL-safe).
 * @returns {string} Base64url-encoded random verifier string.
 */
function generateCodeVerifier() {
  const array = new Uint8Array(64)
  crypto.getRandomValues(array)
  return base64urlEncode(array)
}

/**
 * Base64url-encodes a Uint8Array (no padding, URL-safe chars).
 * @param {Uint8Array} buffer
 * @returns {string}
 */
function base64urlEncode(buffer) {
  let str = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i])
  }
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Derives the PKCE code challenge from the verifier using SHA-256.
 * @param {string} verifier
 * @returns {Promise<string>} Base64url-encoded SHA-256 hash of the verifier.
 */
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64urlEncode(new Uint8Array(digest))
}

/**
 * Initiates the Google OAuth PKCE flow by redirecting the browser to Google's
 * authorization endpoint. Stores the code verifier in sessionStorage so it
 * survives the redirect.
 * @returns {Promise<void>}
 */
export async function initiateOAuthFlow() {
  if (!CLIENT_ID) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not set. Check your .env.local file.')
  }

  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)

  // Store verifier for retrieval after the redirect callback
  sessionStorage.setItem(VERIFIER_KEY, verifier)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  })

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/**
 * Exchanges the authorization code for access and refresh tokens.
 * Retrieves the stored PKCE verifier from sessionStorage, then proxies
 * the exchange through the Cloud Function so client_secret stays server-side.
 * @param {string} code - The authorization code from the OAuth callback URL.
 * @returns {Promise<{ access_token: string, refresh_token: string, expires_in: number, id_token: string }>}
 */
export async function exchangeCodeForTokens(code) {
  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  if (!verifier) {
    throw new Error('No PKCE code verifier found in sessionStorage. The OAuth flow may have been initiated in a different tab or session.')
  }

  const tokens = await cfExchangeCode({ code, codeVerifier: verifier, redirectUri: REDIRECT_URI })

  // Clean up verifier — it's single-use
  sessionStorage.removeItem(VERIFIER_KEY)

  return tokens
}

/**
 * Obtains a new access token using a refresh token, proxied through the Cloud Function
 * so client_secret stays server-side.
 * @param {string} refreshToken - The stored refresh token.
 * @returns {Promise<{ access_token: string, expires_in: number, id_token?: string }>}
 */
export async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    throw new Error('No refresh token provided to refreshAccessToken.')
  }

  return cfRefreshToken(refreshToken)
}
