/**
 * cloud-function/auth.js
 * Google identity token verification for the Cloud Function.
 * Verifies that an id_token was issued by Google and intended for this app.
 * Returns the decoded token payload on success; throws on failure.
 */

const { OAuth2Client } = require('google-auth-library')

// Reuse client across warm invocations
const oauth2Client = new OAuth2Client()

/**
 * Verifies a Google id_token and returns the decoded payload.
 * @param {string} idToken
 * @returns {Promise<{ sub: string, email: string, name: string }>}
 * @throws {Error} if the token is invalid or the audience does not match
 */
async function verifyGoogleToken(idToken) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is not set.')
  }

  const ticket = await oauth2Client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  })

  const payload = ticket.getPayload()
  if (!payload) throw new Error('Empty token payload.')

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
  }
}

module.exports = { verifyGoogleToken }
