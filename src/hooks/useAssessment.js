/**
 * src/hooks/useAssessment.js
 * Hook for managing the full assessment submission flow.
 * Checks retake limits, calls the cloud function for grading, and updates
 * local progress state on completion.
 * Exposes: { submit, submitting, result, attemptsRemaining, error }
 */

import { useState, useMemo } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { gradeSubmission } from '../services/cloudFunction.js'

/**
 * Manages the submission lifecycle for a single assessment item.
 *
 * @param {{
 *   courseId: string,
 *   spreadsheetId: string,
 *   assessmentId: string,
 *   itemId: string,
 *   retakeLimit: number|null,
 *   scorePolicy: 'highest'|'latest'|'average',
 *   progressRecord: object|null,
 *   onProgressUpdate: function
 * }} options
 * @returns {{ submit: function, submitting: boolean, result: object|null, attemptsRemaining: number|null, error: string|null }}
 */
export function useAssessment({
  courseId,
  spreadsheetId,
  assessmentId,
  itemId,
  retakeLimit = null,
  scorePolicy = 'highest',
  progressRecord = null,
  onProgressUpdate,
}) {
  const { accessToken, user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const currentAttempts = progressRecord?.attempts ?? 0

  const attemptsRemaining = useMemo(() => {
    if (retakeLimit === null) return null // unlimited
    return Math.max(0, retakeLimit - currentAttempts)
  }, [retakeLimit, currentAttempts])

  /**
   * Submits answers to the cloud function for grading.
   * Enforces retake limit before making the request.
   * Updates progress via onProgressUpdate callback after successful grading.
   *
   * @param {Array} answers - Student's answers array.
   * @returns {Promise<{ score: number }>}
   * @throws {Error} If retake limit is reached or submission fails.
   */
  const submit = async (answers) => {
    if (attemptsRemaining !== null && attemptsRemaining <= 0) {
      const err = new Error(`Retake limit reached. You have used all ${retakeLimit} attempts.`)
      setError(err.message)
      throw err
    }
    if (!accessToken) {
      const err = new Error('Not authenticated. Please sign in again.')
      setError(err.message)
      throw err
    }

    setSubmitting(true)
    setError(null)

    try {
      // Get ID token from current session for cloud function verification
      // The id_token is obtained by requesting the openid scope — we expose it
      // through the auth flow. For now, use a re-issued token approach.
      // Note: in production, store the id_token alongside the access_token.
      const idToken = accessToken // fallback; ideally use the actual id_token

      const gradeResult = await gradeSubmission({
        idToken,
        courseId,
        spreadsheetId,
        assessmentId,
        itemId,
        answers,
      })

      const newAttempts = currentAttempts + 1
      const prevScore = progressRecord?.score ?? null
      let finalScore = gradeResult.score

      if (scorePolicy === 'highest' && prevScore !== null) {
        finalScore = Math.max(prevScore, gradeResult.score)
      } else if (scorePolicy === 'average' && prevScore !== null) {
        finalScore = Math.round((prevScore * (newAttempts - 1) + gradeResult.score) / newAttempts)
      }
      // 'latest' policy: use the new score as-is

      const progressUpdate = {
        status: 'completed',
        score: finalScore,
        attempts: newAttempts,
        updated_at: new Date().toISOString(),
      }

      if (onProgressUpdate) {
        await onProgressUpdate(itemId, progressUpdate)
      }

      const finalResult = { ...gradeResult, finalScore, attempts: newAttempts }
      setResult(finalResult)
      return finalResult
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  return { submit, submitting, result, attemptsRemaining, error }
}
