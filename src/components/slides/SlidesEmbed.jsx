/**
 * src/components/slides/SlidesEmbed.jsx
 * Renders a Google Slides presentation as an embedded iframe.
 * Uses the Google Slides publish embed URL format.
 */

import React from 'react'

/**
 * @param {{ driveFileId: string }} props
 */
function SlidesEmbed({ driveFileId }) {
  const embedUrl = `https://docs.google.com/presentation/d/${driveFileId}/embed?start=false&loop=false&delayms=0`

  return (
    <div className="slides-embed">
      <iframe
        src={embedUrl}
        title="Google Slides Presentation"
        className="slides-embed__iframe"
        allowFullScreen
        allow="autoplay"
        frameBorder="0"
      />
    </div>
  )
}

export default SlidesEmbed
