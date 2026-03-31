/**
 * src/services/sheets/learningPath.js
 * Google Sheets API service for the LearningPath tab.
 * Responsible for reading the ordered list of content items and writing
 * item configuration changes made in the PathBuilder.
 */

import { SHEET_NAMES, COLUMNS } from '../../utils/sheetsSchema.js'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const TAB = SHEET_NAMES.LEARNING_PATH
const COL = COLUMNS.LEARNING_PATH

/**
 * Parses a raw sheet row into a learning path item object.
 * @param {Array} row
 * @returns {object}
 */
function rowToItem(row) {
  return {
    item_id: row[COL.item_id] || '',
    module_id: row[COL.module_id] || '',
    type: row[COL.type] || '',
    title: row[COL.title] || '',
    drive_file_id: row[COL.drive_file_id] || '',
    order: row[COL.order] !== undefined ? Number(row[COL.order]) : 0,
    estimated_minutes: row[COL.estimated_minutes] ? Number(row[COL.estimated_minutes]) : null,
    due_date: row[COL.due_date] || '',
    teacher_note: row[COL.teacher_note] || '',
    pass_threshold: row[COL.pass_threshold] ? Number(row[COL.pass_threshold]) : 70,
    retake_limit: row[COL.retake_limit] ? Number(row[COL.retake_limit]) : null,
    score_policy: row[COL.score_policy] || 'highest',
    checkpoint_slides: row[COL.checkpoint_slides] || '',
  }
}

/**
 * Fetches and structures the learning path into modules with nested items.
 * Also reads the Modules tab to get module metadata.
 *
 * @param {string} spreadsheetId
 * @param {string} accessToken
 * @returns {Promise<Array<{ module_id: string, title: string, items: Array }>>}
 * @throws {Error} On API failure.
 */
export async function getLearningPath(spreadsheetId, accessToken) {
  // Fetch both tabs in parallel
  const [pathResp, modulesResp] = await Promise.all([
    fetch(`${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(TAB)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    fetch(`${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(SHEET_NAMES.MODULES)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => null), // Modules tab is optional
  ])

  if (!pathResp.ok) {
    const err = await pathResp.json().catch(() => ({}))
    throw new Error(`getLearningPath failed (${pathResp.status}): ${err.error?.message || pathResp.statusText}`)
  }

  const pathData = await pathResp.json()
  const pathRows = (pathData.values || []).slice(1) // skip header
  const items = pathRows.filter((r) => r[COL.item_id]).map(rowToItem)

  // Build module map
  const moduleMap = {}
  if (modulesResp && modulesResp.ok) {
    const modData = await modulesResp.json()
    const modRows = (modData.values || []).slice(1)
    const modCol = COLUMNS.MODULES
    modRows.forEach((row) => {
      if (row[modCol.module_id]) {
        moduleMap[row[modCol.module_id]] = {
          module_id: row[modCol.module_id],
          title: row[modCol.title] || '',
          description: row[modCol.description] || '',
          order: row[modCol.order] ? Number(row[modCol.order]) : 0,
          items: [],
        }
      }
    })
  }

  // Group items by module
  items.sort((a, b) => a.order - b.order)
  items.forEach((item) => {
    if (!moduleMap[item.module_id]) {
      moduleMap[item.module_id] = { module_id: item.module_id, title: item.module_id, order: 0, items: [] }
    }
    moduleMap[item.module_id].items.push(item)
  })

  return Object.values(moduleMap).sort((a, b) => a.order - b.order)
}

/**
 * Creates or updates a learning path item row in the sheet.
 * Matches on item_id; appends if not found.
 *
 * @param {object} item - Full item object (all LEARNING_PATH columns).
 * @param {string} spreadsheetId
 * @param {string} accessToken
 * @returns {Promise<void>}
 * @throws {Error} On API failure.
 */
export async function upsertItem(item, spreadsheetId, accessToken) {
  const readUrl = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(TAB)}`
  const readResp = await fetch(readUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!readResp.ok) {
    const err = await readResp.json().catch(() => ({}))
    throw new Error(`upsertItem (read) failed (${readResp.status}): ${err.error?.message || readResp.statusText}`)
  }
  const readData = await readResp.json()
  const rows = readData.values || []

  const newRow = [
    item.item_id, item.module_id, item.type, item.title, item.drive_file_id,
    item.order, item.estimated_minutes ?? '', item.due_date ?? '',
    item.teacher_note ?? '', item.pass_threshold ?? 70, item.retake_limit ?? '',
    item.score_policy ?? 'highest', item.checkpoint_slides ?? '',
  ]

  let existingRowIndex = -1
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][COL.item_id] === item.item_id) {
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
      throw new Error(`upsertItem (update) failed (${resp.status}): ${err.error?.message || resp.statusText}`)
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
      throw new Error(`upsertItem (append) failed (${resp.status}): ${err.error?.message || resp.statusText}`)
    }
  }
}

// Re-export for use in other modules
import { SHEET_NAMES as NAMES } from '../../utils/sheetsSchema.js'
const { MODULES: _MODULES } = NAMES
