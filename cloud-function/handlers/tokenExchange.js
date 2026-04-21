/**
 * cloud-function/handlers/tokenExchange.js
 * Proxies OAuth token exchange and refresh calls to Google's token endpoint.
 * Keeps GOOGLE_CLIENT_SECRET server-side — it is never sent to the browser.
 */

// Read once at module load — reused across warm invocations
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

/**
 * Exchanges a PKCE authorization code for access, refresh, and id tokens.
 * @param {import('@google-cloud/functions-framework').Request} req
 * @param {import('@google-cloud/functions-framework').Response} res
 */
async function exchangeToken(req, res) {
  const { code, codeVerifier, redirectUri } = req.body

  if (!code || !codeVerifier || !redirectUri) {
    return res.status(400).json({ error: 'Missing required fields: code, codeVerifier, redirectUri' })
  }

  if (!CLIENT_SECRET) {
    return res.status(500).json({ error: 'GOOGLE_CLIENT_SECRET is not configured on the server.' })
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code,
    code_verifier: codeVerifier,
  })

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    return res.status(response.status).json({ error: data.error_description || data.error || 'Token exchange failed' })
  }

  return res.json(data)
}

/**
 * Uses a refresh token to obtain a new access token.
 * @param {import('@google-cloud/functions-framework').Request} req
 * @param {import('@google-cloud/functions-framework').Response} res
 */
async function refreshToken(req, res) {
  const { refreshToken: token } = req.body

  if (!token) {
    return res.status(400).json({ error: 'Missing required field: refreshToken' })
  }

  if (!CLIENT_SECRET) {
    return res.status(500).json({ error: 'GOOGLE_CLIENT_SECRET is not configured on the server.' })
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: token,
  })

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    return res.status(response.status).json({ error: data.error_description || data.error || 'Token refresh failed' })
  }

  return res.json(data)
}

module.exports = { exchangeToken, refreshToken }
