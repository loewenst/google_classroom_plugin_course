/**
 * src/pages/teacher/LearningPathPage.jsx
 * Teacher arranges modules and items into an ordered learning path.
 * Uses PathBuilder for drag-to-reorder. Saves reordered items and inline edits
 * back to the LearningPath sheet.
 */

import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { useCourseConfig } from '../../hooks/useCourseConfig.js'
import { useLearningPath } from '../../hooks/useLearningPath.js'
import { upsertItem } from '../../services/sheets/learningPath.js'
import PathBuilder from '../../components/learningPath/PathBuilder.jsx'
import Spinner from '../../components/common/Spinner.jsx'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

/**
 * Writes a module entry to the Modules tab.
 * @param {object} module
 * @param {string} spreadsheetId
 * @param {string} accessToken
 */
async function upsertModule(module, spreadsheetId, accessToken) {
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/Modules:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
  const row = [module.module_id, module.title, module.description || '', module.order || 0]
  await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [row] }),
  })
}

/**
 * Learning path management page.
 */
export default function LearningPathPage() {
  const { courseId } = useParams()
  const { accessToken } = useAuth()
  const { getConfig } = useCourseConfig()
  const config = getConfig(courseId)
  const spreadsheetId = config?.courseSheetId

  const { modules, loading, error } = useLearningPath(spreadsheetId)

  const allItems = modules.flatMap((m) => m.items)

  /**
   * Persists all reordered items back to the sheet.
   * @param {Array} reorderedItems
   */
  async function handleReorder(reorderedItems) {
    if (!spreadsheetId || !accessToken) return
    // Fire-and-forget batch — errors are non-fatal for UX
    Promise.all(
      reorderedItems.map((item) => upsertItem(item, spreadsheetId, accessToken))
    ).catch((err) => console.error('PathBuilder reorder save failed:', err))
  }

  /**
   * Persists a single updated item.
   * @param {object} item
   */
  async function handleUpdateItem(item) {
    if (!spreadsheetId || !accessToken) return
    upsertItem(item, spreadsheetId, accessToken).catch((err) =>
      console.error('PathBuilder item update failed:', err)
    )
  }

  /**
   * Creates a new module in the sheet.
   * @param {object} moduleData
   */
  async function handleAddModule(moduleData) {
    if (!spreadsheetId || !accessToken) return
    const newModule = { ...moduleData, order: modules.length + 1 }
    upsertModule(newModule, spreadsheetId, accessToken).catch((err) =>
      console.error('PathBuilder add module failed:', err)
    )
  }

  return (
    <div style={{ padding: 'var(--spacing-lg)' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>
        Learning Path
      </h1>

      {!spreadsheetId && (
        <p style={{ color: 'var(--color-warning)' }}>Course not configured. Run course setup first.</p>
      )}

      {loading && <Spinner />}

      {error && (
        <p style={{ color: 'var(--color-danger)' }}>Failed to load learning path: {error}</p>
      )}

      {!loading && !error && spreadsheetId && (
        <PathBuilder
          items={allItems}
          modules={modules}
          onReorder={handleReorder}
          onUpdateItem={handleUpdateItem}
          onAddModule={handleAddModule}
        />
      )}
    </div>
  )
}
