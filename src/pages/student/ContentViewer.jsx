/**
 * src/pages/student/ContentViewer.jsx
 * Renders an unlocked course resource. Calls the Cloud Function to verify
 * prerequisite completion and receive Drive access before rendering content.
 * Supports student text and voice notes per item.
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { useProgress } from '../../hooks/useProgress.js'
import { useLearningPath } from '../../hooks/useLearningPath.js'
import { unlockContent } from '../../services/cloudFunction.js'
import { upsertProgress } from '../../services/sheets/progress.js'
import SlideViewer from '../../components/slides/SlideViewer.jsx'
import VoiceRecorder from '../../components/common/VoiceRecorder.jsx'
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
 * Content viewer page for students.
 */
export default function ContentViewer() {
  const { courseId, itemId } = useParams()
  const navigate = useNavigate()
  // idToken is needed for cloud function verification
  const { user, accessToken, idToken } = useAuth()
  const storedCourse = getStoredCourse()
  const courseSheetId = storedCourse?.courseSheetId || null

  const { progress, updateProgress } = useProgress(user?.sub, courseSheetId)
  const { modules } = useLearningPath(courseSheetId, progress)

  // Find the specific item from the learning path
  const allItems = modules.flatMap((m) => m.items)
  const item = allItems.find((i) => i.item_id === itemId)

  const [unlocking, setUnlocking] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [unlockError, setUnlockError] = useState(null)

  const [noteText, setNoteText] = useState('')
  const [noteAudioId, setNoteAudioId] = useState(null)
  const [savingNote, setSavingNote] = useState(false)

  // Attempt unlock on mount once item is resolved
  useEffect(() => {
    if (!item || !accessToken || unlocked || unlocking) return

    setUnlocking(true)
    setUnlockError(null)

    // Use idToken for cloud function; fall back to accessToken with a TODO note
    // TODO: ensure idToken is always populated after OAuth callback
    const tokenForFunction = idToken || accessToken

    unlockContent({
      idToken: tokenForFunction,
      courseId,
      spreadsheetId: courseSheetId,
      itemId,
      driveFileId: item.drive_file_id,
    })
      .then(() => setUnlocked(true))
      .catch((err) => setUnlockError(err.message))
      .finally(() => setUnlocking(false))
  }, [item, accessToken, idToken, courseId, courseSheetId, itemId]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Called when the student finishes all slides and checkpoints.
   */
  async function handleComplete() {
    if (!user?.sub || !courseSheetId) return
    await updateProgress(itemId, { status: 'completed', updated_at: new Date().toISOString() })
    navigate(`/student`)
  }

  /**
   * Saves the student's text/voice note for this item.
   */
  async function handleSaveNote() {
    if (!user?.sub || !courseSheetId) return
    setSavingNote(true)
    try {
      await upsertProgress(user.sub, itemId, {
        student_note_text: noteText,
        student_note_audio_id: noteAudioId || '',
      }, courseSheetId, accessToken)
    } finally {
      setSavingNote(false)
    }
  }

  // Parse checkpoint_slides JSON
  let checkpoints = []
  if (item?.checkpoint_slides) {
    try {
      checkpoints = JSON.parse(item.checkpoint_slides)
    } catch { checkpoints = [] }
  }

  // Pre-populate note from existing progress
  const existingProgress = progress.find((p) => p.item_id === itemId)
  useEffect(() => {
    if (existingProgress) {
      setNoteText(existingProgress.student_note_text || '')
      setNoteAudioId(existingProgress.student_note_audio_id || null)
    }
  }, [existingProgress?.item_id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!item && modules.length > 0) {
    return (
      <div style={{ padding: 'var(--spacing-lg)' }}>
        <p style={{ color: 'var(--color-danger)' }}>Content item not found.</p>
        <Button variant="secondary" onClick={() => navigate('/student')}>Back to Course</Button>
      </div>
    )
  }

  if (modules.length === 0 || unlocking) {
    return (
      <div style={{ padding: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
        <Spinner />
        <span>Loading content…</span>
      </div>
    )
  }

  if (unlockError) {
    return (
      <div style={{ padding: 'var(--spacing-lg)' }}>
        <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--spacing-md)' }}>
          Could not unlock content: {unlockError}
        </p>
        <Button variant="secondary" onClick={() => navigate('/student')}>Back to Course</Button>
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--spacing-lg)', maxWidth: 860 }}>
      {/* Back link */}
      <button
        onClick={() => navigate('/student')}
        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}
      >
        ← Back to course
      </button>

      <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-sm)' }}>
        {item?.title}
      </h1>

      {item?.teacher_note && (
        <div style={{
          padding: 'var(--spacing-sm) var(--spacing-md)',
          background: 'var(--color-primary-light)',
          border: '1px solid var(--color-primary)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--spacing-md)',
          fontSize: 'var(--font-size-sm)',
        }}>
          <strong>Teacher note:</strong> {item.teacher_note}
        </div>
      )}

      {unlocked && item && (
        <SlideViewer
          driveFileId={item.drive_file_id}
          fileType={item.type}
          accessToken={accessToken}
          checkpoints={checkpoints}
          courseId={courseId}
          itemId={itemId}
          spreadsheetId={courseSheetId}
          onComplete={handleComplete}
        />
      )}

      {/* Student notes section */}
      <div style={{ marginTop: 'var(--spacing-xl)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-lg)' }}>
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--spacing-md)' }}>
          My Notes
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={4}
            placeholder="Write your notes here…"
            style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
          />
          <div>
            <p style={{ fontWeight: 600, marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)' }}>Voice note</p>
            <VoiceRecorder onUploadComplete={(id) => setNoteAudioId(id)} />
          </div>
          <Button onClick={handleSaveNote} loading={savingNote} variant="secondary">
            Save Notes
          </Button>
        </div>
      </div>
    </div>
  )
}
