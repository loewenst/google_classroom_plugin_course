/**
 * src/services/classroom.js
 * Google Classroom API service layer.
 * Responsible for all direct communication with the Classroom REST API v1.
 * Components must NOT import this file directly — use hooks instead.
 */

const CLASSROOM_BASE = 'https://classroom.googleapis.com/v1'

/**
 * Fetches all courses the authenticated user has access to.
 * @param {string} accessToken - OAuth access token with classroom.courses.readonly scope.
 * @returns {Promise<Array>} Array of course objects.
 * @throws {Error} On non-2xx responses.
 */
export async function getCourses(accessToken) {
  const response = await fetch(`${CLASSROOM_BASE}/courses`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`getCourses failed (${response.status}): ${err.error?.message || response.statusText}`)
  }
  const data = await response.json()
  return data.courses || []
}

/**
 * Fetches the student roster for a given course.
 * @param {string} courseId - The Classroom course ID.
 * @param {string} accessToken - OAuth access token with classroom.rosters.readonly scope.
 * @returns {Promise<Array>} Array of student objects (each has .profile.emailAddress, .profile.name).
 * @throws {Error} On non-2xx responses.
 */
export async function getCourseStudents(courseId, accessToken) {
  const response = await fetch(`${CLASSROOM_BASE}/courses/${courseId}/students`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`getCourseStudents failed (${response.status}): ${err.error?.message || response.statusText}`)
  }
  const data = await response.json()
  return data.students || []
}

/**
 * Submits a grade for a student's coursework item via the Classroom API.
 * @param {string} courseId - The Classroom course ID.
 * @param {string} courseWorkId - The CourseWork item ID.
 * @param {string} studentId - The student's user ID.
 * @param {number} score - Numeric grade to assign.
 * @param {string} accessToken - OAuth access token with classroom.coursework.students scope.
 * @returns {Promise<object>} The updated StudentSubmission object.
 * @throws {Error} On non-2xx responses.
 */
export async function submitGrade(courseId, courseWorkId, studentId, score, accessToken) {
  // First, get the submission ID for this student
  const listResp = await fetch(
    `${CLASSROOM_BASE}/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions?userId=${studentId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!listResp.ok) {
    const err = await listResp.json().catch(() => ({}))
    throw new Error(`submitGrade (list submissions) failed (${listResp.status}): ${err.error?.message || listResp.statusText}`)
  }
  const listData = await listResp.json()
  const submission = listData.studentSubmissions?.[0]
  if (!submission) {
    throw new Error(`submitGrade: no submission found for student ${studentId} on courseWork ${courseWorkId}`)
  }

  // Patch the assigned grade
  const patchResp = await fetch(
    `${CLASSROOM_BASE}/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions/${submission.id}?updateMask=assignedGrade,draftGrade`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assignedGrade: score, draftGrade: score }),
    }
  )
  if (!patchResp.ok) {
    const err = await patchResp.json().catch(() => ({}))
    throw new Error(`submitGrade (patch) failed (${patchResp.status}): ${err.error?.message || patchResp.statusText}`)
  }
  return patchResp.json()
}
