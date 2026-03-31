/**
 * src/pages/teacher/Dashboard.jsx
 * Teacher's main dashboard. Lists all courses linked via CourseSetup and
 * provides navigation to each course's management pages. Shows an empty state
 * with a CTA when no courses are linked yet.
 */

import { useNavigate } from 'react-router-dom'
import { useCourseConfig } from '../../hooks/useCourseConfig.js'
import Button from '../../components/common/Button.jsx'

/**
 * Renders a single course card with links to all management sections.
 * @param {{ config: object, onNavigate: function }} props
 */
function CourseCard({ config, onNavigate }) {
  const id = config.classroomCourseId
  const links = [
    { label: 'Resources', path: `/teacher/course/${id}/resources` },
    { label: 'Assessments', path: `/teacher/course/${id}/assessments` },
    { label: 'Path', path: `/teacher/course/${id}/path` },
    { label: 'Grading', path: `/teacher/course/${id}/grading` },
    { label: 'Analytics', path: `/teacher/course/${id}/analytics` },
    { label: 'Progress', path: `/teacher/course/${id}/progress` },
    { label: 'Groups', path: `/teacher/course/${id}/groups` },
    { label: 'Glossary', path: `/teacher/course/${id}/glossary` },
  ]

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--spacing-lg)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ marginBottom: 'var(--spacing-sm)' }}>
        <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 4 }}>{config.name || 'Untitled Course'}</h2>
        {config.section && (
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
            Section: {config.section}
          </p>
        )}
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
          Students: {config.studentCount ?? '—'}
        </p>
        {config.linkedAt && (
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-disabled)' }}>
            Linked: {new Date(config.linkedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-md)' }}>
        {links.map((link) => (
          <button
            key={link.path}
            onClick={() => onNavigate(link.path)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-primary)',
              background: 'transparent',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
            }}
          >
            {link.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Teacher dashboard page. Reads linked courses from localStorage and renders
 * course cards. Shows a CTA to link a new course when the list is empty.
 */
export default function TeacherDashboard() {
  const { courseConfigs } = useCourseConfig()
  const navigate = useNavigate()

  return (
    <div style={{ padding: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>My Courses</h1>
        <Button onClick={() => navigate('/teacher/course/new/setup')}>
          Link New Course
        </Button>
      </div>

      {courseConfigs.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
          background: 'var(--color-surface)',
          border: '2px dashed var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          gap: 'var(--spacing-md)',
          textAlign: 'center',
          padding: 'var(--spacing-xl)',
        }}>
          <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-secondary)' }}>
            No courses linked yet.
          </p>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Link a Google Classroom course to get started.
          </p>
          <Button onClick={() => navigate('/teacher/course/new/setup')}>
            Link Your First Course
          </Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--spacing-lg)' }}>
          {courseConfigs.map((config) => (
            <CourseCard key={config.classroomCourseId} config={config} onNavigate={navigate} />
          ))}
        </div>
      )}
    </div>
  )
}
