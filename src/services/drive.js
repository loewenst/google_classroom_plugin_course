/**
 * src/services/drive.js
 * Google Drive API v3 service layer.
 * Responsible for file uploads (multipart), folder creation, and permission
 * management. Components must NOT import this file directly — use hooks instead.
 */

const DRIVE_BASE = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3'

/**
 * Uploads a file to Google Drive using multipart upload.
 * Optionally requests Drive to convert the file to a Google format
 * (e.g., PPTX → Google Slides).
 *
 * @param {File} file - The File object to upload.
 * @param {string|null} folderId - Drive folder ID to place the file in, or null for root.
 * @param {string} accessToken - OAuth access token with drive scope.
 * @param {string|null} convertTo - Target Google MIME type for conversion, or null to keep original.
 * @returns {Promise<{ id: string, name: string, mimeType: string }>} The created Drive file metadata.
 * @throws {Error} On non-2xx responses.
 */
export async function uploadFile(file, folderId, accessToken, convertTo = null) {
  const metadata = {
    name: file.name,
    ...(convertTo ? { mimeType: convertTo } : {}),
    ...(folderId ? { parents: [folderId] } : {}),
  }

  const form = new FormData()
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  )
  form.append('file', file)

  const url = `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,mimeType`

  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`uploadFile failed (${response.status}): ${err.error?.message || response.statusText}`)
  }

  return response.json()
}

/**
 * Creates a folder in Google Drive.
 * @param {string} name - Folder display name.
 * @param {string|null} parentId - Parent folder ID, or null for root.
 * @param {string} accessToken - OAuth access token with drive scope.
 * @returns {Promise<{ id: string, name: string }>} The created folder metadata.
 * @throws {Error} On non-2xx responses.
 */
export async function createFolder(name, parentId, accessToken) {
  const metadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    ...(parentId ? { parents: [parentId] } : {}),
  }

  const response = await fetch(`${DRIVE_BASE}/files?fields=id,name`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`createFolder failed (${response.status}): ${err.error?.message || response.statusText}`)
  }

  return response.json()
}

/**
 * Grants the cloud function's service account read access to a Drive file.
 * This is required so the server-side code can read the file without the
 * student's credentials.
 * @param {string} fileId - Drive file ID.
 * @param {string} serviceAccountEmail - Service account email address.
 * @param {string} accessToken - OAuth access token.
 * @returns {Promise<object>} The created Permission object.
 * @throws {Error} On non-2xx responses.
 */
export async function shareWithServiceAccount(fileId, serviceAccountEmail, accessToken) {
  const response = await fetch(`${DRIVE_BASE}/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'user',
      emailAddress: serviceAccountEmail,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`shareWithServiceAccount failed (${response.status}): ${err.error?.message || response.statusText}`)
  }

  return response.json()
}

/**
 * Grants a student read (viewer) access to a Drive file.
 * Used to unlock content after a student meets a prerequisite.
 * @param {string} fileId - Drive file ID.
 * @param {string} studentEmail - Student's email address.
 * @param {string} accessToken - OAuth access token.
 * @returns {Promise<object>} The created Permission object.
 * @throws {Error} On non-2xx responses.
 */
export async function grantStudentAccess(fileId, studentEmail, accessToken) {
  const response = await fetch(`${DRIVE_BASE}/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'user',
      emailAddress: studentEmail,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`grantStudentAccess failed (${response.status}): ${err.error?.message || response.statusText}`)
  }

  return response.json()
}
