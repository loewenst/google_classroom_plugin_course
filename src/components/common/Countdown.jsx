/**
 * src/components/common/Countdown.jsx
 * Displays a countdown to a due date. Shows "X days left" or "Overdue"
 * with distinct styling for overdue items.
 */

import React, { useMemo } from 'react'

/**
 * @param {{ dueDate: string }} props - ISO date string for the due date.
 */
function Countdown({ dueDate }) {
  const { text, overdue } = useMemo(() => {
    if (!dueDate) return { text: null, overdue: false }
    const due = new Date(dueDate)
    const now = new Date()
    const diffMs = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`, overdue: true }
    }
    if (diffDays === 0) {
      return { text: 'Due today', overdue: false }
    }
    return { text: `${diffDays} day${diffDays === 1 ? '' : 's'} left`, overdue: false }
  }, [dueDate])

  if (!text) return null

  return (
    <span className={`countdown ${overdue ? 'countdown--overdue' : 'countdown--upcoming'}`}>
      {text}
    </span>
  )
}

export default Countdown
