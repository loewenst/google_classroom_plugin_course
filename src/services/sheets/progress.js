/**
 * src/services/sheets/progress.js
 * Google Sheets API service for the Progress tab.
 * Responsible for reading and writing student progress records.
 * Each row represents one student's state for one learning path item.
 */

import { SHEET_NAMES, COLUMNS } from '../../utils/sheetsSchema.js'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const TAB = SHEET_NAMES.PROGRESS
const COL = COLUMNS.PROGRESS

/**
 * Parses a raw sheet row array into a progress object.
 * @param {Array} row
 * @returns {object}
 */
function rowToProgress(row) {
  return {
    student_id: row[COL.student_id] || '',
    item_id: row[COL.item_id] || '',
    status: row[COL.status] || '',
    score: row[COL.score] !== undefined ? Number(row[COL.score]) : null,
    attempts: row[COL.attempts] !== undefined ? Number(row[COL.attempts]) : 0,
    confidence: row[COL.confidence] || '',
    student_note_text: row[COL.student_note_text] || '',
    student_note_audio_id: row[COL.student_note_audio_id] || '',
    updated_at: row[COL.updated_at] || '',
  }
}

/**
 * Fetches all progress rows for a given student from the spreadsheet.
 * @param {string} studentId - The student's user ID (sub from Google token).
 * @param {string} spreadsheetId - Google Sheets spreadsheet ID.
 * @param {string} accessToken - OAuth access token with spreadsheets scope.
 * @returns {Promise<Array<object>>} Array of progress objects for the student.
 * @throws {Error} On API failure.
 */
export async function getStudentProgress(studentId, spreadsheetId, accessToken) {
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(TAB)}`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`getStudentProgress failed (${response.status}): ${err.error?.message || response.statusText}`)
  }
  const data = await response.json()
  const rows = data.values || []
  // Skip header row (index 0), filter to this student
  return rows.slice(1)
    .filter((row) => row[COL.student_id] === studentId)
    .map(rowToProgress)
}

/**
 * Upserts a progress record for a student + item.
 * If a row already exists for (studentId, itemId) it is overwritten;
 * otherwise a new row is appended.
 *
 * @param {string} studentId
 * @param {string} itemId
 * @param {{ status?: string, score?: number, attempts?: number, confidence?: string, student_note_text?: string, student_note_audio_id?: string }} update
 * @param {string} spreadsheetId
 * @param {string} accessToken
 * @returns {Promise<void>}
 * @throws {Error} On API failure.
 */
export async function upsertProgress(studentId, itemId, update, spreadsheetId, accessToken) {
  // Read current sheet to find existing row
  const readUrl = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(TAB)}`
  const readResp = await fetch(readUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!readResp.ok) {
    const err = await readResp.json().catch(() => ({}))
    throw new Error(`upsertProgress (read) failed (${readResp.status}): ${err.error?.message || readResp.statusText}`)
  }
  const readData = await readResp.json()
  const rows = readData.values || []

  const now = new Date().toISOString()

  // Find existing row index (1-based, including header at row 1)
  let existingRowIndex = -1
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][COL.student_id] === studentId && rows[i][COL.item_id] === itemId) {
      existingRowIndex = i + 1 // 1-based sheet row
      break
    }
  }

  const existingRow = existingRowIndex > 0 ? rows[existingRowIndex - 1] : []
  const newRow = [
    studentId,
    itemId,
    update.status ?? existingRow[COL.status] ?? '',
    update.score !== undefined ? update.score : (existingRow[COL.score] ?? ''),
    update.attempts !== undefined ? update.attempts : (existingRow[COL.attempts] ?? 0),
    update.confidence ?? existingRow[COL.confidence] ?? '',
    update.student_note_text ?? existingRow[COL.student_note_text] ?? '',
    update.student_note_audio_id ?? existingRow[COL.student_note_audio_id] ?? '',
    now,
  ]

  if (existingRowIndex > 0) {
    // Update existing row using batchUpdate
    const updateUrl = `${SHEETS_BASE}/${spreadsheetId}/values:batchUpdate`
    const updateResp = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: [{
          range: `${TAB}!A${existingRowIndex}`,
          values: [newRow],
        }],
      }),
    })
    if (!updateResp.ok) {
      const err = await updateResp.json().catch(() => ({}))
      throw new Error(`upsertProgress (update) failed (${updateResp.status}): ${err.error?.message || updateResp.statusText}`)
    }
  } else {
    // Append new row
    const appendUrl = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(TAB)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
    const appendResp = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [newRow] }),
    })
    if (!appendResp.ok) {
      const err = await appendResp.json().catch(() => ({}))
      throw new Error(`upsertProgress (append) failed (${appendResp.status}): ${err.error?.message || appendResp.statusText}`)
    }
  }
}
