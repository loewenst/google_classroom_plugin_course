/**
 * src/components/assessment/AssessmentWrapper.jsx
 * Container for any assessment type. Responsibilities:
 *   - Fetches assessment config via the assessments service (through useAssessment hook)
 *   - Routes to the correct question component based on config.type
 *   - Displays attempt count and retake policy feedback
 *   - Disables submit when retake limit is reached
 *   - Delegates submission to useAssessment (which calls the Cloud Function)
 *   - Shows score result and confidence self-assessment after submission
 *
 * Props:
 *   assessmentId  {string}
 *   courseId      {string}
 *   itemId        {string}
 *   spreadsheetId {string}
 *   onComplete    {(score: number) => void}  called after successful submission
 */

import { useState } from 'react'
import { useAssessment } from '../../hooks/useAssessment.js'
import MultipleChoice from './MultipleChoice.jsx'
import BinaryChoice from './BinaryChoice.jsx'
import WordBank from './WordBank.jsx'
import Spinner from '../common/Spinner.jsx'
import Button from '../common/Button.jsx'

export default function AssessmentWrapper({ assessmentId, courseId, itemId, spreadsheetId, onComplete }) {
  const { config, submit, submitting, result, attemptsRemaining, loading, error } = useAssessment({
    assessmentId,
    courseId,
    itemId,
    spreadsheetId,
  })

  const [answers, setAnswers] = useState({})
  const [confidence, setConfidence] = useState(null)

  if (loading) return <Spinner />
  if (error) return <p style={{ color: 'var(--color-danger)' }}>Failed to load assessment: {error}</p>
  if (!config) return null

  const isSubmitted = result !== null
  const canRetake = attemptsRemaining === null || attemptsRemaining > 0

  async function handleSubmit() {
    if (Object.keys(answers).length === 0) return
    const score = await submit(answers, confidence)
    if (score !== undefined && onComplete) onComplete(score)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Attempt counter */}
      {attemptsRemaining !== null && (
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          {isSubmitted
            ? `Attempts remaining: ${attemptsRemaining}`
            : `Attempt ${(config.retake_limit - attemptsRemaining) + 1} of ${config.retake_limit || '∞'}`}
        </p>
      )}

      {/* Question */}
      {config.type === 'multiple_choice' && (
        <MultipleChoice
          question={config.question}
          options={config.options}
          onAnswer={id => setAnswers({ q: id })}
          disabled={isSubmitted || !canRetake}
        />
      )}
      {config.type === 'binary_choice' && (
        <BinaryChoice
          question={config.question}
          optionA={config.optionA}
          optionB={config.optionB}
          onAnswer={val => setAnswers({ q: val })}
          disabled={isSubmitted || !canRetake}
        />
      )}
      {config.type === 'word_bank' && (
        <WordBank
          blanks={config.blanks}
          wordBank={config.wordBank}
          onAnswer={placements => setAnswers(placements)}
          disabled={isSubmitted || !canRetake}
        />
      )}

      {/* Result */}
      {isSubmitted && (
        <div style={{
          padding: 'var(--spacing-md)',
          background: result.score >= (config.pass_threshold || 70) ? 'var(--color-success-light)' : 'var(--color-danger-light)',
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${result.score >= (config.pass_threshold || 70) ? 'var(--color-success)' : 'var(--color-danger)'}`,
        }}>
          <strong>Score: {result.score}%</strong>
          {result.score >= (config.pass_threshold || 70)
            ? ' — Passed!'
            : ` — ${canRetake ? 'Try again.' : 'No retakes remaining.'}`}
        </div>
      )}

      {/* Confidence self-assessment (post-submit, pre-next) */}
      {isSubmitted && confidence === null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>How confident do you feel about this material?</p>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setConfidence(n)}
                style={{
                  width: 40, height: 40,
                  borderRadius: '50%',
                  border: '2px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Submit button */}
      {!isSubmitted && canRetake && (
        <Button
          onClick={handleSubmit}
          loading={submitting}
          disabled={Object.keys(answers).length === 0 || submitting}
        >
          Submit
        </Button>
      )}
    </div>
  )
}
