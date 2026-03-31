/**
 * src/pages/teacher/ProgressOverview.jsx
 * All-students-at-a-glance grid. Rows are students, columns are learning path
 * items. Each cell shows status and is colored by score if completed.
 */

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { useCourseConfig } from '../../hooks/useCourseConfig.js'
import { useLearningPath } from '../../hooks/useLearningPath.js'
import Spinner from '../../components/common/Spinner.jsx'
import { SHEET_NAMES, COLUMNS } from '../../utils/sheetsSchema.js'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const COL = COLUMNS.PROGRESS

/**
 * Fetches all progress rows (all students) from the Progress tab.
 * @param {string} spreadsheetId
 * @param {string} accessToken
 * @returns {Promise<Array>}
 */
async function getAllProgressRows(spreadsheetId, accessToken) {
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(SHEET_NAMES.PROGRESS)}`
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!resp.ok) throw new Error(`getAllProgressRows failed (${resp.status})`)
  const data = await resp.json()
  return (data.values || []).slice(1).filter((r) => r[COL.student_id]).map((r) => ({
    student_id: r[COL.student_id] || '',
    item_id: r[COL.item_id] || '',
    status: r[COL.status] || '',
    score: r[COL.score] !== undefined ? Number(r[COL.score]) : null,
  }))
}

/**
 * Returns background color for a cell based on score.
 * @param {object|null} progress
 * @returns {string}
 */
function cellColor(progress) {
  if (!progress || !progress.status) return 'var(--color-surface)'
  if (progress.status === 'completed') {
    const score = progress.score ?? 0
    if (score >= 80) return '#d4edda'
    if (score >= 60) return '#fff3cd'
    return '#f8d7da'
  }
  if (progress.status === 'in_progress') return 'var(--color-primary-light)'
  return 'var(--color-surface)'
}

/**
 * Returns a status icon for a cell.
 * @param {object|null} progress
 * @returns {string}
 */
function cellIcon(progress) {
  if (!progress || !progress.status) return '○'
  if (progress.status === 'completed') return '✓'
  if (progress.status === 'in_progress') return '▶'
  if (progress.status === 'locked') return '🔒'
  return '○'
}

/**
 * Progress overview page.
 */
export default function ProgressOverview() {
  const { courseId } = useParams()
  const { accessToken } = useAuth()
  const { getConfig } = useCourseConfig()
  const config = getConfig(courseId)
  const spreadsheetId = config?.courseSheetId

  const { modules, loading: pathLoading } = useLearningPath(spreadsheetId)
  const [progressRows, setProgressRows] = useState([])
  const [loadingProgress, setLoadingProgress] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!spreadsheetId || !accessToken) return
    setLoadingProgress(true)
    getAllProgressRows(spreadsheetId, accessToken)
      .then(setProgressRows)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingProgress(false))
  }, [spreadsheetId, accessToken])

  const allItems = modules.flatMap((m) => m.items)
  const studentIds = [...new Set(progressRows.map((r) => r.student_id))]

  // Build a map: student_id → item_id → progress
  const progressMap = new Map()
  for (const row of progressRows) {
    if (!progressMap.has(row.student_id)) progressMap.set(row.student_id, new Map())
    progressMap.get(row.student_id).set(row.item_id, row)
  }

  const loading = pathLoading || loadingProgress

  return (
    <div style={{ padding: 'var(--spacing-lg)' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>
        Student Progress
      </h1>

      {!spreadsheetId && (
        <p style={{ color: 'var(--color-warning)' }}>Course not configured. Run course setup first.</p>
      )}

      {loading && <Spinner />}
      {error && <p style={{ color: 'var(--color-danger)' }}>Failed to load progress: {error}</p>}

      {!loading && studentIds.length > 0 && allItems.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap' }}>
            <thead>
              <tr>
                <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid var(--color-border)', background: 'var(--color-surface)', position: 'sticky', left: 0, zIndex: 1 }}>
                  Student
                </th>
                {allItems.map((item) => (
                  <th
                    key={item.item_id}
                    title={item.title}
                    style={{ padding: '8px 12px', borderBottom: '2px solid var(--color-border)', textAlign: 'center', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', background: 'var(--color-surface)' }}
                  >
                    {item.title.length > 12 ? item.title.slice(0, 12) + '…' : item.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studentIds.map((studentId) => {
                const studentProgress = progressMap.get(studentId) || new Map()
                return (
                  <tr key={studentId}>
                    <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--color-border)', fontWeight: 600, position: 'sticky', left: 0, background: 'var(--color-surface)', zIndex: 1 }}>
                      {studentId}
                    </td>
                    {allItems.map((item) => {
                      const prog = studentProgress.get(item.item_id) || null
                      return (
                        <td
                          key={item.item_id}
                          title={prog ? `Score: ${prog.score ?? '—'} Status: ${prog.status}` : 'Not started'}
                          style={{
                            padding: '6px 12px',
                            borderBottom: '1px solid var(--color-border)',
                            textAlign: 'center',
                            background: cellColor(prog),
                          }}
                        >
                          {cellIcon(prog)}
                          {prog?.score != null && prog.status === 'completed' && (
                            <span style={{ marginLeft: 2, fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                              {prog.score}%
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && studentIds.length === 0 && spreadsheetId && (
        <p style={{ color: 'var(--color-text-secondary)' }}>No student progress data yet.</p>
      )}
    </div>
  )
}
