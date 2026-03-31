/**
 * src/pages/student/Dashboard.jsx
 * Student's home view. Reads the student's stored course from localStorage,
 * loads their progress and learning path, and renders PathViewer.
 * Shows a "Join a course" prompt if no course is stored.
 */

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { useProgress } from '../../hooks/useProgress.js'
import { useLearningPath } from '../../hooks/useLearningPath.js'
import PathViewer from '../../components/learningPath/PathViewer.jsx'
import Spinner from '../../components/common/Spinner.jsx'

const STUDENT_COURSES_KEY = 'classroom_app_student_courses'

/**
 * Reads the stored student course from localStorage.
 * @returns {{ courseSheetId: string, classroomCourseId: string }|null}
 */
function getStoredCourse() {
  try {
    const raw = localStorage.getItem(STUDENT_COURSES_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Student dashboard page.
 */
export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const storedCourse = getStoredCourse()
  const courseSheetId = storedCourse?.courseSheetId || null
  const classroomCourseId = storedCourse?.classroomCourseId || null

  const { progress, loading: progressLoading } = useProgress(user?.sub, courseSheetId)
  const { modules, loading: pathLoading, error: pathError } = useLearningPath(courseSheetId, progress)

  const loading = progressLoading || pathLoading

  if (!storedCourse) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--spacing-md)' }}>
          My Course
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
          You haven't joined a course yet. Ask your teacher for the join link.
        </p>
      </div>
    )
  }

  /**
   * Navigates to the appropriate page when a student selects a path item.
   * @param {object} item
   */
  function handleSelectItem(item) {
    if (!classroomCourseId) return
    if (item.type === 'assessment') {
      navigate(`/student/course/${classroomCourseId}/assessment/${item.item_id}`)
    } else {
      navigate(`/student/course/${classroomCourseId}/content/${item.item_id}`)
    }
  }

  // Enrich modules with item status from progress data
  const progressMap = new Map(progress.map((p) => [p.item_id, p]))
  const enrichedModules = modules.map((mod) => ({
    ...mod,
    id: mod.module_id,
    items: mod.items.map((item) => {
      const prog = progressMap.get(item.item_id)
      return {
        ...item,
        id: item.item_id,
        status: prog?.status || 'not_started',
        score: prog?.score ?? null,
      }
    }),
  }))

  const allItems = enrichedModules.flatMap((mod) => mod.items)
  const isCourseComplete = allItems.length > 0 && allItems.every((item) => item.status === 'complete')

  return (
    <div style={{ padding: 'var(--spacing-lg)' }}>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>
          {user?.name ? `Welcome, ${user.name.split(' ')[0]}!` : 'My Course'}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
          {storedCourse.courseName || 'Your learning path'}
        </p>
      </div>

      {loading && <Spinner />}
      {pathError && <p style={{ color: 'var(--color-danger)' }}>Failed to load course: {pathError}</p>}

      {!loading && isCourseComplete && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--spacing-md)',
          padding: 'var(--spacing-md) var(--spacing-lg)',
          marginBottom: 'var(--spacing-lg)',
          background: '#f0faf3',
          border: '1px solid var(--color-success)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div>
            <p style={{ fontWeight: 700, marginBottom: 2 }}>You've completed the course!</p>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              Your certificate is ready to download.
            </p>
          </div>
          <button
            onClick={() => navigate(`/student/course/${classroomCourseId}/certificate`)}
            style={{
              padding: '10px 20px',
              background: 'var(--color-success)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            View Certificate
          </button>
        </div>
      )}

      {!loading && (
        <PathViewer modules={enrichedModules} onSelectItem={handleSelectItem} />
      )}
    </div>
  )
}
