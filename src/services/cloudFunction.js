/**
 * src/services/cloudFunction.js
 * Client-side wrapper for the deployed Google Cloud Function.
 * Responsible for all communication with the Cloud Function:
 *   - OAuth token exchange and refresh (proxied so client_secret stays server-side)
 *   - Assessment grading
 *   - Content unlocking
 * Components must NOT import this file directly — use hooks or auth layer instead.
 */

const FUNCTION_URL = import.meta.env.VITE_CLOUD_FUNCTION_URL

/**
 * Submits an assessment for server-side grading.
 * The cloud function verifies the id_token, computes the score from the answer key,
 * writes progress to Sheets, and returns the final score.
 *
 * @param {{ idToken: string, courseId: string, spreadsheetId: string, assessmentId: string, itemId: string, answers: Array }} payload
 * @returns {Promise<{ score: number }>}
 * @throws {Error} If VITE_CLOUD_FUNCTION_URL is not set or the request fails.
 */
export async function gradeSubmission({ idToken, courseId, spreadsheetId, assessmentId, itemId, answers }) {
  if (!FUNCTION_URL) {
    throw new Error('VITE_CLOUD_FUNCTION_URL is not configured. Add it to your .env.local file.')
  }

  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'grade',
      idToken,
      courseId,
      spreadsheetId,
      assessmentId,
      itemId,
      answers,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`gradeSubmission failed (${response.status}): ${err.error || response.statusText}`)
  }

  return response.json()
}

/**
 * Requests that the cloud function unlock a Drive file for a student.
 * The function verifies prerequisites server-side before granting Drive access.
 *
 * @param {{ idToken: string, courseId: string, spreadsheetId: string, itemId: string, driveFileId: string }} payload
 * @returns {Promise<{ unlocked: boolean, driveFileId: string }>}
 * @throws {Error} If the request fails or the prerequisite check fails (403).
 */
export async function unlockContent({ idToken, courseId, spreadsheetId, itemId, driveFileId }) {
  if (!FUNCTION_URL) {
    throw new Error('VITE_CLOUD_FUNCTION_URL is not configured. Add it to your .env.local file.')
  }

  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'unlock',
      idToken,
      courseId,
      spreadsheetId,
      itemId,
      driveFileId,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`unlockContent failed (${response.status}): ${err.error || response.statusText}`)
  }

  return response.json()
}

/**
 * Proxies the PKCE authorization code exchange through the Cloud Function
 * so GOOGLE_CLIENT_SECRET never reaches the browser.
 *
 * @param {{ code: string, codeVerifier: string, redirectUri: string }} payload
 * @returns {Promise<{ access_token: string, refresh_token: string, id_token: string, expires_in: number }>}
 * @throws {Error} If the request fails.
 */
export async function exchangeCodeForTokens({ code, codeVerifier, redirectUri }) {
  if (!FUNCTION_URL) {
    throw new Error('VITE_CLOUD_FUNCTION_URL is not configured. Add it to your .env file.')
  }

  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'exchangeToken', code, codeVerifier, redirectUri }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`Token exchange failed: ${err.error || response.statusText}`)
  }

  return response.json()
}

/**
 * Proxies a refresh token call through the Cloud Function
 * so GOOGLE_CLIENT_SECRET never reaches the browser.
 *
 * @param {string} refreshToken
 * @returns {Promise<{ access_token: string, expires_in: number, id_token?: string }>}
 * @throws {Error} If the request fails.
 */
export async function refreshAccessToken(refreshToken) {
  if (!FUNCTION_URL) {
    throw new Error('VITE_CLOUD_FUNCTION_URL is not configured. Add it to your .env file.')
  }

  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'refreshToken', refreshToken }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`Token refresh failed: ${err.error || response.statusText}`)
  }

  return response.json()
}
