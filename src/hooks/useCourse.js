/**
 * src/hooks/useCourse.js
 * Hook for fetching and managing the user's Google Classroom courses.
 * Determines the user's role (teacher vs student) based on course ownership.
 * Exposes: { courses, activeCourse, setActiveCourse, role, loading, error }
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { getCourses } from '../services/classroom.js'

/**
 * Detects whether the authenticated user is a teacher in any of their courses.
 * Google Classroom returns teacherFolder or creatorUserId for owned courses.
 * @param {Array} courses
 * @param {string} userId - The authenticated user's sub/id.
 * @returns {'teacher'|'student'}
 */
function detectRole(courses, userId) {
  const isTeacher = courses.some(
    (c) =>
      c.teacherFolder !== undefined ||
      c.creatorUserId === userId ||
      c.courseState === 'ACTIVE' && c.ownerId === userId
  )
  return isTeacher ? 'teacher' : 'student'
}

/**
 * Fetches the user's Classroom courses and determines their role.
 * @returns {{ courses: Array, activeCourse: object|null, setActiveCourse: function, role: 'teacher'|'student'|null, loading: boolean, error: string|null }}
 */
export function useCourse() {
  const { accessToken, user } = useAuth()
  const [courses, setCourses] = useState([])
  const [activeCourse, setActiveCourse] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchCourses = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    setError(null)
    try {
      const data = await getCourses(accessToken)
      setCourses(data)
      if (data.length > 0 && !activeCourse) {
        setActiveCourse(data[0])
      }
      setRole(detectRole(data, user?.sub))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [accessToken, user?.sub]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  return { courses, activeCourse, setActiveCourse, role, loading, error }
}
