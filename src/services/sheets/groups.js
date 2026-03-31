/**
 * src/services/sheets/groups.js
 * Google Sheets API service for the Groups tab.
 * Responsible for reading and writing student group assignments.
 * student_ids is stored as a comma-separated string in the sheet.
 */

import { SHEET_NAMES, COLUMNS } from '../../utils/sheetsSchema.js'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const TAB = SHEET_NAMES.GROUPS
const COL = COLUMNS.GROUPS

/**
 * Parses a raw row into a group object. Splits student_ids CSV into an array.
 * @param {Array} row
 * @returns {object}
 */
function rowToGroup(row) {
  return {
    group_id: row[COL.group_id] || '',
    name: row[COL.name] || '',
    student_ids: (row[COL.student_ids] || '').split(',').map((s) => s.trim()).filter(Boolean),
    color: row[COL.color] || '',
  }
}

/**
 * Fetches all groups from the Groups tab.
 * @param {string} spreadsheetId
 * @param {string} accessToken
 * @returns {Promise<Array<object>>}
 * @throws {Error} On API failure.
 */
export async function getGroups(spreadsheetId, accessToken) {
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(TAB)}`
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`getGroups failed (${response.status}): ${err.error?.message || response.statusText}`)
  }
  const data = await response.json()
  return (data.values || []).slice(1).filter((r) => r[COL.group_id]).map(rowToGroup)
}

/**
 * Deletes a group row by overwriting it with empty values.
 * getGroups filters rows where group_id is empty, so the row disappears.
 * @param {string} groupId
 * @param {string} spreadsheetId
 * @param {string} accessToken
 * @returns {Promise<void>}
 * @throws {Error} On API failure or group not found.
 */
export async function deleteGroup(groupId, spreadsheetId, accessToken) {
  const readUrl = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(TAB)}`
  const readResp = await fetch(readUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!readResp.ok) {
    const err = await readResp.json().catch(() => ({}))
    throw new Error(`deleteGroup (read) failed (${readResp.status}): ${err.error?.message || readResp.statusText}`)
  }
  const readData = await readResp.json()
  const rows = readData.values || []

  let rowIndex = -1
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][COL.group_id] === groupId) {
      rowIndex = i + 1 // 1-based sheet row
      break
    }
  }
  if (rowIndex === -1) {
    throw new Error(`deleteGroup: group ${groupId} not found.`)
  }

  const resp = await fetch(`${SHEETS_BASE}/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: [{ range: `${TAB}!A${rowIndex}:D${rowIndex}`, values: [['', '', '', '']] }],
    }),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(`deleteGroup (clear) failed (${resp.status}): ${err.error?.message || resp.statusText}`)
  }
}

/**
 * Creates or updates a group row. Joins student_ids array to CSV.
 * @param {object} group - Must include group_id, name, student_ids (array), color.
 * @param {string} spreadsheetId
 * @param {string} accessToken
 * @returns {Promise<void>}
 * @throws {Error} On API failure.
 */
export async function upsertGroup(group, spreadsheetId, accessToken) {
  const readUrl = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(TAB)}`
  const readResp = await fetch(readUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!readResp.ok) {
    const err = await readResp.json().catch(() => ({}))
    throw new Error(`upsertGroup (read) failed (${readResp.status}): ${err.error?.message || readResp.statusText}`)
  }
  const readData = await readResp.json()
  const rows = readData.values || []

  const studentIdsCsv = Array.isArray(group.student_ids) ? group.student_ids.join(',') : (group.student_ids || '')
  const newRow = [group.group_id, group.name, studentIdsCsv, group.color || '']

  let existingRowIndex = -1
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][COL.group_id] === group.group_id) {
      existingRowIndex = i + 1
      break
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
      throw new Error(`upsertGroup (update) failed (${resp.status}): ${err.error?.message || resp.statusText}`)
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
      throw new Error(`upsertGroup (append) failed (${resp.status}): ${err.error?.message || resp.statusText}`)
    }
  }
}
