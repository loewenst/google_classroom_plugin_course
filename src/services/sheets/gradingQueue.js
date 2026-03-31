/**
 * src/services/sheets/gradingQueue.js
 * Google Sheets API service for the GradingQueue tab.
 * Responsible for reading pending manual-review submissions and writing
 * teacher feedback and scores back to the sheet.
 */

import { SHEET_NAMES, COLUMNS } from '../../utils/sheetsSchema.js'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const TAB = SHEET_NAMES.GRADING_QUEUE
const COL = COLUMNS.GRADING_QUEUE

/**
 * Parses a raw row into a grading queue submission object.
 * @param {Array} row
 * @param {number} rowIndex - 1-based sheet row number (for updates).
 * @returns {object}
 */
function rowToSubmission(row, rowIndex) {
  return {
    _rowIndex: rowIndex,
    submission_id: row[COL.submission_id] || '',
    student_id: row[COL.student_id] || '',
    item_id: row[COL.item_id] || '',
    submitted_at: row[COL.submitted_at] || '',
    status: row[COL.status] || 'pending',
    score: row[COL.score] !== undefined ? Number(row[COL.score]) : null,
    feedback_text: row[COL.feedback_text] || '',
    feedback_audio_id: row[COL.feedback_audio_id] || '',
    reviewed_at: row[COL.reviewed_at] || '',
  }
}

/**
 * Fetches all pending (status = 'pending') submissions from the GradingQueue tab.
 * @param {string} spreadsheetId
 * @param {string} accessToken
 * @returns {Promise<Array<object>>}
 * @throws {Error} On API failure.
 */
export async function getPendingSubmissions(spreadsheetId, accessToken) {
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(TAB)}`
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`getPendingSubmissions failed (${response.status}): ${err.error?.message || response.statusText}`)
  }
  const data = await response.json()
  const rows = (data.values || []).slice(1)
  return rows
    .map((row, i) => rowToSubmission(row, i + 2)) // +2: 1-based + skip header
    .filter((s) => s.submission_id && s.status === 'pending')
}

/**
 * Appends a new submission to the GradingQueue for teacher review.
 * @param {{ submission_id: string, student_id: string, item_id: string }} submission
 * @param {string} spreadsheetId
 * @param {string} accessToken
 * @returns {Promise<void>}
 * @throws {Error} On API failure.
 */
export async function submitForReview(submission, spreadsheetId, accessToken) {
  const newRow = [
    submission.submission_id,
    submission.student_id,
    submission.item_id,
    new Date().toISOString(),
    'pending',
    '', '', '', '',
  ]

  const resp = await fetch(
    `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(TAB)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [newRow] }),
    }
  )
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(`submitForReview failed (${resp.status}): ${err.error?.message || resp.statusText}`)
  }
}

/**
 * Updates a submission row to mark it as reviewed with a score and feedback.
 * @param {string} submissionId
 * @param {number} score
 * @param {string} feedbackText
 * @param {string|null} feedbackAudioId
 * @param {string} spreadsheetId
 * @param {string} accessToken
 * @returns {Promise<void>}
 * @throws {Error} If submission not found or API fails.
 */
export async function markReviewed(submissionId, score, feedbackText, feedbackAudioId, spreadsheetId, accessToken) {
  const readUrl = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(TAB)}`
  const readResp = await fetch(readUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!readResp.ok) {
    const err = await readResp.json().catch(() => ({}))
    throw new Error(`markReviewed (read) failed (${readResp.status}): ${err.error?.message || readResp.statusText}`)
  }
  const readData = await readResp.json()
  const rows = readData.values || []

  let existingRowIndex = -1
  let existingRow = null
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][COL.submission_id] === submissionId) {
      existingRowIndex = i + 1
      existingRow = rows[i]
      break
    }
  }

  if (existingRowIndex < 0) {
    throw new Error(`markReviewed: submission "${submissionId}" not found in GradingQueue.`)
  }

  const updatedRow = [...existingRow]
  updatedRow[COL.status] = 'reviewed'
  updatedRow[COL.score] = score
  updatedRow[COL.feedback_text] = feedbackText || ''
  updatedRow[COL.feedback_audio_id] = feedbackAudioId || ''
  updatedRow[COL.reviewed_at] = new Date().toISOString()

  const resp = await fetch(`${SHEETS_BASE}/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: [{ range: `${TAB}!A${existingRowIndex}`, values: [updatedRow] }],
    }),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(`markReviewed (update) failed (${resp.status}): ${err.error?.message || resp.statusText}`)
  }
}
