/**
 * cloud-function/drive.js
 * Google Drive API operations for the Cloud Function.
 * Uses service account credentials to grant students viewer access to content files.
 * The service account must have been granted access to the content folder during course setup.
 */

const { google } = require('googleapis')

/**
 * Builds an authenticated Drive API client using the service account key.
 * @returns {import('googleapis').drive_v3.Drive}
 */
function getDriveClient() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set.')

  const credentials = JSON.parse(keyJson)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

/**
 * Grants a student Google account viewer access to a Drive file.
 * The file must be in a folder the service account can manage.
 * Permission is persistent — the student retains access until explicitly revoked.
 *
 * @param {string} fileId        Drive file ID of the content item
 * @param {string} studentEmail  Student's Google account email
 * @returns {Promise<void>}
 */
async function grantDriveAccess(fileId, studentEmail) {
  const drive = getDriveClient()

  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'user',
      emailAddress: studentEmail,
    },
    // Suppress the email notification Drive sends by default
    sendNotificationEmail: false,
    fields: 'id',
  })
}

/**
 * Revokes a student's viewer access to a Drive file.
 * Used when resetting a student's progress.
 *
 * @param {string} fileId        Drive file ID
 * @param {string} studentEmail  Student's Google account email
 * @returns {Promise<void>}
 */
async function revokeDriveAccess(fileId, studentEmail) {
  const drive = getDriveClient()

  // Find the permission ID for this user
  const res = await drive.permissions.list({
    fileId,
    fields: 'permissions(id,emailAddress)',
  })
  const permission = (res.data.permissions || []).find(p => p.emailAddress === studentEmail)
  if (!permission) return // already no access — nothing to do

  await drive.permissions.delete({ fileId, permissionId: permission.id })
}

module.exports = { grantDriveAccess, revokeDriveAccess }
