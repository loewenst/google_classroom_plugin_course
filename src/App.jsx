/**
 * src/App.jsx
 * Root route configuration.
 * Handles auth gating, role-based default redirects, and top-level route structure.
 * All routes are nested under HashRouter (defined in main.jsx).
 *
 * Route tree:
 *   /teacher/*  → TeacherLayout (Outlet) + nested teacher pages
 *   /student/*  → StudentLayout (Outlet) + nested student pages
 *   *           → RoleRedirect (navigates based on role, defaults to /teacher)
 */

import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth/useAuth.js'
import { useCourse } from './hooks/useCourse.js'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
import Spinner from './components/common/Spinner.jsx'
import TeacherLayout from './components/layout/TeacherLayout.jsx'
import StudentLayout from './components/layout/StudentLayout.jsx'
import Login from './pages/Login.jsx'
import Join from './pages/Join.jsx'

// Teacher pages
import TeacherDashboard from './pages/teacher/Dashboard.jsx'
import CourseSetup from './pages/teacher/CourseSetup.jsx'
import ResourceUpload from './pages/teacher/ResourceUpload.jsx'
import AssessmentBuilder from './pages/teacher/AssessmentBuilder.jsx'
import LearningPathPage from './pages/teacher/LearningPathPage.jsx'
import GroupsPage from './pages/teacher/GroupsPage.jsx'
import GlossaryEditor from './pages/teacher/GlossaryEditor.jsx'
import GradingQueue from './pages/teacher/GradingQueue.jsx'
import Analytics from './pages/teacher/Analytics.jsx'
import ProgressOverview from './pages/teacher/ProgressOverview.jsx'

// Student pages
import StudentDashboard from './pages/student/Dashboard.jsx'
import ContentViewer from './pages/student/ContentViewer.jsx'
import AssessmentPage from './pages/student/AssessmentPage.jsx'
import StudentCertificate from './pages/student/Certificate.jsx'

/**
 * Redirects to the appropriate dashboard based on role.
 * Waits for useCourse to resolve before redirecting so students
 * don't get sent to the teacher dashboard.
 */
function RoleRedirect() {
  const { role, loading } = useCourse()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (role === 'student') return <Navigate to="/student" replace />
  return <Navigate to="/teacher" replace />
}

/**
 * Renders the full authenticated route tree.
 * Should only be mounted when a user is signed in.
 */
function AuthenticatedApp() {
  return (
    <Routes>
      {/* ── Teacher routes ─────────────────────────────────────────── */}
      <Route
        path="/teacher"
        element={
          <ErrorBoundary>
            <TeacherLayout />
          </ErrorBoundary>
        }
      >
        <Route index element={<TeacherDashboard />} />
        <Route path="course/:courseId/setup" element={<CourseSetup />} />
        <Route path="course/:courseId/resources" element={<ResourceUpload />} />
        <Route path="course/:courseId/assessments" element={<AssessmentBuilder />} />
        <Route path="course/:courseId/path" element={<LearningPathPage />} />
        <Route path="course/:courseId/groups" element={<GroupsPage />} />
        <Route path="course/:courseId/glossary" element={<GlossaryEditor />} />
        <Route path="course/:courseId/grading" element={<GradingQueue />} />
        <Route path="course/:courseId/analytics" element={<Analytics />} />
        <Route path="course/:courseId/progress" element={<ProgressOverview />} />
      </Route>

      {/* ── Student routes ─────────────────────────────────────────── */}
      <Route
        path="/student"
        element={
          <ErrorBoundary>
            <StudentLayout />
          </ErrorBoundary>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="course/:courseId/content/:itemId" element={<ContentViewer />} />
        <Route path="course/:courseId/assessment/:itemId" element={<AssessmentPage />} />
        <Route path="course/:courseId/certificate" element={<StudentCertificate />} />
      </Route>

      {/* ── Default ────────────────────────────────────────────────── */}
      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  )
}

/**
 * Top-level component. Guards routes behind authentication state.
 */
export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  // Allow the join route before auth check so students can follow links
  const hash = window.location.hash || ''
  if (hash.startsWith('#/join/')) {
    return (
      <Routes>
        <Route path="/join/:courseSheetId/:classroomCourseId" element={<Join />} />
        <Route path="*" element={<Join />} />
      </Routes>
    )
  }

  if (!user) {
    return <Login />
  }

  return <AuthenticatedApp />
}
