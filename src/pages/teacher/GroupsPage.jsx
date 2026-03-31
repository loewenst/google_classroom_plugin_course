/**
 * src/pages/teacher/GroupsPage.jsx
 * Manages student groups for a course. Lists existing groups, provides a form
 * to create/edit groups with student assignment and grading mode toggle.
 */

import { useParams } from 'react-router-dom'
import { useCourseConfig } from '../../hooks/useCourseConfig.js'
import { useGroups } from '../../hooks/useGroups.js'
import { useRoster } from '../../hooks/useRoster.js'
import GroupManager from '../../components/groups/GroupManager.jsx'
import Spinner from '../../components/common/Spinner.jsx'

/**
 * Groups management page.
 */
export default function GroupsPage() {
  const { courseId } = useParams()
  const { getConfig } = useCourseConfig()
  const config = getConfig(courseId)
  const spreadsheetId = config?.courseSheetId

  const { groups, upsertGroup, deleteGroup, loading, error } = useGroups(spreadsheetId)
  const { students, loading: rosterLoading, error: rosterError } = useRoster(courseId)

  const isLoading = loading || rosterLoading

  return (
    <div style={{ padding: 'var(--spacing-lg)' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>
        Groups
      </h1>

      {!spreadsheetId && (
        <p style={{ color: 'var(--color-warning)' }}>Course not configured. Run course setup first.</p>
      )}

      {isLoading && <Spinner />}
      {error && <p style={{ color: 'var(--color-danger)' }}>Failed to load groups: {error}</p>}
      {rosterError && <p style={{ color: 'var(--color-danger)' }}>Failed to load students: {rosterError}</p>}

      {!isLoading && spreadsheetId && (
        <GroupManager
          groups={groups}
          students={students}
          onSave={upsertGroup}
          onDelete={deleteGroup}
        />
      )}
    </div>
  )
}
