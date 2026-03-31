/**
 * src/components/layout/TeacherLayout.jsx
 * Outlet-based layout for all teacher pages. Renders a top nav bar with
 * links to each section of the active course, plus a course selector.
 * Course-specific links are only shown when a course is selected.
 */

import React from 'react'
import { Outlet, useParams } from 'react-router-dom'
import Nav from './Nav.jsx'
import { useCourse } from '../../hooks/useCourse.js'

function TeacherLayout() {
  const { courseId } = useParams()
  const { courses, activeCourse, setActiveCourse } = useCourse()

  // Base links always shown
  const baseLinks = [
    { to: '/teacher', label: 'Dashboard' },
  ]

  // Course-specific links only when a course is in context
  const courseLinks = courseId
    ? [
        { to: `/teacher/course/${courseId}/setup`, label: 'Setup' },
        { to: `/teacher/course/${courseId}/resources`, label: 'Resources' },
        { to: `/teacher/course/${courseId}/assessments`, label: 'Assessments' },
        { to: `/teacher/course/${courseId}/path`, label: 'Path' },
        { to: `/teacher/course/${courseId}/groups`, label: 'Groups' },
        { to: `/teacher/course/${courseId}/glossary`, label: 'Glossary' },
        { to: `/teacher/course/${courseId}/grading`, label: 'Grading' },
        { to: `/teacher/course/${courseId}/analytics`, label: 'Analytics' },
        { to: `/teacher/course/${courseId}/progress`, label: 'Progress' },
      ]
    : []

  const links = [...baseLinks, ...courseLinks]

  return (
    <div className="layout layout--teacher">
      <Nav links={links} title="Teacher Dashboard" />

      {courses.length > 0 && (
        <div className="layout__course-selector">
          <label htmlFor="course-select" className="layout__course-label">Course:</label>
          <select
            id="course-select"
            className="layout__course-select"
            value={activeCourse?.id || ''}
            onChange={(e) => {
              const course = courses.find((c) => c.id === e.target.value)
              if (course) setActiveCourse(course)
            }}
          >
            <option value="">Select a course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <main className="layout__main">
        <Outlet />
      </main>
    </div>
  )
}

export default TeacherLayout
