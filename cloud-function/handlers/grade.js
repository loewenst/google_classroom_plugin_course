/**
 * cloud-function/handlers/grade.js
 * Grades a student's assessment submission.
 *
 * Flow:
 *   1. Verify Google identity token
 *   2. Fetch answer key from the private (teacher-only) spreadsheet
 *   3. Compute score server-side — answer key never leaves this function
 *   4. Write score to the course progress sheet
 *   5. Return score to client
 *
 * Expected request body fields:
 *   idToken         {string}  student's Google id_token
 *   assessmentId    {string}
 *   itemId          {string}
 *   courseSheetId   {string}  course spreadsheet (shared with students)
 *   privateSheetId  {string}  teacher-only spreadsheet (answer keys)
 *   answers         {Object}  student answers keyed by question/blank ID
 */

const { verifyGoogleToken } = require('../auth.js')
const { getAnswerKey, writeProgress } = require('../sheets.js')
const { computeScore } = require('../scoring.js')

/**
 * @param {import('@google-cloud/functions-framework').Request} req
 * @param {import('@google-cloud/functions-framework').Response} res
 */
async function gradeSubmission(req, res) {
  const { idToken, assessmentId, itemId, courseSheetId, privateSheetId, answers } = req.body

  if (!idToken || !assessmentId || !itemId || !courseSheetId || !privateSheetId || !answers) {
    return res.status(400).json({ error: 'Missing required fields.' })
  }

  // Step 1 — verify identity
  let student
  try {
    student = await verifyGoogleToken(idToken)
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired identity token.' })
  }

  // Step 2 — fetch answer key from private sheet
  let answerKey
  try {
    answerKey = await getAnswerKey(assessmentId, privateSheetId)
  } catch (err) {
    console.error('Failed to fetch answer key:', err.message)
    return res.status(500).json({ error: 'Could not retrieve assessment data.' })
  }

  // Step 3 — compute score server-side
  const score = computeScore(answers, answerKey)

  // Step 4 — write progress to course sheet
  try {
    await writeProgress(student.sub, itemId, score, courseSheetId)
  } catch (err) {
    console.error('Failed to write progress:', err.message)
    // Score was computed — return it even if the sheet write failed
    // Client should retry the progress write
    return res.status(207).json({ score, warning: 'Score computed but progress write failed. Please try again.' })
  }

  return res.status(200).json({ score })
}

module.exports = { gradeSubmission }
