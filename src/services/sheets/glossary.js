/**
 * src/services/sheets/glossary.js
 * Google Sheets API service for the Glossary tab.
 * Responsible for reading and writing course glossary terms and definitions.
 */

import { SHEET_NAMES, COLUMNS } from '../../utils/sheetsSchema.js'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const TAB = SHEET_NAMES.GLOSSARY
const COL = COLUMNS.GLOSSARY

/**
 * Parses a raw row into a glossary entry object.
 * @param {Array} row
 * @returns {object}
 */
function rowToTerm(row) {
  return {
    term_id: row[COL.term_id] || '',
    term: row[COL.term] || '',
    definition: row[COL.definition] || '',
    module_id: row[COL.module_id] || '',
  }
}

/**
 * Fetches all glossary terms from the Glossary tab.
 * @param {string} spreadsheetId
 * @param {string} accessToken
 * @returns {Promise<Array<object>>}
 * @throws {Error} On API failure.
 */
export async function getGlossaryTerms(spreadsheetId, accessToken) {
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(TAB)}`
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`getGlossaryTerms failed (${response.status}): ${err.error?.message || response.statusText}`)
  }
  const data = await response.json()
  return (data.values || []).slice(1).filter((r) => r[COL.term_id]).map(rowToTerm)
}

/**
 * Creates or updates a glossary term. Matches on term_id; appends if not found.
 * @param {string} term - The glossary term text.
 * @param {string} definition - The definition text.
 * @param {string} spreadsheetId
 * @param {string} accessToken
 * @param {{ term_id?: string, module_id?: string }} [options] - Optional ID and module association.
 * @returns {Promise<void>}
 * @throws {Error} On API failure.
 */
export async function upsertTerm(term, definition, spreadsheetId, accessToken, options = {}) {
  const readUrl = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(TAB)}`
  const readResp = await fetch(readUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!readResp.ok) {
    const err = await readResp.json().catch(() => ({}))
    throw new Error(`upsertTerm (read) failed (${readResp.status}): ${err.error?.message || readResp.statusText}`)
  }
  const readData = await readResp.json()
  const rows = readData.values || []

  const termId = options.term_id || `term_${Date.now()}`
  const newRow = [termId, term, definition, options.module_id || '']

  let existingRowIndex = -1
  if (options.term_id) {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][COL.term_id] === options.term_id) {
        existingRowIndex = i + 1
        break
      }
    }
  }

  if (existingRowIndex > 0) {
    const resp = await fetch(`${SHEETS_BASE}/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: [{ range: `${TAB}!A${existingRowIndex}`, values: [newRow] }],
      }),
    })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      throw new Error(`upsertTerm (update) failed (${resp.status}): ${err.error?.message || resp.statusText}`)
    }
  } else {
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
      throw new Error(`upsertTerm (append) failed (${resp.status}): ${err.error?.message || resp.statusText}`)
    }
  }
}
