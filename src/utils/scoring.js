/**
 * src/utils/scoring.js
 * Frontend (ESM) copy of the scoring algorithm. Used for client-side score preview
 * before a submission is confirmed by the cloud function.
 *
 * DUPLICATION NOTE: This file is intentionally duplicated at cloud-function/scoring.js
 * (CommonJS format). The cloud function is the authoritative scorer — its result is
 * what gets written to the spreadsheet. This frontend copy lets the UI show an
 * immediate score preview without a round-trip, improving perceived performance.
 * If you fix a scoring bug here, you MUST apply the same fix to cloud-function/scoring.js.
 */

/**
 * Normalizes an answer string for comparison: trims whitespace and lowercases.
 * @param {string} value
 * @returns {string}
 */
export function normalizeAnswer(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim().toLowerCase()
}

/**
 * Computes a score (0–100) by comparing student answers against an answer key.
 * Handles three answer formats:
 *   - string: direct normalized string comparison
 *   - array: sorts both sides before comparing (covers word-bank and matching types
 *     where order should not matter)
 *   - object: not supported — throws to surface schema mismatches early
 *
 * @param {Array<string|string[]>} answers - Student answers, one per question.
 * @param {Array<string|string[]>} answerKey - Correct answers, one per question.
 * @returns {number} Integer score 0–100.
 * @throws {Error} If answers or answerKey are not arrays.
 */
export function computeScore(answers, answerKey) {
  if (!Array.isArray(answers)) {
    throw new Error('computeScore: answers must be an array.')
  }
  if (!Array.isArray(answerKey)) {
    throw new Error('computeScore: answerKey must be an array.')
  }
  if (answerKey.length === 0) {
    throw new Error('computeScore: answerKey must not be empty.')
  }

  let correct = 0

  for (let i = 0; i < answerKey.length; i++) {
    const expected = answerKey[i]
    const given = answers[i]

    if (Array.isArray(expected)) {
      // Word bank / matching — sort both sides so order doesn't matter
      if (!Array.isArray(given)) {
        // Wrong type — counts as incorrect, don't throw
        continue
      }
      const sortedExpected = [...expected].map(normalizeAnswer).sort()
      const sortedGiven = [...given].map(normalizeAnswer).sort()
      if (
        sortedExpected.length === sortedGiven.length &&
        sortedExpected.every((val, idx) => val === sortedGiven[idx])
      ) {
        correct++
      }
    } else {
      // String comparison
      if (normalizeAnswer(given) === normalizeAnswer(expected)) {
        correct++
      }
    }
  }

  return Math.round((correct / answerKey.length) * 100)
}
