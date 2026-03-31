/**
 * cloud-function/sheets.js
 * Google Sheets API operations for the Cloud Function.
 * Uses service account credentials — never the student's OAuth token.
 * Responsible for: reading answer keys, reading/writing progress rows.
 */

const { google } = require('googleapis')
const { SHEET_NAMES, COLUMNS } = require('./sheetsSchema.js')

/**
 * Builds an authenticated Sheets API client using the service account key
 * stored in the GOOGLE_SERVICE_ACCOUNT_KEY environment variable.
 * @returns {import('googleapis').sheets_v4.Sheets}
 */
function getSheetsClient() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set.')

  const credentials = JSON.parse(keyJson)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

/**
 * Reads all rows from a named sheet tab.
 * @param {string} spreadsheetId
 * @param {string} tabName
 * @returns {Promise<string[][]>} rows (excluding header row)
 */
async function readTab(spreadsheetId, tabName) {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: tabName,
  })
  const rows = res.data.values || []
  return rows.slice(1) // strip header row
}

/**
 * Appends a row to a named sheet tab.
 * @param {string} spreadsheetId
 * @param {string} tabName
 * @param {string[]} rowValues
 */
async function appendRow(spreadsheetId, tabName, rowValues) {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: tabName,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [rowValues] },
  })
}

/**
 * Overwrites a specific row by 1-based row index.
 * @param {string} spreadsheetId
 * @param {string} tabName
 * @param {number} rowIndex  1-based (row 1 = header)
 * @param {string[]} rowValues
 */
async function updateRow(spreadsheetId, tabName, rowIndex, rowValues) {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [rowValues] },
  })
}

// ─── Domain operations ────────────────────────────────────────────────────────

/**
 * Retrieves the answer key for an assessment from the AnswerKeys tab.
 * @param {string} assessmentId
 * @param {string} spreadsheetId  the private (teacher-only) spreadsheet
 * @returns {Promise<Object>} parsed answers object
 * @throws {Error} if no answer key is found for this assessment
 */
async function getAnswerKey(assessmentId, spreadsheetId) {
  const rows = await readTab(spreadsheetId, SHEET_NAMES.ANSWER_KEYS)
  const row = rows.find(r => r[COLUMNS.ANSWER_KEYS.assessment_id] === assessmentId)
  if (!row) throw new Error(`No answer key found for assessment: ${assessmentId}`)
  return JSON.parse(row[COLUMNS.ANSWER_KEYS.answers_json])
}

/**
 * Fetches all progress rows for a student in a course.
 * @param {string} studentId   Google sub (user ID)
 * @param {string} spreadsheetId
 * @returns {Promise<Array<{ itemId, status, score, attempts }>>}
 */
async function getStudentProgress(studentId, spreadsheetId) {
  const rows = await readTab(spreadsheetId, SHEET_NAMES.PROGRESS)
  const C = COLUMNS.PROGRESS
  return rows
    .filter(r => r[C.student_id] === studentId)
    .map(r => ({
      itemId: r[C.item_id],
      status: r[C.status],
      score: r[C.score] !== '' ? Number(r[C.score]) : null,
      attempts: Number(r[C.attempts] || 0),
    }))
}

/**
 * Writes or updates a student's progress row for an item.
 * Finds an existing row by (studentId, itemId) and updates it; appends if not found.
 * @param {string} studentId
 * @param {string} itemId
 * @param {number} score
 * @param {string} spreadsheetId
 */
async function writeProgress(studentId, itemId, score, spreadsheetId) {
  const sheets = getSheetsClient()
  const C = COLUMNS.PROGRESS

  // Read all rows to find existing entry
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: SHEET_NAMES.PROGRESS,
  })
  const allRows = res.data.values || []

  // Find row index (1-based; row 1 = header, data starts at row 2)
  const dataRows = allRows.slice(1)
  const existingIdx = dataRows.findIndex(
    r => r[C.student_id] === studentId && r[C.item_id] === itemId
  )

  const attempts = existingIdx >= 0 ? Number(dataRows[existingIdx][C.attempts] || 0) + 1 : 1
  const status = 'complete'
  const updatedAt = new Date().toISOString()

  const rowValues = Array(Object.keys(C).length).fill('')
  rowValues[C.student_id] = studentId
  rowValues[C.item_id] = itemId
  rowValues[C.status] = status
  rowValues[C.score] = String(score)
  rowValues[C.attempts] = String(attempts)
  rowValues[C.updated_at] = updatedAt

  if (existingIdx >= 0) {
    // +2: +1 for header row, +1 for 1-based index
    await updateRow(spreadsheetId, SHEET_NAMES.PROGRESS, existingIdx + 2, rowValues)
  } else {
    await appendRow(spreadsheetId, SHEET_NAMES.PROGRESS, rowValues)
  }
}

/**
 * Fetches a single learning path item row by itemId.
 * @param {string} itemId
 * @param {string} spreadsheetId
 * @returns {Promise<string[]>} raw row array
 * @throws {Error} if item not found
 */
async function getLearningPathItem(itemId, spreadsheetId) {
  const rows = await readTab(spreadsheetId, SHEET_NAMES.LEARNING_PATH)
  const row = rows.find(r => r[COLUMNS.LEARNING_PATH.item_id] === itemId)
  if (!row) throw new Error(`Learning path item not found: ${itemId}`)
  return row
}

module.exports = { getAnswerKey, getStudentProgress, writeProgress, getLearningPathItem }
