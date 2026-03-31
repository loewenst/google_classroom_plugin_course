/**
 * src/hooks/useRoster.js
 * Hook for fetching the student roster for a Google Classroom course.
 * Normalizes the Classroom API response to a flat { id, name, email } shape.
 * Exposes: { students, loading, error }
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { getCourseStudents } from '../services/classroom.js'

/**
 * Fetches and normalizes the student roster for a course.
 * @param {string|null} courseId - The Google Classroom course ID.
 * @returns {{ students: Array<{ id: string, name: string, email: string }>, loading: boolean, error: string|null }}
 */
export function useRoster(courseId) {
  const { accessToken } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!accessToken || !courseId) return
    setLoading(true)
    setError(null)
    getCourseStudents(courseId, accessToken)
      .then((raw) =>
        setStudents(
          raw.map((s) => ({
            id: s.userId,
            name: s.profile?.name?.fullName || '',
            email: s.profile?.emailAddress || '',
          }))
        )
      )
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [accessToken, courseId])

  return { students, loading, error }
}
