/**
 * src/pages/teacher/GradingQueue.jsx
 * Lists pending manual-review submissions. Teacher reviews each one, assigns
 * a score, adds text or voice feedback, then submits the reviewed grade to
 * both the grading queue sheet and Google Classroom.
 */

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { useCourseConfig } from '../../hooks/useCourseConfig.js'
import { getPendingSubmissions, markReviewed } from '../../services/sheets/gradingQueue.js'
import { submitGrade } from '../../services/classroom.js'
import Button from '../../components/common/Button.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import VoiceRecorder from '../../components/common/VoiceRecorder.jsx'
import VoicePlayer from '../../components/common/VoicePlayer.jsx'

/**
 * Page-specific hook: fetches pending submissions from the grading queue sheet.
 * @param {string|null} spreadsheetId
 * @returns {{ submissions: Array, loading: boolean, error: string|null, refresh: function }}
 */
function useGradingQueue(spreadsheetId) {
  const { accessToken } = useAuth()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function fetch_() {
    if (!spreadsheetId || !accessToken) return
    setLoading(true)
    setError(null)
    try {
      const data = await getPendingSubmissions(spreadsheetId, accessToken)
      setSubmissions(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch_()
  }, [spreadsheetId, accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

  return { submissions, loading, error, refresh: fetch_ }
}

/**
 * A single expanded submission review panel.
 * @param {{ submission: object, spreadsheetId: string, courseId: string, onReviewed: function }} props
 */
function SubmissionReview({ submission, spreadsheetId, courseId, onReviewed }) {
  const { accessToken } = useAuth()
  const [score, setScore] = useState('')
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackAudioId, setFeedbackAudioId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit() {
    if (score === '' || isNaN(Number(score))) {
      setError('Please enter a valid score (0-100).')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await markReviewed(
        submission.submission_id,
        Number(score),
        feedbackText,
        feedbackAudioId,
        spreadsheetId,
        accessToken
      )
      // Also submit to Classroom gradebook if we have courseWork info
      // item_id is used as courseWorkId — teacher may need to map these
      try {
        await submitGrade(courseId, submission.item_id, submission.student_id, Number(score), accessToken)
      } catch {
        // Non-fatal: Classroom passback may fail if courseWork ID doesn't match
      }
      onReviewed(submission.submission_id)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ padding: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Score (0-100) *</label>
          <input
            type="number"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            min={0}
            max={100}
            style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Text feedback</label>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', boxSizing: 'border-box', resize: 'vertical' }}
          />
        </div>
      </div>

      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Voice feedback</label>
        <VoiceRecorder onUploadComplete={(id) => setFeedbackAudioId(id)} />
        {feedbackAudioId && (
          <div style={{ marginTop: 'var(--spacing-xs)' }}>
            <VoicePlayer driveFileId={feedbackAudioId} accessToken={accessToken} />
          </div>
        )}
      </div>

      {error && <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--spacing-sm)' }}>{error}</p>}

      <Button onClick={handleSubmit} loading={submitting}>Submit Grade</Button>
    </div>
  )
}

/**
 * Grading queue page.
 */
export default function GradingQueue() {
  const { courseId } = useParams()
  const { getConfig } = useCourseConfig()
  const config = getConfig(courseId)
  const spreadsheetId = config?.courseSheetId

  const { submissions, loading, error, refresh } = useGradingQueue(spreadsheetId)
  const [expandedId, setExpandedId] = useState(null)
  const [reviewed, setReviewed] = useState(new Set())

  function handleReviewed(submissionId) {
    setReviewed((prev) => new Set([...prev, submissionId]))
    setExpandedId(null)
    refresh()
  }

  const visible = submissions.filter((s) => !reviewed.has(s.submission_id))

  return (
    <div style={{ padding: 'var(--spacing-lg)' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>
        Grading Queue
      </h1>

      {!spreadsheetId && (
        <p style={{ color: 'var(--color-warning)' }}>Course not configured. Run course setup first.</p>
      )}

      {loading && <Spinner />}

      {error && <p style={{ color: 'var(--color-danger)' }}>Failed to load submissions: {error}</p>}

      {!loading && visible.length === 0 && spreadsheetId && (
        <p style={{ color: 'var(--color-text-secondary)' }}>No pending submissions to review.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {visible.map((sub) => (
          <div key={sub.submission_id} style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}>
            <div
              onClick={() => setExpandedId(expandedId === sub.submission_id ? null : sub.submission_id)}
              style={{ padding: 'var(--spacing-md)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <p style={{ fontWeight: 600 }}>Student: {sub.student_id}</p>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  Item: {sub.item_id} · Submitted: {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : '—'}
                </p>
              </div>
              <span style={{ color: 'var(--color-text-secondary)' }}>{expandedId === sub.submission_id ? '▲' : '▼'}</span>
            </div>

            {expandedId === sub.submission_id && (
              <SubmissionReview
                submission={sub}
                spreadsheetId={spreadsheetId}
                courseId={courseId}
                onReviewed={handleReviewed}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
