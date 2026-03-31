/**
 * src/components/slides/TextSlide.jsx
 * Renders a plain text or markdown file as slides.
 * Splits content on '---' (horizontal rule) to create individual slides.
 * Fetches the file content from Drive using the student's access token.
 *
 * Props:
 *   driveFileId   {string}
 *   accessToken   {string}
 *   onPageChange  {(page: number, total: number) => void}
 */

import { useState, useEffect } from 'react'
import Spinner from '../common/Spinner.jsx'
import Button from '../common/Button.jsx'

export default function TextSlide({ driveFileId, accessToken, onPageChange }) {
  const [slides, setSlides] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchContent() {
      try {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        if (!res.ok) throw new Error(`Drive fetch failed: ${res.status}`)
        const text = await res.text()
        const pages = text.split(/\n---\n/).map(s => s.trim()).filter(Boolean)
        setSlides(pages.length > 0 ? pages : [text])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchContent()
  }, [driveFileId, accessToken])

  function goTo(index) {
    setCurrentIndex(index)
    onPageChange?.(index + 1, slides.length)
  }

  if (loading) return <Spinner />
  if (error) return <p style={{ color: 'var(--color-danger)' }}>Failed to load content: {error}</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--spacing-xl)',
        minHeight: '400px',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.7,
        fontSize: 'var(--font-size-md)',
      }}>
        {slides[currentIndex]}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant="secondary"
          onClick={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0}
        >
          ← Previous
        </Button>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          {currentIndex + 1} / {slides.length}
        </span>
        <Button
          variant="secondary"
          onClick={() => goTo(currentIndex + 1)}
          disabled={currentIndex === slides.length - 1}
        >
          Next →
        </Button>
      </div>
    </div>
  )
}
