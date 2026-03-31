/**
 * src/components/slides/PdfSlide.jsx
 * PDF viewer using pdfjs-dist. Fetches the PDF from Drive using the access token,
 * renders each page to a canvas element, and notifies the parent of page changes
 * for checkpoint tracking. Supports keyboard and button navigation.
 *
 * PDF.js worker is loaded from CDN to avoid bundler issues with worker files.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import Spinner from '../common/Spinner.jsx'

// PDF.js CDN worker — avoids bundler complexity with worker files
const PDFJS_CDN_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.mjs'

/**
 * Lazily initializes and returns the pdfjs-dist module with the worker set.
 * @returns {Promise<object>}
 */
async function getPdfJs() {
  const pdfjsLib = await import('pdfjs-dist')
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_CDN_WORKER
  }
  return pdfjsLib
}

/**
 * @param {{ driveFileId: string, accessToken: string, onPageChange?: function(number, number) }} props
 */
function PdfSlide({ driveFileId, accessToken, onPageChange }) {
  const canvasRef = useRef(null)
  const renderTaskRef = useRef(null)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load the PDF document
  useEffect(() => {
    if (!driveFileId || !accessToken) return

    setLoading(true)
    setError(null)
    setPdfDoc(null)
    setCurrentPage(1)

    const load = async () => {
      try {
        const resp = await fetch(
          `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        if (!resp.ok) throw new Error(`Failed to fetch PDF from Drive (${resp.status})`)
        const arrayBuffer = await resp.arrayBuffer()

        const pdfjsLib = await getPdfJs()
        const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        setPdfDoc(doc)
        setTotalPages(doc.numPages)
        setCurrentPage(1)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [driveFileId, accessToken])

  // Render current page to canvas
  const renderPage = useCallback(async (doc, pageNum) => {
    if (!doc || !canvasRef.current) return

    // Cancel any in-progress render
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel()
      renderTaskRef.current = null
    }

    try {
      const page = await doc.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = canvasRef.current
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')

      const task = page.render({ canvasContext: ctx, viewport })
      renderTaskRef.current = task
      await task.promise
      renderTaskRef.current = null
    } catch (err) {
      if (err?.name === 'RenderingCancelledException') return // expected on rapid nav
      setError(`Render failed: ${err.message}`)
    }
  }, [])

  useEffect(() => {
    if (pdfDoc && currentPage) {
      renderPage(pdfDoc, currentPage)
    }
  }, [pdfDoc, currentPage, renderPage])

  // Notify parent of page changes
  useEffect(() => {
    if (totalPages > 0) {
      onPageChange?.(currentPage, totalPages)
    }
  }, [currentPage, totalPages, onPageChange])

  const handlePrev = () => setCurrentPage((p) => Math.max(1, p - 1))
  const handleNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1))

  if (loading) return <Spinner size="md" />
  if (error) return (
    <div style={{ padding: 'var(--spacing-md)', color: 'var(--color-danger)', background: 'var(--color-danger-light)', borderRadius: 'var(--radius-md)' }}>
      Could not load PDF: {error}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-md)' }}>
      {/* Canvas */}
      <div style={{ maxWidth: '100%', overflowX: 'auto', boxShadow: 'var(--shadow-md)', borderRadius: 'var(--radius-sm)' }}>
        <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%' }} />
      </div>

      {/* Navigation controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
        <button
          onClick={handlePrev}
          disabled={currentPage <= 1}
          style={{
            padding: '8px 20px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            cursor: currentPage <= 1 ? 'default' : 'pointer',
            opacity: currentPage <= 1 ? 0.4 : 1,
          }}
          aria-label="Previous page"
        >
          Previous
        </button>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', minWidth: 90, textAlign: 'center' }}>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          style={{
            padding: '8px 20px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            cursor: currentPage >= totalPages ? 'default' : 'pointer',
            opacity: currentPage >= totalPages ? 0.4 : 1,
          }}
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default PdfSlide
