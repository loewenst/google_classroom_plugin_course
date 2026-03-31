/**
 * src/components/common/VoiceRecorder.jsx
 * Voice recording UI component. Uses the useVoiceUpload hook for recording
 * and Drive upload. Gracefully hides the record UI on unsupported browsers
 * (where MediaRecorder is not available).
 * Calls onUploadComplete(driveFileId) prop when upload finishes.
 */

import React, { useEffect, useRef } from 'react'
import { useVoiceUpload } from '../../hooks/useVoiceUpload.js'
import Button from './Button.jsx'
import Spinner from './Spinner.jsx'

/**
 * @param {{
 *   onUploadComplete: function(string),
 *   folderId?: string,
 *   label?: string
 * }} props
 */
function VoiceRecorder({ onUploadComplete, folderId, label = 'Voice Note' }) {
  // Feature detection — do not render record UI in unsupported browsers
  if (typeof MediaRecorder === 'undefined') {
    return (
      <div className="voice-recorder voice-recorder--unsupported">
        <p>Audio recording is not supported in this browser.</p>
      </div>
    )
  }

  return <VoiceRecorderInner onUploadComplete={onUploadComplete} folderId={folderId} label={label} />
}

/**
 * Inner component, only rendered when MediaRecorder is available.
 */
function VoiceRecorderInner({ onUploadComplete, folderId, label }) {
  const {
    startRecording,
    stopRecording,
    recording,
    audioBlob,
    upload,
    uploading,
    driveFileId,
    error,
  } = useVoiceUpload({ folderId })

  const audioRef = useRef(null)

  // Notify parent when upload completes
  useEffect(() => {
    if (driveFileId && onUploadComplete) {
      onUploadComplete(driveFileId)
    }
  }, [driveFileId, onUploadComplete])

  // Update audio preview src when blob changes
  useEffect(() => {
    if (audioBlob && audioRef.current) {
      const url = URL.createObjectURL(audioBlob)
      audioRef.current.src = url
      return () => URL.revokeObjectURL(url)
    }
  }, [audioBlob])

  const handleUpload = async () => {
    await upload()
  }

  return (
    <div className="voice-recorder">
      <span className="voice-recorder__label">{label}</span>

      <div className="voice-recorder__controls">
        {!recording && (
          <Button
            variant="secondary"
            onClick={startRecording}
            disabled={uploading}
            aria-label="Start recording"
          >
            Record
          </Button>
        )}

        {recording && (
          <Button
            variant="danger"
            onClick={stopRecording}
            aria-label="Stop recording"
          >
            Stop
          </Button>
        )}

        {recording && (
          <span className="voice-recorder__indicator" aria-live="polite">
            Recording...
          </span>
        )}
      </div>

      {audioBlob && (
        <div className="voice-recorder__preview">
          <audio ref={audioRef} controls className="voice-recorder__audio" />
          {!driveFileId && (
            <Button
              variant="primary"
              onClick={handleUpload}
              loading={uploading}
              disabled={uploading}
            >
              Upload
            </Button>
          )}
          {driveFileId && (
            <span className="voice-recorder__success">Uploaded successfully.</span>
          )}
        </div>
      )}

      {error && <p className="voice-recorder__error" role="alert">{error}</p>}
    </div>
  )
}

export default VoiceRecorder
