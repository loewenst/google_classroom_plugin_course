/**
 * src/pages/teacher/CourseSetup.jsx
 * One-time course linking flow. Guides the teacher through:
 *   1. Selecting a Google Classroom course
 *   2. Running the automated setup sequence (sheets, folder, sharing, roster sync)
 * On completion, saves the config to localStorage and navigates to the path page.
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { useCourse } from '../../hooks/useCourse.js'
import { useCourseConfig } from '../../hooks/useCourseConfig.js'
import { createSpreadsheet, createPrivateSpreadsheet } from '../../services/sheets/init.js'
import { createFolder, shareWithServiceAccount } from '../../services/drive.js'
import { getCourseStudents } from '../../services/classroom.js'
import Button from '../../components/common/Button.jsx'
import Spinner from '../../components/common/Spinner.jsx'

const SERVICE_ACCOUNT_EMAIL = import.meta.env.VITE_SERVICE_ACCOUNT_EMAIL

/**
 * Renders a single step in the setup progress list.
 * @param {{ label: string, status: 'pending'|'running'|'done'|'error' }} props
 */
function SetupStep({ label, status }) {
  const icon = status === 'done' ? '✓' : status === 'running' ? '…' : status === 'error' ? '✗' : '○'
  const color = status === 'done'
    ? 'var(--color-success)'
    : status === 'error'
    ? 'var(--color-danger)'
    : status === 'running'
    ? 'var(--color-primary)'
    : 'var(--color-text-disabled)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: '6px 0' }}>
      <span style={{ color, fontWeight: 700, fontSize: '1.1rem', minWidth: 20 }}>{icon}</span>
      <span style={{ color: status === 'pending' ? 'var(--color-text-disabled)' : 'var(--color-text)' }}>
        {label}
      </span>
      {status === 'running' && <Spinner size="sm" />}
    </div>
  )
}

const STEPS = [
  { id: 'courseSheet', label: 'Creating course sheet…' },
  { id: 'privateSheet', label: 'Creating private answer key sheet…' },
  { id: 'folder', label: 'Creating content folder…' },
  { id: 'sharing', label: 'Sharing with service account…' },
  { id: 'roster', label: 'Syncing student roster…' },
  { id: 'done', label: 'Done!' },
]

/**
 * Course setup page. Step 1: pick a Classroom course. Step 2: run setup.
 */
export default function CourseSetup() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { accessToken } = useAuth()
  const { courses, loading: coursesLoading, error: coursesError } = useCourse()
  const { saveConfig } = useCourseConfig()

  const [selectedCourse, setSelectedCourse] = useState(null)
  const [running, setRunning] = useState(false)
  const [stepStatuses, setStepStatuses] = useState({})
  const [setupError, setSetupError] = useState(null)
  const [done, setDone] = useState(false)

  // Pre-select if courseId is provided and not 'new'
  useEffect(() => {
    if (courseId && courseId !== 'new' && courses.length > 0) {
      const match = courses.find((c) => c.id === courseId)
      if (match) setSelectedCourse(match)
    }
  }, [courseId, courses])

  /**
   * Sets the status of a specific setup step.
   * @param {string} stepId
   * @param {'pending'|'running'|'done'|'error'} status
   */
  function setStep(stepId, status) {
    setStepStatuses((prev) => ({ ...prev, [stepId]: status }))
  }

  /**
   * Runs the full course setup sequence.
   */
  async function handleSetup() {
    if (!selectedCourse) return
    setRunning(true)
    setSetupError(null)
    setStepStatuses({})

    try {
      // Step 1: Create course sheet
      setStep('courseSheet', 'running')
      const { spreadsheetId: courseSheetId } = await createSpreadsheet(
        `${selectedCourse.name} — Course Sheet`,
        accessToken
      )
      setStep('courseSheet', 'done')

      // Step 2: Create private sheet
      setStep('privateSheet', 'running')
      const { spreadsheetId: privateSheetId } = await createPrivateSpreadsheet(
        `${selectedCourse.name} — Answer Keys (Private)`,
        accessToken
      )
      setStep('privateSheet', 'done')

      // Step 3: Create content folder
      setStep('folder', 'running')
      const folder = await createFolder(
        `${selectedCourse.name} — Course Content`,
        null,
        accessToken
      )
      const driveFolderId = folder.id
      setStep('folder', 'done')

      // Step 4: Share sheets and folder with service account
      setStep('sharing', 'running')
      if (SERVICE_ACCOUNT_EMAIL) {
        await Promise.all([
          shareWithServiceAccount(courseSheetId, SERVICE_ACCOUNT_EMAIL, accessToken),
          shareWithServiceAccount(privateSheetId, SERVICE_ACCOUNT_EMAIL, accessToken),
          shareWithServiceAccount(driveFolderId, SERVICE_ACCOUNT_EMAIL, accessToken),
        ])
      }
      setStep('sharing', 'done')

      // Step 5: Sync student roster
      setStep('roster', 'running')
      const students = await getCourseStudents(selectedCourse.id, accessToken)
      setStep('roster', 'done')

      // Step 6: Done
      setStep('done', 'done')

      const config = {
        classroomCourseId: selectedCourse.id,
        name: selectedCourse.name,
        section: selectedCourse.section || '',
        courseSheetId,
        privateSheetId,
        driveFolderId,
        studentCount: students.length,
        linkedAt: new Date().toISOString(),
      }
      saveConfig(config)
      setDone(true)

      setTimeout(() => {
        navigate(`/teacher/course/${selectedCourse.id}/path`)
      }, 1200)
    } catch (err) {
      setSetupError(err.message)
      // Mark current running step as error
      setStepStatuses((prev) => {
        const updated = { ...prev }
        for (const key of Object.keys(updated)) {
          if (updated[key] === 'running') updated[key] = 'error'
        }
        return updated
      })
    } finally {
      setRunning(false)
    }
  }

  if (coursesLoading) {
    return (
      <div style={{ padding: 'var(--spacing-lg)' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--spacing-lg)', maxWidth: 640 }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>
        Link a Course
      </h1>

      {coursesError && (
        <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--spacing-md)' }}>
          Failed to load courses: {coursesError}
        </p>
      )}

      {/* Step 1: Select course */}
      {!running && !done && (
        <>
          <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>
            Select a Google Classroom course to link.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
            {courses.map((course) => (
              <div
                key={course.id}
                onClick={() => setSelectedCourse(course)}
                style={{
                  padding: 'var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${selectedCourse?.id === course.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: selectedCourse?.id === course.id ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  cursor: 'pointer',
                }}
              >
                <p style={{ fontWeight: 600 }}>{course.name}</p>
                {course.section && (
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    {course.section}
                  </p>
                )}
              </div>
            ))}
          </div>

          <Button
            onClick={handleSetup}
            disabled={!selectedCourse}
            loading={running}
          >
            Set up course
          </Button>
        </>
      )}

      {/* Step 2: Setup progress */}
      {(running || done) && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-lg)',
        }}>
          <p style={{ fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
            Setting up: {selectedCourse?.name}
          </p>
          {STEPS.map((step) => (
            <SetupStep
              key={step.id}
              label={step.label}
              status={stepStatuses[step.id] || 'pending'}
            />
          ))}
        </div>
      )}

      {setupError && (
        <div style={{
          marginTop: 'var(--spacing-md)',
          padding: 'var(--spacing-md)',
          background: 'var(--color-danger-light)',
          border: '1px solid var(--color-danger)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-danger)',
        }}>
          <strong>Setup failed:</strong> {setupError}
          <div style={{ marginTop: 'var(--spacing-sm)' }}>
            <Button variant="secondary" onClick={() => { setRunning(false); setDone(false); setStepStatuses({}) }}>
              Try again
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
