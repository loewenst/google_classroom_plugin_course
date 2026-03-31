/**
 * src/pages/student/AssessmentPage.jsx
 * Standalone assessment page (not embedded in slides). Finds the assessment
 * config from the learning path, renders AssessmentWrapper, and navigates
 * back to the student dashboard on completion.
 */

import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { useProgress } from '../../hooks/useProgress.js'
import { useLearningPath } from '../../hooks/useLearningPath.js'
import AssessmentWrapper from '../../components/assessment/AssessmentWrapper.jsx'
import Button from '../../components/common/Button.jsx'
import Spinner from '../../components/common/Spinner.jsx'

const STUDENT_COURSES_KEY = 'classroom_app_student_courses'

function getStoredCourse() {
  try {
    const raw = localStorage.getItem(STUDENT_COURSES_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

/**
 * Student assessment page.
 */
export default function AssessmentPage() {
  const { courseId, itemId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const storedCourse = getStoredCourse()
  const courseSheetId = storedCourse?.courseSheetId || null

  const { progress } = useProgress(user?.sub, courseSheetId)
  const { modules, loading } = useLearningPath(courseSheetId, progress)

  const allItems = modules.flatMap((m) => m.items)
  const item = allItems.find((i) => i.item_id === itemId)

  function handleComplete() {
    navigate('/student')
  }

  if (loading) {
    return (
      <div style={{ padding: 'var(--spacing-lg)' }}>
        <Spinner />
      </div>
    )
  }

  if (!item) {
    return (
      <div style={{ padding: 'var(--spacing-lg)' }}>
        <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--spacing-md)' }}>Assessment not found.</p>
        <Button variant="secondary" onClick={() => navigate('/student')}>Back to Course</Button>
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--spacing-lg)', maxWidth: 720 }}>
      <button
        onClick={() => navigate('/student')}
        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}
      >
        ← Back to course
      </button>

      <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>
        {item.title}
      </h1>

      {courseSheetId && (
        <AssessmentWrapper
          assessmentId={item.item_id}
          courseId={courseId}
          itemId={itemId}
          spreadsheetId={courseSheetId}
          onComplete={handleComplete}
        />
      )}
    </div>
  )
}
