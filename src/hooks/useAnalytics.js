/**
 * src/hooks/useAnalytics.js
 * Hook for computing per-item analytics from all student progress records.
 * Reads all rows from the Progress tab, computes pass rates and average scores,
 * and identifies bottleneck items (items with low pass rates).
 * Exposes: { itemStats, bottlenecks, loading, error }
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { SHEET_NAMES, COLUMNS } from '../utils/sheetsSchema.js'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const COL = COLUMNS.PROGRESS
const BOTTLENECK_THRESHOLD = 0.6 // items with < 60% pass rate are bottlenecks

/**
 * Fetches all progress rows directly (not filtered by student) for analytics.
 * @param {string} spreadsheetId
 * @param {string} accessToken
 * @returns {Promise<Array>}
 */
async function getAllProgress(spreadsheetId, accessToken) {
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(SHEET_NAMES.PROGRESS)}`
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(`useAnalytics (fetch) failed (${resp.status}): ${err.error?.message || resp.statusText}`)
  }
  const data = await resp.json()
  return (data.values || []).slice(1) // skip header
}

/**
 * Computes per-item pass rates, average scores, and attempt counts.
 * @param {Array} rows - Raw progress rows.
 * @returns {{ itemStats: Map<string, object>, bottlenecks: Array<string> }}
 */
function computeStats(rows) {
  const statsMap = new Map()

  for (const row of rows) {
    const itemId = row[COL.item_id]
    if (!itemId) continue
    const score = row[COL.score] !== undefined ? Number(row[COL.score]) : null
    const status = row[COL.status] || ''
    const attempts = row[COL.attempts] ? Number(row[COL.attempts]) : 0

    if (!statsMap.has(itemId)) {
      statsMap.set(itemId, { item_id: itemId, total: 0, passed: 0, scoreSum: 0, scoreCount: 0, totalAttempts: 0 })
    }
    const s = statsMap.get(itemId)
    s.total++
    if (status === 'completed') s.passed++
    if (score !== null) {
      s.scoreSum += score
      s.scoreCount++
    }
    s.totalAttempts += attempts
  }

  // Convert to final shape
  const itemStats = new Map()
  for (const [itemId, s] of statsMap.entries()) {
    itemStats.set(itemId, {
      item_id: itemId,
      passRate: s.total > 0 ? s.passed / s.total : 0,
      avgScore: s.scoreCount > 0 ? Math.round(s.scoreSum / s.scoreCount) : null,
      totalStudents: s.total,
      totalAttempts: s.totalAttempts,
    })
  }

  const bottlenecks = [...itemStats.values()]
    .filter((s) => s.passRate < BOTTLENECK_THRESHOLD && s.totalStudents >= 3)
    .map((s) => s.item_id)

  return { itemStats, bottlenecks }
}

/**
 * Computes analytics from all student progress for a course.
 * @param {string|null} spreadsheetId
 * @returns {{ itemStats: Map, bottlenecks: Array<string>, loading: boolean, error: string|null }}
 */
export function useAnalytics(spreadsheetId) {
  const { accessToken } = useAuth()
  const [itemStats, setItemStats] = useState(new Map())
  const [bottlenecks, setBottlenecks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!accessToken || !spreadsheetId) return
    setLoading(true)
    setError(null)
    getAllProgress(spreadsheetId, accessToken)
      .then((rows) => {
        const { itemStats: stats, bottlenecks: bns } = computeStats(rows)
        setItemStats(stats)
        setBottlenecks(bns)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [accessToken, spreadsheetId])

  return { itemStats, bottlenecks, loading, error }
}
