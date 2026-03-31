/**
 * src/hooks/useGroups.js
 * Hook for reading and writing student group assignments.
 * Also computes which group the current student belongs to.
 * Exposes: { groups, studentGroup, upsertGroup, loading, error }
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { getGroups, upsertGroup as upsertGroupService, deleteGroup as deleteGroupService } from '../services/sheets/groups.js'

/**
 * Manages group data for a course spreadsheet.
 * @param {string|null} spreadsheetId
 * @param {string|null} [studentId] - If provided, computes studentGroup.
 * @returns {{ groups: Array, studentGroup: object|null, upsertGroup: function, loading: boolean, error: string|null }}
 */
export function useGroups(spreadsheetId, studentId = null) {
  const { accessToken } = useAuth()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!accessToken || !spreadsheetId) return
    setLoading(true)
    setError(null)
    getGroups(spreadsheetId, accessToken)
      .then((data) => setGroups(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [accessToken, spreadsheetId])

  const studentGroup = studentId
    ? groups.find((g) => g.student_ids.includes(studentId)) || null
    : null

  /**
   * Creates or updates a group and refreshes local state.
   * @param {object} group
   * @returns {Promise<void>}
   */
  const upsertGroup = useCallback(
    async (group) => {
      if (!accessToken || !spreadsheetId) {
        throw new Error('upsertGroup: missing accessToken or spreadsheetId.')
      }
      await upsertGroupService(group, spreadsheetId, accessToken)
      setGroups((prev) => {
        const existing = prev.find((g) => g.group_id === group.group_id)
        if (existing) {
          return prev.map((g) => (g.group_id === group.group_id ? { ...g, ...group } : g))
        }
        return [...prev, group]
      })
    },
    [accessToken, spreadsheetId]
  )

  /**
   * Deletes a group and removes it from local state.
   * @param {string} groupId
   * @returns {Promise<void>}
   */
  const deleteGroup = useCallback(
    async (groupId) => {
      if (!accessToken || !spreadsheetId) {
        throw new Error('deleteGroup: missing accessToken or spreadsheetId.')
      }
      await deleteGroupService(groupId, spreadsheetId, accessToken)
      setGroups((prev) => prev.filter((g) => g.group_id !== groupId))
    },
    [accessToken, spreadsheetId]
  )

  return { groups, studentGroup, upsertGroup, deleteGroup, loading, error }
}
