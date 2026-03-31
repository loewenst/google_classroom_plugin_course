/**
 * src/hooks/useLearningPath.js
 * Hook for fetching and structuring the learning path for a course.
 * Computes locked/unlocked state for each item based on student progress.
 * Exposes: { modules, getItemStatus, loading, error }
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { getLearningPath } from '../services/sheets/learningPath.js'

/**
 * Determines the lock status of a given item given the student's progress map.
 * An item is unlocked if it's the first item in the path, or if the prerequisite
 * item (the item with order - 1 in the same module) has been completed at or
 * above its pass_threshold.
 *
 * @param {object} item - The learning path item.
 * @param {Array} allItems - All items in the learning path (flat).
 * @param {Map<string, object>} progressMap - Map of item_id → progress object.
 * @returns {{ locked: boolean, reason: string|null }}
 */
function computeItemStatus(item, allItems, progressMap) {
  const sorted = [...allItems].sort((a, b) => a.order - b.order)
  const idx = sorted.findIndex((i) => i.item_id === item.item_id)

  if (idx <= 0) {
    return { locked: false, reason: null }
  }

  const prereq = sorted[idx - 1]
  const prereqProgress = progressMap.get(prereq.item_id)
  const threshold = prereq.pass_threshold ?? 70

  if (!prereqProgress || prereqProgress.status !== 'completed') {
    return {
      locked: true,
      reason: `Complete "${prereq.title}" to unlock this item.`,
    }
  }

  const score = prereqProgress.score ?? 0
  if (score < threshold) {
    return {
      locked: true,
      reason: `Complete "${prereq.title}" with ${threshold}% to unlock this item. (Current: ${score}%)`,
    }
  }

  return { locked: false, reason: null }
}

/**
 * Fetches the course learning path and computes item lock states.
 * @param {string|null} spreadsheetId - The course spreadsheet ID.
 * @param {Array} [progressData=[]] - Array of student progress objects from useProgress.
 * @returns {{ modules: Array, getItemStatus: function, loading: boolean, error: string|null }}
 */
export function useLearningPath(spreadsheetId, progressData = []) {
  const { accessToken } = useAuth()
  const [modules, setModules] = useState([])
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const progressMap = new Map(progressData.map((p) => [p.item_id, p]))

  useEffect(() => {
    if (!accessToken || !spreadsheetId) return
    setLoading(true)
    setError(null)
    getLearningPath(spreadsheetId, accessToken)
      .then((mods) => {
        setModules(mods)
        const flat = mods.flatMap((m) => m.items)
        setAllItems(flat)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [accessToken, spreadsheetId])

  /**
   * Returns the lock status for a given item_id.
   * @param {string} itemId
   * @returns {{ locked: boolean, reason: string|null }}
   */
  const getItemStatus = useCallback(
    (itemId) => {
      const item = allItems.find((i) => i.item_id === itemId)
      if (!item) return { locked: false, reason: null }
      return computeItemStatus(item, allItems, progressMap)
    },
    [allItems, progressMap]
  )

  return { modules, getItemStatus, loading, error }
}
