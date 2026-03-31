/**
 * src/components/layout/StudentLayout.jsx
 * Outlet-based layout for all student pages. Renders a nav bar with
 * Dashboard link and the active course name.
 */

import React from 'react'
import { Outlet, useParams } from 'react-router-dom'
import Nav from './Nav.jsx'
import { useCourse } from '../../hooks/useCourse.js'

function StudentLayout() {
  const { courseId } = useParams()
  const { activeCourse } = useCourse()

  const links = [
    { to: '/student', label: 'Dashboard' },
    ...(courseId && activeCourse
      ? [{ to: `/student/course/${courseId}/content`, label: activeCourse.name }]
      : []),
  ]

  return (
    <div className="layout layout--student">
      <Nav links={links} title="Student Portal" />
      <main className="layout__main">
        <Outlet />
      </main>
    </div>
  )
}

export default StudentLayout
