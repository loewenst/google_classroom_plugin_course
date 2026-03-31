/**
 * src/pages/Join.jsx
 * Handles the student join URL: /#/join/:courseSheetId/:classroomCourseId
 * Stores the course info in localStorage and redirects to the appropriate page.
 * This route is reachable before authentication so students can join via a link.
 */

import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import Spinner from '../components/common/Spinner.jsx'

const STUDENT_COURSES_KEY = 'classroom_app_student_courses'

/**
 * Reads the current stored student course from localStorage.
 * @returns {object|null}
 */
function readStudentCourses() {
  try {
    const raw = localStorage.getItem(STUDENT_COURSES_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Join page. Reads courseSheetId and classroomCourseId from URL params,
 * persists them to localStorage, then redirects.
 * Authenticated users go to /student; unauthenticated users go to / (login).
 */
export default function Join() {
  const { courseSheetId, classroomCourseId } = useParams()
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return

    if (!courseSheetId || !classroomCourseId) {
      // Malformed URL — fall back to root
      navigate('/', { replace: true })
      return
    }

    // Persist the course identifiers so the student dashboard can load them
    const existing = readStudentCourses() || {}
    const updated = { ...existing, courseSheetId, classroomCourseId }
    localStorage.setItem(STUDENT_COURSES_KEY, JSON.stringify(updated))

    if (user) {
      navigate('/student', { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }, [loading, user, courseSheetId, classroomCourseId, navigate])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Spinner size="lg" />
    </div>
  )
}
