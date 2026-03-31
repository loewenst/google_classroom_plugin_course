/**
 * src/utils/fileParser.js
 * File type detection and Drive upload configuration helpers.
 * Responsible for inspecting a File object and returning metadata needed
 * to decide how to render it (PDF viewer, Slides embed, etc.) and how
 * to upload it to Google Drive (whether to request format conversion).
 */

// Google Slides MIME type — Drive converts uploaded PPTX to this format
const GOOGLE_SLIDES_MIME = 'application/vnd.google-apps.presentation'

/**
 * Maps common MIME types and file extensions to a simplified type token
 * used by SlideViewer to pick the correct renderer.
 */
const MIME_TO_TYPE = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'slides',
  'application/vnd.ms-powerpoint': 'slides',
  'application/vnd.google-apps.presentation': 'slides',
  'text/plain': 'text',
  'text/markdown': 'text',
}

/**
 * Determines the simplified type token for a file based on MIME type and extension.
 * @param {File} file
 * @returns {'pdf'|'slides'|'text'|'unknown'}
 */
function detectType(file) {
  if (MIME_TO_TYPE[file.type]) {
    return MIME_TO_TYPE[file.type]
  }
  const ext = file.name.split('.').pop().toLowerCase()
  const extMap = {
    pdf: 'pdf',
    pptx: 'slides',
    ppt: 'slides',
    txt: 'text',
    md: 'text',
  }
  return extMap[ext] || 'unknown'
}

/**
 * Parses a File object and returns display metadata.
 * @param {File} file - A browser File object.
 * @returns {{ type: string, mimeType: string, name: string }}
 */
export function parseFile(file) {
  if (!(file instanceof File)) {
    throw new Error('parseFile: argument must be a File object.')
  }
  return {
    type: detectType(file),
    mimeType: file.type,
    name: file.name,
  }
}

/**
 * Returns Drive upload configuration for a file:
 *   - uploadMimeType: the MIME type to send in the upload request
 *   - convertTo: if set, the target MIME type to request conversion to (Google format)
 *
 * PPTX files are converted to Google Slides so they can be embedded via the
 * Google Slides iframe embed URL. PDFs are uploaded as-is and served via Drive.
 *
 * @param {File} file
 * @returns {{ uploadMimeType: string, convertTo: string|null }}
 */
export function getDriveUploadConfig(file) {
  if (!(file instanceof File)) {
    throw new Error('getDriveUploadConfig: argument must be a File object.')
  }

  const isPptx =
    file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    file.type === 'application/vnd.ms-powerpoint' ||
    file.name.toLowerCase().endsWith('.pptx') ||
    file.name.toLowerCase().endsWith('.ppt')

  return {
    uploadMimeType: file.type || 'application/octet-stream',
    convertTo: isPptx ? GOOGLE_SLIDES_MIME : null,
  }
}
