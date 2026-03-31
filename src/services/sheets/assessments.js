/**
 * src/services/sheets/assessments.js
 * Google Sheets API service for the Assessments tab.
 * Responsible for reading and writing assessment configurations (question type,
 * options, correct answers) stored as JSON in the config column.
 */

import { SHEET_NAMES, COLUMNS } from '../../utils/sheetsSchema.js'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const TAB = SHEET_NAMES.ASSESSMENTS
const COL = COLUMNS.ASSESSMENTS

/**
 * Parses a raw sheet row into an assessment object. Decodes the config JSON column.
 * @param {Array} row
 * @returns {object}
 */
function rowToAssessment(row) {
  let config = {}
  try {
    config = JSON.parse(row[COL.config] || '{}')
  } catch {
    config = {}
  }
  return {
    assessment_id: row[COL.assessment_id] || '',
    type: row[COL.type] || '',
    title: row[COL.title] || '',
    config,
  }
}

/**
 * Fetches a single assessment by its ID from the Assessments tab.
 * @param {string} assessmentId
 * @param {string} spreadsheetId
 * @param {string} accessToken
 * @returns {Promise<object>} The assessment object with parsed config.
 * @throws {Error} If the assessment is not found or the API fails.
 */
export async function getAssessment(assessmentId, spreadsheetId, accessToken) {
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(TAB)}`
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`getAssessment failed (${response.status}): ${err.error?.message || response.statusText}`)
  }
  const data = await response.json()
  const rows = (data.values || []).slice(1)
  const row = rows.find((r) => r[COL.assessment_id] === assessmentId)
  if (!row) {
    throw new Error(`getAssessment: assessment "${assessmentId}" not found in spreadsheet.`)
  }
  return rowToAssessment(row)
}

/**
 * Creates or updates an assessment row. Serializes config to JSON.
 * @param {object} assessment - Must include assessment_id, type, title, config.
 * @param {string} spreadsheetId
 * @param {string} accessToken
 * @returns {Promise<void>}
 * @throws {Error} On API failure.
 */
export async function upsertAssessment(assessment, spreadsheetId, accessToken) {
  const readUrl = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(TAB)}`
  const readResp = await fetch(readUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!readResp.ok) {
    const err = await readResp.json().catch(() => ({}))
    throw new Error(`upsertAssessment (read) failed (${readResp.status}): ${err.error?.message || readResp.statusText}`)
  }
  const readData = await readResp.json()
  const rows = readData.values || []

  const newRow = [
    assessment.assessment_id,
    assessment.type,
    assessment.title,
    JSON.stringify(assessment.config || {}),
  ]

  let existingRowIndex = -1
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][COL.assessment_id] === assessment.assessment_id) {
      existingRowIndex = i + 1
      break
    }
  }

  if (existingRowIndex > 0) {
    const updateUrl = `${SHEETS_BASE}/${spreadsheetId}/values:batchUpdate`
    const resp = await fetch(updateUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: [{ range: `${TAB}!A${existingRowIndex}`, values: [newRow] }],
      }),
    })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      throw new Error(`upsertAssessment (update) failed (${resp.status}): ${err.error?.message || resp.statusText}`)
    }
  } else {
    const appendUrl = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(TAB)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
    const resp = await fetch(appendUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [newRow] }),
    })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      throw new Error(`upsertAssessment (append) failed (${resp.status}): ${err.error?.message || resp.statusText}`)
    }
  }
}
