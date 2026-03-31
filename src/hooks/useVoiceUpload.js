/**
 * src/hooks/useVoiceUpload.js
 * Hook for recording audio via MediaRecorder and uploading the resulting
 * blob to Google Drive. Used for student voice notes and teacher feedback.
 * Exposes: { startRecording, stopRecording, recording, audioBlob, upload, uploading, driveFileId, error }
 */

import { useState, useRef, useCallback } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { uploadFile } from '../services/drive.js'

/**
 * Manages audio recording and Drive upload lifecycle.
 * @param {{ folderId?: string }} [options] - Optional Drive folder for upload.
 * @returns {{ startRecording: function, stopRecording: function, recording: boolean, audioBlob: Blob|null, upload: function, uploading: boolean, driveFileId: string|null, error: string|null }}
 */
export function useVoiceUpload({ folderId = null } = {}) {
  const { accessToken } = useAuth()
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [driveFileId, setDriveFileId] = useState(null)
  const [error, setError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  /**
   * Starts recording from the user's microphone using MediaRecorder.
   * Throws a descriptive error if microphone permission is denied.
   * @returns {Promise<void>}
   */
  const startRecording = useCallback(async () => {
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('MediaRecorder is not supported in this browser.')
    }
    setError(null)
    setAudioBlob(null)
    setDriveFileId(null)

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      const msg = `Microphone access denied: ${err.message}`
      setError(msg)
      throw new Error(msg)
    }

    chunksRef.current = []
    const recorder = new MediaRecorder(stream)
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data)
      }
    }

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      setAudioBlob(blob)
      // Stop all microphone tracks to release the browser indicator
      stream.getTracks().forEach((track) => track.stop())
    }

    recorder.start()
    setRecording(true)
  }, [])

  /**
   * Stops the active recording. The audioBlob will be populated asynchronously
   * via the MediaRecorder onstop handler.
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }, [recording])

  /**
   * Uploads the recorded audioBlob to Google Drive.
   * Must be called after stopRecording and after audioBlob is populated.
   * @param {string} [filename] - Optional filename for the Drive file.
   * @returns {Promise<string>} The Drive file ID.
   * @throws {Error} If no audioBlob exists or the upload fails.
   */
  const upload = useCallback(
    async (filename = `voice-note-${Date.now()}.webm`) => {
      if (!audioBlob) {
        throw new Error('upload: no audio recorded yet. Call stopRecording() first.')
      }
      if (!accessToken) {
        throw new Error('upload: not authenticated.')
      }
      setUploading(true)
      setError(null)
      try {
        const file = new File([audioBlob], filename, { type: 'audio/webm' })
        const result = await uploadFile(file, folderId, accessToken, null)
        setDriveFileId(result.id)
        return result.id
      } catch (err) {
        setError(err.message)
        throw err
      } finally {
        setUploading(false)
      }
    },
    [audioBlob, accessToken, folderId]
  )

  return {
    startRecording,
    stopRecording,
    recording,
    audioBlob,
    upload,
    uploading,
    driveFileId,
    error,
  }
}
