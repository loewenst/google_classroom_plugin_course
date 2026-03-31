/**
 * src/components/slides/SlideCheckpoint.jsx
 * Injected at a configured slide number to present an assessment.
 * Blocks forward navigation in SlideViewer until the assessment is completed.
 *
 * Props:
 *   assessmentId  {string}
 *   slideNumber   {number}
 *   courseId      {string}
 *   itemId        {string}
 *   spreadsheetId {string}
 *   onComplete    {() => void}
 */

import AssessmentWrapper from '../assessment/AssessmentWrapper.jsx'

export default function SlideCheckpoint({ assessmentId, slideNumber, courseId, itemId, spreadsheetId, onComplete }) {
  return (
    <div style={{
      background: 'var(--color-primary-light)',
      border: '2px solid var(--color-primary)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--spacing-lg)',
    }}>
      <p style={{ fontWeight: 600, marginBottom: 'var(--spacing-md)', color: 'var(--color-primary)' }}>
        Checkpoint — Slide {slideNumber}
      </p>
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
        Complete this assessment to continue.
      </p>
      <AssessmentWrapper
        assessmentId={assessmentId}
        courseId={courseId}
        itemId={itemId}
        spreadsheetId={spreadsheetId}
        onComplete={onComplete}
      />
    </div>
  )
}
