/**
 * cloud-function/index.js
 * Google Cloud Function entry point.
 * Handles CORS, routes requests to grade or unlock handlers.
 * All business logic lives in handlers/ — this file is routing only.
 *
 * Deploy command (from cloud-function/ directory):
 *   gcloud functions deploy classroomApp \
 *     --runtime nodejs22 \
 *     --trigger-http \
 *     --allow-unauthenticated \
 *     --env-vars-file .env.yaml
 */

const { gradeSubmission } = require('./handlers/grade.js')
const { unlockContent } = require('./handlers/unlock.js')
const { exchangeToken, refreshToken } = require('./handlers/tokenExchange.js')

/**
 * Main Cloud Function handler.
 * @param {import('@google-cloud/functions-framework').Request} req
 * @param {import('@google-cloud/functions-framework').Response} res
 */
exports.classroomApp = async (req, res) => {
  // CORS headers — restrict to configured origin in production
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*'
  res.set('Access-Control-Allow-Origin', allowedOrigin)
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type')

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).send('')
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are accepted.' })
  }

  const { action } = req.body || {}

  switch (action) {
    case 'grade':
      return gradeSubmission(req, res)
    case 'unlock':
      return unlockContent(req, res)
    case 'exchangeToken':
      return exchangeToken(req, res)
    case 'refreshToken':
      return refreshToken(req, res)
    default:
      return res.status(400).json({ error: `Unknown action: "${action}". Expected "grade", "unlock", "exchangeToken", or "refreshToken".` })
  }
}
