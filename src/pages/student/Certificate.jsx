/**
 * src/pages/student/Certificate.jsx
 * Shown when a student completes all items in the learning path.
 * Renders a completion certificate with a jsPDF export button.
 */

import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { useProgress } from '../../hooks/useProgress.js'
import { useLearningPath } from '../../hooks/useLearningPath.js'
import CertificateComponent from '../../components/certificate/Certificate.jsx'
import Spinner from '../../components/common/Spinner.jsx'

const STUDENT_COURSES_KEY = 'classroom_app_student_courses'

function getStoredCourse() {
  try {
    const raw = localStorage.getItem(STUDENT_COURSES_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

/**
 * Student certificate page.
 */
export default function StudentCertificate() {
  const { courseId } = useParams()
  const { user } = useAuth()
  const storedCourse = getStoredCourse()
  const courseSheetId = storedCourse?.courseSheetId || null

  const { progress, loading: progressLoading } = useProgress(user?.sub, courseSheetId)
  const { modules, loading: pathLoading } = useLearningPath(courseSheetId, progress)

  const loading = progressLoading || pathLoading

  // Compute completion date from last completed item
  const completedItems = progress.filter((p) => p.status === 'completed')
  const lastUpdate = completedItems
    .map((p) => p.updated_at)
    .sort()
    .pop() || new Date().toISOString()

  const courseName = storedCourse?.courseName || 'the course'
  const studentName = user?.name || user?.email || 'Student'

  return (
    <div style={{ padding: 'var(--spacing-lg)' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)', textAlign: 'center' }}>
        Certificate of Completion
      </h1>

      {loading && <div style={{ textAlign: 'center' }}><Spinner /></div>}

      {!loading && (
        <CertificateComponent
          studentName={studentName}
          courseName={courseName}
          completedAt={lastUpdate}
        />
      )}
    </div>
  )
}
