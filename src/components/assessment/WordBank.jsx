/**
 * src/components/assessment/WordBank.jsx
 * Word bank interaction for matching and fill-in-the-blank assessments.
 *
 * Interaction model:
 *   Desktop (pointer: fine) — drag-and-drop via @dnd-kit
 *   Mobile  (pointer: coarse) — tap-to-select then tap-to-place
 *     Tap a word in the bank → it becomes "selected" (highlighted)
 *     Tap a blank → the selected word is placed there
 *     Tap a filled blank → the word returns to the bank
 *     Tap a different bank word while one is selected → switches selection
 *
 * Props:
 *   blanks     {Array<{ id: string, label: string }>}  blank slots
 *   wordBank   {string[]}                              available words (includes distractors)
 *   onAnswer   {(answers: Record<string, string>) => void}
 *   disabled   {boolean}
 */

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { useIsMobile } from '../../hooks/useIsMobile.js'

// ─── Drag-and-drop sub-components ────────────────────────────────────────────

function DraggableWord({ id, word, isPlaced }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })
  const style = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    opacity: isDragging ? 0.4 : isPlaced ? 0.3 : 1,
    cursor: isPlaced ? 'default' : 'grab',
    ...wordChipStyle,
  }
  return (
    <span ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {word}
    </span>
  )
}

function DroppableBlank({ id, label, placedWord }) {
  const { isOver, setNodeRef } = useDroppable({ id })
  const style = {
    ...blankStyle,
    background: isOver ? 'var(--color-primary-light)' : placedWord ? '#e8f5e9' : '#fff',
    borderColor: isOver ? 'var(--color-primary)' : placedWord ? 'var(--color-success)' : 'var(--color-border)',
  }
  return (
    <span ref={setNodeRef} style={style}>
      {label && <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', display: 'block' }}>{label}</span>}
      {placedWord || <span style={{ color: 'var(--color-text-disabled)' }}>drop here</span>}
    </span>
  )
}

// ─── Desktop drag-and-drop layout ────────────────────────────────────────────

function DragDropWordBank({ blanks, wordBank, placements, onDrop, onClear }) {
  const [activeWord, setActiveWord] = useState(null)
  const sensors = useSensors(useSensor(PointerSensor))

  // Words still available in the bank (not placed in any blank)
  const placedWords = new Set(Object.values(placements))
  const availableWords = wordBank.filter(w => !placedWords.has(w))

  function handleDragStart(event) {
    setActiveWord(event.active.id)
  }

  function handleDragEnd(event) {
    const { active, over } = event
    setActiveWord(null)
    if (!over) return

    const word = active.id
    const blankId = over.id

    // Prevent dropping on a blank that already has a word
    if (placements[blankId]) return

    onDrop(blankId, word)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={sectionStyle}>
        <p style={labelStyle}>Blanks</p>
        <div style={blanksRowStyle}>
          {blanks.map(blank => (
            <div key={blank.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DroppableBlank id={blank.id} label={blank.label} placedWord={placements[blank.id]} />
              {placements[blank.id] && (
                <button style={clearBtnStyle} onClick={() => onClear(blank.id)} title="Remove">✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <p style={labelStyle}>Word Bank</p>
        <div style={bankRowStyle}>
          {availableWords.map(word => (
            <DraggableWord key={word} id={word} word={word} isPlaced={false} />
          ))}
          {availableWords.length === 0 && (
            <span style={{ color: 'var(--color-text-disabled)', fontSize: 'var(--font-size-sm)' }}>
              All words placed
            </span>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeWord && <span style={{ ...wordChipStyle, boxShadow: 'var(--shadow-md)' }}>{activeWord}</span>}
      </DragOverlay>
    </DndContext>
  )
}

// ─── Mobile tap-to-place layout ───────────────────────────────────────────────

function TapWordBank({ blanks, wordBank, placements, onDrop, onClear }) {
  const [selectedWord, setSelectedWord] = useState(null)

  const placedWords = new Set(Object.values(placements))
  const availableWords = wordBank.filter(w => !placedWords.has(w))

  function handleWordTap(word) {
    setSelectedWord(prev => (prev === word ? null : word))
  }

  function handleBlankTap(blankId) {
    if (placements[blankId]) {
      // Return placed word to bank
      onClear(blankId)
      return
    }
    if (!selectedWord) return
    onDrop(blankId, selectedWord)
    setSelectedWord(null)
  }

  return (
    <div>
      <div style={sectionStyle}>
        <p style={labelStyle}>Blanks — tap a word first, then tap a blank to place it</p>
        <div style={blanksRowStyle}>
          {blanks.map(blank => (
            <button
              key={blank.id}
              style={{
                ...blankStyle,
                cursor: 'pointer',
                border: `2px solid ${placements[blank.id] ? 'var(--color-success)' : selectedWord ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: placements[blank.id] ? '#e8f5e9' : selectedWord ? 'var(--color-primary-light)' : '#fff',
              }}
              onClick={() => handleBlankTap(blank.id)}
            >
              {blank.label && (
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', display: 'block' }}>
                  {blank.label}
                </span>
              )}
              {placements[blank.id] || <span style={{ color: 'var(--color-text-disabled)' }}>tap to place</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <p style={labelStyle}>Word Bank</p>
        <div style={bankRowStyle}>
          {availableWords.map(word => (
            <button
              key={word}
              style={{
                ...wordChipStyle,
                cursor: 'pointer',
                background: selectedWord === word ? 'var(--color-primary)' : 'var(--color-primary-light)',
                color: selectedWord === word ? '#fff' : 'var(--color-primary)',
                border: `2px solid ${selectedWord === word ? 'var(--color-primary-dark)' : 'var(--color-primary)'}`,
              }}
              onClick={() => handleWordTap(word)}
            >
              {word}
            </button>
          ))}
          {availableWords.length === 0 && (
            <span style={{ color: 'var(--color-text-disabled)', fontSize: 'var(--font-size-sm)' }}>
              All words placed
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function WordBank({ blanks, wordBank, onAnswer, disabled }) {
  const isMobile = useIsMobile()
  const [placements, setPlacements] = useState({})

  const handleDrop = useCallback((blankId, word) => {
    setPlacements(prev => {
      const next = { ...prev, [blankId]: word }
      onAnswer(next)
      return next
    })
  }, [onAnswer])

  const handleClear = useCallback((blankId) => {
    setPlacements(prev => {
      const next = { ...prev }
      delete next[blankId]
      onAnswer(next)
      return next
    })
  }, [onAnswer])

  const handleReset = () => {
    setPlacements({})
    onAnswer({})
  }

  if (disabled) {
    // Read-only view — show final placements without interaction
    return (
      <div style={containerStyle}>
        <div style={blanksRowStyle}>
          {blanks.map(blank => (
            <span key={blank.id} style={{ ...blankStyle, background: '#f1f3f4', cursor: 'default' }}>
              {blank.label && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block' }}>{blank.label}</span>}
              {placements[blank.id] || '—'}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      {isMobile ? (
        <TapWordBank blanks={blanks} wordBank={wordBank} placements={placements} onDrop={handleDrop} onClear={handleClear} />
      ) : (
        <DragDropWordBank blanks={blanks} wordBank={wordBank} placements={placements} onDrop={handleDrop} onClear={handleClear} />
      )}
      {Object.keys(placements).length > 0 && (
        <button style={resetBtnStyle} onClick={handleReset}>Reset all</button>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const containerStyle = { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }
const sectionStyle = { display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }
const labelStyle = { fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontWeight: 600 }
const blanksRowStyle = { display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }
const bankRowStyle = { display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }

const wordChipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 14px',
  borderRadius: '20px',
  background: 'var(--color-primary-light)',
  color: 'var(--color-primary)',
  border: '2px solid var(--color-primary)',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 500,
  userSelect: 'none',
  touchAction: 'none',
}

const blankStyle = {
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '100px',
  minHeight: '44px',
  padding: '6px 14px',
  borderRadius: 'var(--radius-sm)',
  border: '2px dashed var(--color-border)',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 500,
  transition: 'background 0.1s, border-color 0.1s',
}

const clearBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-text-secondary)',
  fontSize: '12px',
  lineHeight: 1,
  padding: '2px 4px',
}

const resetBtnStyle = {
  alignSelf: 'flex-start',
  background: 'none',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  padding: '6px 12px',
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
  marginTop: 'var(--spacing-sm)',
}
