/**
 * src/components/certificate/Certificate.jsx
 * Rendered completion certificate with a jsPDF export button.
 * Props:
 *   studentName  {string}
 *   courseName   {string}
 *   completedAt  {string}  ISO date string
 */

import { useRef } from 'react'

/**
 * Generates and downloads a PDF certificate using jsPDF.
 * @param {string} studentName
 * @param {string} courseName
 * @param {string} completedAt
 */
async function downloadPdf(studentName, courseName, completedAt) {
  // Dynamic import to avoid SSR issues and keep bundle lean
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  // Border
  doc.setDrawColor(66, 133, 244) // Google Blue
  doc.setLineWidth(3)
  doc.rect(10, 10, pageW - 20, pageH - 20)
  doc.setLineWidth(1)
  doc.rect(13, 13, pageW - 26, pageH - 26)

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(66, 133, 244)
  doc.text('Certificate of Completion', pageW / 2, 50, { align: 'center' })

  // Body
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(14)
  doc.setTextColor(50, 50, 50)
  doc.text('This is to certify that', pageW / 2, 75, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(33, 33, 33)
  doc.text(studentName, pageW / 2, 95, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(14)
  doc.setTextColor(50, 50, 50)
  doc.text('has successfully completed', pageW / 2, 115, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(66, 133, 244)
  doc.text(courseName, pageW / 2, 133, { align: 'center' })

  const dateStr = completedAt
    ? new Date(completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  doc.text(`Completed on ${dateStr}`, pageW / 2, 155, { align: 'center' })

  doc.save(`certificate-${studentName.replace(/\s+/g, '-').toLowerCase()}.pdf`)
}

/**
 * @param {{ studentName: string, courseName: string, completedAt: string }} props
 */
export default function Certificate({ studentName, courseName, completedAt }) {
  const certRef = useRef(null)

  const dateStr = completedAt
    ? new Date(completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
      {/* Rendered certificate */}
      <div
        ref={certRef}
        style={{
          width: '100%',
          maxWidth: 720,
          background: '#fff',
          border: '4px solid #4285F4',
          borderRadius: 'var(--radius-lg)',
          padding: '48px 64px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)',
          position: 'relative',
        }}
      >
        {/* Inner border */}
        <div style={{
          position: 'absolute',
          inset: 10,
          border: '1px solid #4285F4',
          borderRadius: 'var(--radius-md)',
          pointerEvents: 'none',
        }} />

        <p style={{ fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#666', marginBottom: 16 }}>
          Certificate of Completion
        </p>
        <p style={{ fontSize: '1rem', color: '#555', marginBottom: 8 }}>This is to certify that</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#222', marginBottom: 8, lineHeight: 1.2 }}>
          {studentName}
        </h1>
        <p style={{ fontSize: '1rem', color: '#555', marginBottom: 8 }}>has successfully completed</p>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#4285F4', marginBottom: 24 }}>
          {courseName}
        </h2>
        <div style={{ width: 80, height: 2, background: '#4285F4', margin: '0 auto 24px' }} />
        <p style={{ fontSize: '0.9rem', color: '#888' }}>Completed on {dateStr}</p>
      </div>

      {/* Download button */}
      <button
        onClick={() => downloadPdf(studentName, courseName, completedAt)}
        style={{
          padding: '12px 32px',
          borderRadius: 'var(--radius-md)',
          background: '#4285F4',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: 'var(--font-size-md)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        Download PDF Certificate
      </button>
    </div>
  )
}
