/**
 * src/components/learningPath/PathViewer.jsx
 * Student-facing learning path. Renders modules and items with locked/unlocked
 * state. Locked items display the exact unlock condition so students always
 * know what they need to do next.
 *
 * Props:
 *   modules       {Array<{ id, title, items: Array<{ id, title, type, status, score, pass_threshold, estimated_minutes, due_date }> }>}
 *   onSelectItem  {(item) => void}
 */

import ProgressBar from '../common/ProgressBar.jsx'
import Countdown from '../common/Countdown.jsx'

const STATUS_STYLES = {
  complete: { border: 'var(--color-success)', bg: '#f0faf3', icon: '✓' },
  in_progress: { border: 'var(--color-primary)', bg: 'var(--color-primary-light)', icon: '▶' },
  not_started: { border: 'var(--color-border)', bg: 'var(--color-surface)', icon: '○' },
  locked: { border: 'var(--color-border)', bg: '#f5f5f5', icon: '🔒' },
}

export default function PathViewer({ modules = [], onSelectItem }) {
  if (modules.length === 0) {
    return (
      <div className="stub-page">
        No modules yet — your teacher is still building this course.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {modules.map(mod => {
        const completed = mod.items.filter(i => i.status === 'complete').length
        return (
          <div key={mod.id} style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            {/* Module header */}
            <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 4 }}>{mod.title}</h2>
              <ProgressBar value={completed} max={mod.items.length} label={`${completed} / ${mod.items.length} complete`} />
            </div>

            {/* Items */}
            <div>
              {mod.items.map((item, idx) => {
                const s = STATUS_STYLES[item.status] || STATUS_STYLES.not_started
                const isLocked = item.status === 'locked'
                const prevItem = idx > 0 ? mod.items[idx - 1] : null

                return (
                  <div
                    key={item.id}
                    onClick={() => !isLocked && onSelectItem?.(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-md)',
                      padding: 'var(--spacing-md) var(--spacing-lg)',
                      borderBottom: idx < mod.items.length - 1 ? '1px solid var(--color-border)' : 'none',
                      background: s.bg,
                      cursor: isLocked ? 'default' : 'pointer',
                      opacity: isLocked ? 0.7 : 1,
                      transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{s.icon}</span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, marginBottom: 2 }}>{item.title}</p>

                      {/* Unlock condition */}
                      {isLocked && prevItem && (
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                          Complete <em>{prevItem.title}</em>
                          {prevItem.pass_threshold ? ` with ${prevItem.pass_threshold}%` : ''} to unlock
                        </p>
                      )}

                      {/* Score */}
                      {item.score !== null && item.score !== undefined && (
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                          Score: {item.score}%
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      {item.estimated_minutes && (
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                          ~{item.estimated_minutes} min
                        </span>
                      )}
                      {item.due_date && <Countdown dueDate={item.due_date} />}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
