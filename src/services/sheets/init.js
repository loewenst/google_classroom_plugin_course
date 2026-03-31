/**
 * src/services/sheets/init.js
 * Spreadsheet initialization service.
 * Creates new Google Sheets spreadsheets with the correct tabs and header rows
 * for course data (public) and answer keys (private).
 * Components must NOT import this file directly — use hooks instead.
 */

import { SHEET_NAMES, SHEET_HEADERS } from '../../utils/sheetsSchema.js'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

/**
 * Builds a sheet object for the Sheets API create request.
 * @param {string} title - Tab name.
 * @param {number} index - Tab order index.
 * @returns {object}
 */
function makeSheetSpec(title, index) {
  return {
    properties: {
      title,
      index,
      gridProperties: { rowCount: 1000, columnCount: 26 },
    },
  }
}

/**
 * Creates a Google Sheets spreadsheet and writes header rows to each tab.
 * Includes all course tabs: MODULES, LEARNING_PATH, ASSESSMENTS, PROGRESS,
 * GROUPS, GLOSSARY, GRADING_QUEUE.
 *
 * @param {string} title - Spreadsheet display title.
 * @param {string} accessToken - OAuth access token with spreadsheets scope.
 * @returns {Promise<{ spreadsheetId: string }>}
 * @throws {Error} On API failure.
 */
export async function createSpreadsheet(title, accessToken) {
  const tabs = [
    SHEET_NAMES.MODULES,
    SHEET_NAMES.LEARNING_PATH,
    SHEET_NAMES.ASSESSMENTS,
    SHEET_NAMES.PROGRESS,
    SHEET_NAMES.GROUPS,
    SHEET_NAMES.GLOSSARY,
    SHEET_NAMES.GRADING_QUEUE,
  ]

  const createResp = await fetch(SHEETS_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: tabs.map((name, idx) => makeSheetSpec(name, idx)),
    }),
  })

  if (!createResp.ok) {
    const err = await createResp.json().catch(() => ({}))
    throw new Error(`createSpreadsheet failed (${createResp.status}): ${err.error?.message || createResp.statusText}`)
  }

  const data = await createResp.json()
  const spreadsheetId = data.spreadsheetId

  // Write header rows using batchUpdate values API
  const headerData = [
    { range: `${SHEET_NAMES.MODULES}!A1`, values: [SHEET_HEADERS.MODULES] },
    { range: `${SHEET_NAMES.LEARNING_PATH}!A1`, values: [SHEET_HEADERS.LEARNING_PATH] },
    { range: `${SHEET_NAMES.ASSESSMENTS}!A1`, values: [SHEET_HEADERS.ASSESSMENTS] },
    { range: `${SHEET_NAMES.PROGRESS}!A1`, values: [SHEET_HEADERS.PROGRESS] },
    { range: `${SHEET_NAMES.GROUPS}!A1`, values: [SHEET_HEADERS.GROUPS] },
    { range: `${SHEET_NAMES.GLOSSARY}!A1`, values: [SHEET_HEADERS.GLOSSARY] },
    { range: `${SHEET_NAMES.GRADING_QUEUE}!A1`, values: [SHEET_HEADERS.GRADING_QUEUE] },
  ]

  const batchResp = await fetch(`${SHEETS_BASE}/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: headerData,
    }),
  })

  if (!batchResp.ok) {
    const err = await batchResp.json().catch(() => ({}))
    throw new Error(`createSpreadsheet (write headers) failed (${batchResp.status}): ${err.error?.message || batchResp.statusText}`)
  }

  return { spreadsheetId }
}

/**
 * Creates a private Google Sheets spreadsheet with only the ANSWER_KEYS tab.
 * This spreadsheet is shared only with the teacher and the service account.
 *
 * @param {string} title - Spreadsheet display title.
 * @param {string} accessToken - OAuth access token with spreadsheets scope.
 * @returns {Promise<{ spreadsheetId: string }>}
 * @throws {Error} On API failure.
 */
export async function createPrivateSpreadsheet(title, accessToken) {
  const createResp = await fetch(SHEETS_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [makeSheetSpec(SHEET_NAMES.ANSWER_KEYS, 0)],
    }),
  })

  if (!createResp.ok) {
    const err = await createResp.json().catch(() => ({}))
    throw new Error(`createPrivateSpreadsheet failed (${createResp.status}): ${err.error?.message || createResp.statusText}`)
  }

  const data = await createResp.json()
  const spreadsheetId = data.spreadsheetId

  const batchResp = await fetch(`${SHEETS_BASE}/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: [{ range: `${SHEET_NAMES.ANSWER_KEYS}!A1`, values: [SHEET_HEADERS.ANSWER_KEYS] }],
    }),
  })

  if (!batchResp.ok) {
    const err = await batchResp.json().catch(() => ({}))
    throw new Error(`createPrivateSpreadsheet (write headers) failed (${batchResp.status}): ${err.error?.message || batchResp.statusText}`)
  }

  return { spreadsheetId }
}
