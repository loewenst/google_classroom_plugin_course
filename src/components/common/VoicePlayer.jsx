/**
 * src/components/common/VoicePlayer.jsx
 * Renders an HTML audio element for a Google Drive audio file.
 * Constructs the Drive file download URL and uses the access token
 * for authentication via a fetch-then-blob-URL approach to enable
 * proper authorization headers.
 */

import React, { useEffect, useRef, useState } from 'react'
import Spinner from './Spinner.jsx'

/**
 * @param {{ driveFileId: string, accessToken: string }} props
 */
function VoicePlayer({ driveFileId, accessToken }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const prevBlobUrl = useRef(null)

  useEffect(() => {
    if (!driveFileId || !accessToken) return

    setLoading(true)
    setError(null)

    const url = `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`

    fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((resp) => {
        if (!resp.ok) throw new Error(`Drive file fetch failed (${resp.status})`)
        return resp.blob()
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob)
        if (prevBlobUrl.current) {
          URL.revokeObjectURL(prevBlobUrl.current)
        }
        prevBlobUrl.current = objectUrl
        setBlobUrl(objectUrl)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))

    return () => {
      if (prevBlobUrl.current) {
        URL.revokeObjectURL(prevBlobUrl.current)
      }
    }
  }, [driveFileId, accessToken])

  if (loading) return <Spinner size="sm" />
  if (error) return <p className="voice-player__error">Could not load audio: {error}</p>
  if (!blobUrl) return null

  return (
    <audio
      className="voice-player"
      src={blobUrl}
      controls
      aria-label="Audio playback"
    />
  )
}

export default VoicePlayer
