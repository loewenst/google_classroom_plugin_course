/**
 * cloud-function/scoring.js
 * CommonJS copy of scoring logic. Intentionally duplicated from src/utils/scoring.js.
 * This copy is AUTHORITATIVE — it runs server-side where answers cannot be inspected.
 * The frontend copy in src/utils/scoring.js provides instant preview feedback only.
 * If you change scoring logic, update both copies.
 */

/**
 * Computes a 0–100 score for a student's answers against an answer key.
 * @param {Object} answers    student answers keyed by question/blank ID
 * @param {Object} answerKey  correct answers keyed by question/blank ID
 * @returns {number} integer score from 0 to 100
 */
function computeScore(answers, answerKey) {
  const questionIds = Object.keys(answerKey)
  if (questionIds.length === 0) return 100

  const correct = questionIds.filter(id => {
    const studentAnswer = answers[id]
    const correctAnswer = answerKey[id]
    return normalizeAnswer(studentAnswer) === normalizeAnswer(correctAnswer)
  })

  return Math.round((correct.length / questionIds.length) * 100)
}

/**
 * Normalizes an answer for comparison.
 * Arrays are sorted before comparison to handle unordered matching.
 * @param {string|string[]} answer
 * @returns {string}
 */
function normalizeAnswer(answer) {
  if (Array.isArray(answer)) {
    return JSON.stringify(answer.map(a => String(a).trim().toLowerCase()).sort())
  }
  return String(answer ?? '').trim().toLowerCase()
}

module.exports = { computeScore }
