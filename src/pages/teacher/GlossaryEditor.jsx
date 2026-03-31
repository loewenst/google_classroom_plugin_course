/**
 * src/pages/teacher/GlossaryEditor.jsx
 * Teacher defines and edits course glossary terms. Terms are listed
 * alphabetically and can be searched. Changes are persisted to the
 * Glossary Sheet tab.
 */

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { useCourseConfig } from '../../hooks/useCourseConfig.js'
import { getGlossaryTerms, upsertTerm } from '../../services/sheets/glossary.js'
import Button from '../../components/common/Button.jsx'
import GlossaryPanel from '../../components/glossary/GlossaryPanel.jsx'
import Spinner from '../../components/common/Spinner.jsx'

/**
 * Glossary editor page.
 */
export default function GlossaryEditor() {
  const { courseId } = useParams()
  const { accessToken } = useAuth()
  const { getConfig } = useCourseConfig()
  const config = getConfig(courseId)
  const spreadsheetId = config?.courseSheetId

  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [newTerm, setNewTerm] = useState('')
  const [newDefinition, setNewDefinition] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Editing state
  const [editingId, setEditingId] = useState(null)
  const [editTerm, setEditTerm] = useState('')
  const [editDefinition, setEditDefinition] = useState('')

  useEffect(() => {
    if (!spreadsheetId || !accessToken) return
    setLoading(true)
    getGlossaryTerms(spreadsheetId, accessToken)
      .then((data) => setTerms(data.sort((a, b) => a.term.localeCompare(b.term))))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [spreadsheetId, accessToken])

  async function handleAdd() {
    if (!newTerm.trim() || !newDefinition.trim()) {
      setSaveError('Both term and definition are required.')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await upsertTerm(newTerm.trim(), newDefinition.trim(), spreadsheetId, accessToken)
      const updated = await getGlossaryTerms(spreadsheetId, accessToken)
      setTerms(updated.sort((a, b) => a.term.localeCompare(b.term)))
      setNewTerm('')
      setNewDefinition('')
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleEditSave(termObj) {
    if (!editTerm.trim() || !editDefinition.trim()) return
    setSaving(true)
    try {
      await upsertTerm(editTerm.trim(), editDefinition.trim(), spreadsheetId, accessToken, { term_id: termObj.term_id })
      const updated = await getGlossaryTerms(spreadsheetId, accessToken)
      setTerms(updated.sort((a, b) => a.term.localeCompare(b.term)))
      setEditingId(null)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 'var(--spacing-lg)' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>
        Glossary
      </h1>

      {!spreadsheetId && (
        <p style={{ color: 'var(--color-warning)' }}>Course not configured. Run course setup first.</p>
      )}

      {loading && <Spinner />}
      {error && <p style={{ color: 'var(--color-danger)' }}>Failed to load glossary: {error}</p>}

      {!loading && spreadsheetId && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--spacing-xl)', alignItems: 'start' }}>
          {/* Add term form */}
          <div>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--spacing-md)' }}>
              Add Term
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Term *</label>
                <input
                  type="text"
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  placeholder="e.g., Photosynthesis"
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Definition *</label>
                <textarea
                  value={newDefinition}
                  onChange={(e) => setNewDefinition(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
              {saveError && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>{saveError}</p>}
              <Button onClick={handleAdd} loading={saving}>Add Term</Button>
            </div>

            {/* Existing terms list */}
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--spacing-md)' }}>
              Terms ({terms.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {terms.map((t) => (
                <div key={t.term_id} style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  {editingId === t.term_id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input
                        type="text"
                        value={editTerm}
                        onChange={(e) => setEditTerm(e.target.value)}
                        style={{ padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                      />
                      <textarea
                        value={editDefinition}
                        onChange={(e) => setEditDefinition(e.target.value)}
                        rows={2}
                        style={{ padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', resize: 'vertical' }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleEditSave(t)}
                          style={{ padding: '4px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{ padding: '4px 12px', borderRadius: 'var(--radius-sm)', background: 'none', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700 }}>{t.term}</p>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{t.definition}</p>
                      </div>
                      <button
                        onClick={() => { setEditingId(t.term_id); setEditTerm(t.term); setEditDefinition(t.definition) }}
                        style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'none', cursor: 'pointer', fontSize: 'var(--font-size-sm)', flexShrink: 0 }}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {terms.length === 0 && <p style={{ color: 'var(--color-text-secondary)' }}>No terms yet.</p>}
            </div>
          </div>

          {/* Preview panel */}
          <div style={{ position: 'sticky', top: 80 }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--spacing-md)' }}>Preview</h2>
            <GlossaryPanel terms={terms} onClose={() => {}} />
          </div>
        </div>
      )}
    </div>
  )
}
