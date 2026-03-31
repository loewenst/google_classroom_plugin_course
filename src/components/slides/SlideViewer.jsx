/**
 * src/components/slides/SlideViewer.jsx
 * Orchestrates slide-based content rendering. Detects file type and mounts
 * the appropriate renderer (PdfSlide, TextSlide, SlidesEmbed). Tracks the
 * current slide number and injects SlideCheckpoint when the slide matches
 * a configured assessment checkpoint.
 *
 * Props:
 *   driveFileId       {string}
 *   fileType          {'pdf' | 'text' | 'google_slides'}
 *   accessToken       {string}
 *   checkpoints       {Array<{ slideNumber: number, assessmentId: string }>}
 *   courseId          {string}
 *   itemId            {string}
 *   spreadsheetId     {string}
 *   onComplete        {() => void}  called when last slide + all checkpoints done
 */

import { useState, useCallback } from 'react'
import PdfSlide from './PdfSlide.jsx'
import TextSlide from './TextSlide.jsx'
import SlidesEmbed from './SlidesEmbed.jsx'
import SlideCheckpoint from './SlideCheckpoint.jsx'

export default function SlideViewer({
  driveFileId,
  fileType,
  accessToken,
  checkpoints = [],
  courseId,
  itemId,
  spreadsheetId,
  onComplete,
}) {
  const [currentSlide, setCurrentSlide] = useState(1)
  const [totalSlides, setTotalSlides] = useState(null)
  const [completedCheckpoints, setCompletedCheckpoints] = useState(new Set())

  // Find checkpoint for the current slide, if any
  const activeCheckpoint = checkpoints.find(
    cp => cp.slideNumber === currentSlide && !completedCheckpoints.has(cp.assessmentId)
  )

  const handleCheckpointComplete = useCallback((assessmentId) => {
    setCompletedCheckpoints(prev => new Set([...prev, assessmentId]))
  }, [])

  const handlePageChange = useCallback((page, total) => {
    setCurrentSlide(page)
    if (total) setTotalSlides(total)
    // Call onComplete when reaching the final slide with all checkpoints done
    if (page === total && completedCheckpoints.size === checkpoints.length) {
      onComplete?.()
    }
  }, [completedCheckpoints, checkpoints.length, onComplete])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {/* Slide renderer */}
      {fileType === 'pdf' && (
        <PdfSlide driveFileId={driveFileId} accessToken={accessToken} onPageChange={handlePageChange} />
      )}
      {fileType === 'text' && (
        <TextSlide driveFileId={driveFileId} accessToken={accessToken} onPageChange={handlePageChange} />
      )}
      {fileType === 'google_slides' && (
        <SlidesEmbed driveFileId={driveFileId} />
      )}

      {/* Checkpoint assessment — blocks navigation until complete */}
      {activeCheckpoint && (
        <SlideCheckpoint
          assessmentId={activeCheckpoint.assessmentId}
          slideNumber={currentSlide}
          courseId={courseId}
          itemId={itemId}
          spreadsheetId={spreadsheetId}
          onComplete={() => handleCheckpointComplete(activeCheckpoint.assessmentId)}
        />
      )}

      {/* Slide counter */}
      {totalSlides && (
        <p style={{ textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          Slide {currentSlide} of {totalSlides}
        </p>
      )}
    </div>
  )
}
