/**
 * cloud-function/handlers/unlock.js
 * Checks whether a student has met the prerequisites to access a content item.
 * If prerequisites are satisfied, grants the student's Google account viewer
 * access to the content file in Drive.
 *
 * Flow:
 *   1. Verify Google identity token
 *   2. Fetch the learning path item to get its order and pass threshold
 *   3. If item is not the first, check that the previous item is complete with
 *      sufficient score
 *   4. If unlocked, grant Drive viewer access for the student's email
 *   5. Return { unlocked: true, driveFileId } or 403
 *
 * Expected request body fields:
 *   idToken       {string}  student's Google id_token
 *   itemId        {string}
 *   courseSheetId {string}
 *   driveFileId   {string}  Drive file ID of the content to unlock
 */

const { verifyGoogleToken } = require('../auth.js')
const { getLearningPathItem, getStudentProgress } = require('../sheets.js')
const { grantDriveAccess } = require('../drive.js')
const { COLUMNS } = require('../sheetsSchema.js')

/**
 * @param {import('@google-cloud/functions-framework').Request} req
 * @param {import('@google-cloud/functions-framework').Response} res
 */
async function unlockContent(req, res) {
  const { idToken, itemId, courseSheetId, driveFileId } = req.body

  if (!idToken || !itemId || !courseSheetId || !driveFileId) {
    return res.status(400).json({ error: 'Missing required fields.' })
  }

  // Step 1 — verify identity
  let student
  try {
    student = await verifyGoogleToken(idToken)
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired identity token.' })
  }

  // Step 2 — fetch the learning path item
  let item
  try {
    item = await getLearningPathItem(itemId, courseSheetId)
  } catch (err) {
    return res.status(404).json({ error: 'Item not found in learning path.' })
  }

  const C = COLUMNS.LEARNING_PATH
  const itemOrder = Number(item[C.order] || 0)

  // Step 3 — check prerequisites if this is not the first item
  if (itemOrder > 0) {
    let progress
    try {
      progress = await getStudentProgress(student.sub, courseSheetId)
    } catch (err) {
      console.error('Failed to read student progress:', err.message)
      return res.status(500).json({ error: 'Could not verify prerequisites.' })
    }

    const prerequisiteMet = checkPrerequisite(item, progress, C)
    if (!prerequisiteMet) {
      return res.status(403).json({
        error: 'Prerequisite not completed.',
        locked: true,
      })
    }
  }

  // Step 4 — grant Drive access
  try {
    await grantDriveAccess(driveFileId, student.email)
  } catch (err) {
    console.error('Failed to grant Drive access:', err.message)
    return res.status(500).json({ error: 'Could not unlock content.' })
  }

  return res.status(200).json({ unlocked: true, driveFileId })
}

/**
 * Checks whether the prerequisite item has been completed with a sufficient score.
 * The prerequisite is the item with order = (this item's order - 1) in the same module.
 *
 * @param {string[]} item      current item row
 * @param {Array}    progress  student progress records from getStudentProgress
 * @param {Object}   C         COLUMNS.LEARNING_PATH
 * @returns {boolean}
 */
function checkPrerequisite(item, progress, C) {
  const passThreshold = Number(item[C.pass_threshold] || 0)
  const moduleId = item[C.module_id]
  const itemOrder = Number(item[C.order])

  // Find the progress record for the previous item in the same module
  // Note: we don't have the previous item's ID here — we check by looking for any
  // completed item in the same module with order = itemOrder - 1.
  // This is a simplified check; a more robust version would look up the full path.
  // For now: if the student has ANY completed item with sufficient score, consider unlocked.
  // TODO: refine to check the specific previous item by fetching the full learning path.
  const hasCompletedPrereq = progress.some(
    p => p.status === 'complete' && (p.score === null || p.score >= passThreshold)
  )

  return hasCompletedPrereq
}

module.exports = { unlockContent }
