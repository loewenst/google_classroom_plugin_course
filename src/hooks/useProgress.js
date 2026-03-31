/**
 * src/hooks/useProgress.js
 * Hook for reading and writing student progress records.
 * Caches progress in state; updateProgress writes to Sheets and updates cache.
 * Exposes: { progress, updateProgress, loading, error }
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { getStudentProgress, upsertProgress } from '../services/sheets/progress.js'

/**
 * Manages student progress for a course spreadsheet.
 * @param {string|null} studentId - The student's user ID (from auth user.sub).
 * @param {string|null} spreadsheetId - The course spreadsheet ID.
 * @returns {{ progress: Array, updateProgress: function, loading: boolean, error: string|null }}
 */
export function useProgress(studentId, spreadsheetId) {
  const { accessToken } = useAuth()
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!accessToken || !studentId || !spreadsheetId) return
    setLoading(true)
    setError(null)
    getStudentProgress(studentId, spreadsheetId, accessToken)
      .then((data) => setProgress(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [accessToken, studentId, spreadsheetId])

  /**
   * Writes a progress update for a specific item and refreshes the local cache.
   * @param {string} itemId
   * @param {object} update - Partial progress fields to update.
   * @returns {Promise<void>}
   */
  const updateProgress = useCallback(
    async (itemId, update) => {
      if (!accessToken || !studentId || !spreadsheetId) {
        throw new Error('updateProgress: missing accessToken, studentId, or spreadsheetId.')
      }
      await upsertProgress(studentId, itemId, update, spreadsheetId, accessToken)

      // Update local cache optimistically
      setProgress((prev) => {
        const existing = prev.find((p) => p.item_id === itemId)
        if (existing) {
          return prev.map((p) =>
            p.item_id === itemId ? { ...p, ...update, updated_at: new Date().toISOString() } : p
          )
        }
        return [
          ...prev,
          {
            student_id: studentId,
            item_id: itemId,
            status: '',
            score: null,
            attempts: 0,
            confidence: '',
            student_note_text: '',
            student_note_audio_id: '',
            updated_at: new Date().toISOString(),
            ...update,
          },
        ]
      })
    },
    [accessToken, studentId, spreadsheetId]
  )

  return { progress, updateProgress, loading, error }
}
