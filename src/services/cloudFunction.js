/**
 * src/services/cloudFunction.js
 * Client-side wrapper for the deployed Google Cloud Function.
 * Responsible for sending grading and content-unlock requests to the
 * server-side function, which handles authorization and Sheets writes.
 * Components must NOT import this file directly — use hooks instead.
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
