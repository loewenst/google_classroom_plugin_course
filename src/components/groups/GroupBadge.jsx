/**
 * src/components/groups/GroupBadge.jsx
 * Small badge showing a student's group name.
 *
 * Props:
 *   groupName  {string}
 *   color      {string}  optional hex color
 */

export default function GroupBadge({ groupName, color = 'var(--color-primary)' }) {
  if (!groupName) return null
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 10px',
      borderRadius: '12px',
      background: color + '22',
      border: `1px solid ${color}`,
      color: color,
      fontSize: 'var(--font-size-sm)',
      fontWeight: 600,
    }}>
      {groupName}
    </span>
  )
}
