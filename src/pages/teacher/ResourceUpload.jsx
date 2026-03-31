/**
 * src/pages/teacher/ResourceUpload.jsx
 * Teacher resource management page. Lists existing resources from the learning
 * path and provides a form to upload new files (PDF, PPTX, text, markdown)
 * with metadata: title, estimated time, due date, teacher note, and checkpoint
 * slide assessments.
 */

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { useCourseConfig } from '../../hooks/useCourseConfig.js'
import { useLearningPath } from '../../hooks/useLearningPath.js'
import { uploadFile } from '../../services/drive.js'
import { upsertItem } from '../../services/sheets/learningPath.js'
import { getAssessment } from '../../services/sheets/assessments.js'
import Button from '../../components/common/Button.jsx'
import Modal from '../../components/common/Modal.jsx'
import Spinner from '../../components/common/Spinner.jsx'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

/**
 * Fetches all assessments from the Assessments tab for the selector dropdown.
 * @param {string} spreadsheetId
 * @param {string} accessToken
 * @returns {Promise<Array>}
 */
async function getAllAssessments(spreadsheetId, accessToken) {
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/Assessments`
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!resp.ok) return []
  const data = await resp.json()
  return (data.values || []).slice(1).filter((r) => r[0]).map((r) => ({
    assessment_id: r[0] || '',
    type: r[1] || '',
    title: r[2] || '',
  }))
}

/**
 * A single checkpoint row: slide number + assessment selector.
 * @param {{ checkpoint: object, index: number, assessments: Array, onChange: function, onRemove: function }} props
 */
function CheckpointRow({ checkpoint, index, assessments, onChange, onRemove }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', marginBottom: 'var(--spacing-xs)' }}>
      <input
        type="number"
        placeholder="Slide #"
        value={checkpoint.slideNumber}
        min={1}
        onChange={(e) => onChange(index, { ...checkpoint, slideNumber: Number(e.target.value) })}
        style={{ width: 80, padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
      />
      <select
        value={checkpoint.assessmentId || ''}
        onChange={(e) => onChange(index, { ...checkpoint, assessmentId: e.target.value })}
        style={{ flex: 1, padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
      >
        <option value="">— select assessment —</option>
        {assessments.map((a) => (
          <option key={a.assessment_id} value={a.assessment_id}>{a.title || a.assessment_id}</option>
        ))}
      </select>
      <button
        onClick={() => onRemove(index)}
        style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', background: 'transparent', cursor: 'pointer' }}
      >
        ✕
      </button>
    </div>
  )
}

/**
 * Resource upload page for teachers.
 */
export default function ResourceUpload() {
  const { courseId } = useParams()
  const { accessToken } = useAuth()
  const { getConfig } = useCourseConfig()
  const config = getConfig(courseId)
  const spreadsheetId = config?.courseSheetId
  const driveFolderId = config?.driveFolderId

  const { modules, loading: pathLoading } = useLearningPath(spreadsheetId)
  const [showModal, setShowModal] = useState(false)
  const [assessments, setAssessments] = useState([])

  // Form state
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [teacherNote, setTeacherNote] = useState('')
  const [checkpoints, setCheckpoints] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    if (spreadsheetId && accessToken) {
      getAllAssessments(spreadsheetId, accessToken).then(setAssessments).catch(() => {})
    }
  }, [spreadsheetId, accessToken])

  function resetForm() {
    setFile(null)
    setTitle('')
    setEstimatedMinutes('')
    setDueDate('')
    setTeacherNote('')
    setCheckpoints([])
    setSaveError(null)
  }

  function handleCheckpointChange(index, updated) {
    setCheckpoints((prev) => prev.map((cp, i) => (i === index ? updated : cp)))
  }

  function handleCheckpointRemove(index) {
    setCheckpoints((prev) => prev.filter((_, i) => i !== index))
  }

  /**
   * Uploads the file and saves the resource to the LearningPath sheet.
   */
  async function handleSave() {
    if (!file || !title) {
      setSaveError('Title and file are required.')
      return
    }
    if (!spreadsheetId || !driveFolderId) {
      setSaveError('Course is not fully configured. Run course setup first.')
      return
    }

    setSaving(true)
    setSaveError(null)
    try {
      // Determine file type from extension
      const ext = file.name.split('.').pop().toLowerCase()
      const typeMap = { pdf: 'pdf', txt: 'text', md: 'text', pptx: 'google_slides' }
      const fileType = typeMap[ext] || 'pdf'

      // Upload file to Drive
      const uploaded = await uploadFile(file, driveFolderId, accessToken, null)

      // Compute order (append after existing items)
      const allItems = modules.flatMap((m) => m.items)
      const maxOrder = allItems.reduce((max, i) => Math.max(max, i.order || 0), 0)

      const checkpointJson = checkpoints.length > 0 ? JSON.stringify(checkpoints) : ''

      const item = {
        item_id: crypto.randomUUID(),
        module_id: modules[0]?.module_id || 'default',
        type: fileType,
        title,
        drive_file_id: uploaded.id,
        order: maxOrder + 1,
        estimated_minutes: estimatedMinutes ? Number(estimatedMinutes) : null,
        due_date: dueDate || '',
        teacher_note: teacherNote || '',
        pass_threshold: 70,
        retake_limit: null,
        score_policy: 'highest',
        checkpoint_slides: checkpointJson,
      }

      await upsertItem(item, spreadsheetId, accessToken)
      setShowModal(false)
      resetForm()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const allItems = modules.flatMap((m) => m.items)

  return (
    <div style={{ padding: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>Resources</h1>
        <Button onClick={() => { resetForm(); setShowModal(true) }}>Add Resource</Button>
      </div>

      {!spreadsheetId && (
        <p style={{ color: 'var(--color-warning)' }}>Course not configured. Run course setup first.</p>
      )}

      {pathLoading && <Spinner />}

      {!pathLoading && allItems.length === 0 && (
        <p style={{ color: 'var(--color-text-secondary)' }}>No resources yet. Click "Add Resource" to upload your first file.</p>
      )}

      {/* Resource list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {allItems.map((item) => (
          <div key={item.item_id} style={{
            padding: 'var(--spacing-md)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-md)',
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600 }}>{item.title}</p>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                Type: {item.type}
                {item.estimated_minutes ? ` · ~${item.estimated_minutes} min` : ''}
                {item.due_date ? ` · Due: ${item.due_date}` : ''}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Add Resource Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Resource">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>File</label>
            <input
              type="file"
              accept=".pdf,.txt,.md,.pptx"
              onChange={(e) => setFile(e.target.files[0] || null)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resource title"
              style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Estimated minutes</label>
              <input
                type="number"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                min={1}
                style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Teacher note</label>
            <textarea
              value={teacherNote}
              onChange={(e) => setTeacherNote(e.target.value)}
              rows={3}
              placeholder="Optional note shown to students"
              style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label style={{ fontWeight: 600 }}>Checkpoint assessments</label>
              <button
                onClick={() => setCheckpoints((prev) => [...prev, { slideNumber: 1, assessmentId: '' }])}
                style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                + Add checkpoint
              </button>
            </div>
            {checkpoints.map((cp, i) => (
              <CheckpointRow
                key={i}
                index={i}
                checkpoint={cp}
                assessments={assessments}
                onChange={handleCheckpointChange}
                onRemove={handleCheckpointRemove}
              />
            ))}
          </div>

          {saveError && (
            <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>{saveError}</p>
          )}

          <Button onClick={handleSave} loading={saving}>
            Upload & Save
          </Button>
        </div>
      </Modal>
    </div>
  )
}
