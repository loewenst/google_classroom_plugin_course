/**
 * src/pages/teacher/AssessmentBuilder.jsx
 * Teacher creates and edits assessments (multiple choice, true/false, word bank).
 * Assessment configs are saved to the Assessments tab; correct answers go to
 * the private AnswerKeys tab.
 */

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'
import { useCourseConfig } from '../../hooks/useCourseConfig.js'
import { upsertAssessment } from '../../services/sheets/assessments.js'
import Button from '../../components/common/Button.jsx'
import Modal from '../../components/common/Modal.jsx'
import Spinner from '../../components/common/Spinner.jsx'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

/**
 * Fetches all assessments from the Assessments tab.
 * @param {string} spreadsheetId
 * @param {string} accessToken
 * @returns {Promise<Array>}
 */
async function loadAssessments(spreadsheetId, accessToken) {
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/Assessments`
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!resp.ok) return []
  const data = await resp.json()
  return (data.values || []).slice(1).filter((r) => r[0]).map((r) => {
    let config = {}
    try { config = JSON.parse(r[3] || '{}') } catch { config = {} }
    return { assessment_id: r[0], type: r[1], title: r[2], config }
  })
}

/**
 * Writes the answer key to the private spreadsheet AnswerKeys tab.
 * @param {string} assessmentId
 * @param {object} answers
 * @param {string} privateSheetId
 * @param {string} accessToken
 */
async function saveAnswerKey(assessmentId, answers, privateSheetId, accessToken) {
  // Read existing rows first
  const readUrl = `${SHEETS_BASE}/${privateSheetId}/values/AnswerKeys`
  const readResp = await fetch(readUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
  const readData = readResp.ok ? await readResp.json() : { values: [] }
  const rows = readData.values || []

  const newRow = [assessmentId, JSON.stringify(answers)]

  let existingIndex = -1
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === assessmentId) { existingIndex = i + 1; break }
  }

  if (existingIndex > 0) {
    await fetch(`${SHEETS_BASE}/${privateSheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ valueInputOption: 'RAW', data: [{ range: `AnswerKeys!A${existingIndex}`, values: [newRow] }] }),
    })
  } else {
    await fetch(`${SHEETS_BASE}/${privateSheetId}/values/AnswerKeys:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [newRow] }),
    })
  }
}

const EMPTY_FORM = {
  title: '',
  type: 'multiple_choice',
  question: '',
  options: ['', '', '', ''],
  correctOption: 0,
  trueFalseAnswer: true,
  blanks: [],
  wordBankWords: [],
  retakeLimit: 0,
  scorePolicy: 'highest',
  passThreshold: 70,
}

/**
 * Assessment builder page.
 */
export default function AssessmentBuilder() {
  const { courseId } = useParams()
  const { accessToken } = useAuth()
  const { getConfig } = useCourseConfig()
  const config = getConfig(courseId)
  const spreadsheetId = config?.courseSheetId
  const privateSheetId = config?.privateSheetId

  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    if (!spreadsheetId || !accessToken) return
    setLoading(true)
    loadAssessments(spreadsheetId, accessToken)
      .then(setAssessments)
      .finally(() => setLoading(false))
  }, [spreadsheetId, accessToken])

  function openNew() {
    setForm(EMPTY_FORM)
    setSaveError(null)
    setShowModal(true)
  }

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setOption(index, value) {
    setForm((prev) => {
      const opts = [...prev.options]
      opts[index] = value
      return { ...prev, options: opts }
    })
  }

  function addBlank() {
    setForm((prev) => ({ ...prev, blanks: [...prev.blanks, { id: crypto.randomUUID(), label: '' }] }))
  }

  function updateBlank(index, label) {
    setForm((prev) => {
      const blanks = prev.blanks.map((b, i) => (i === index ? { ...b, label } : b))
      return { ...prev, blanks }
    })
  }

  function addWord() {
    setForm((prev) => ({ ...prev, wordBankWords: [...prev.wordBankWords, { word: '', isDistractor: false }] }))
  }

  function updateWord(index, updates) {
    setForm((prev) => {
      const words = prev.wordBankWords.map((w, i) => (i === index ? { ...w, ...updates } : w))
      return { ...prev, wordBankWords: words }
    })
  }

  /**
   * Saves the assessment config and answer key.
   */
  async function handleSave() {
    if (!form.title || !form.question) {
      setSaveError('Title and question are required.')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const assessmentId = crypto.randomUUID()

      let assessmentConfig = {}
      let answerKey = {}

      if (form.type === 'multiple_choice') {
        const filteredOptions = form.options.filter((o) => o.trim())
        assessmentConfig = {
          question: form.question,
          options: filteredOptions.map((text, i) => ({ id: String(i), text })),
          pass_threshold: form.passThreshold,
          retake_limit: form.retakeLimit || null,
          score_policy: form.scorePolicy,
        }
        answerKey = { correct: String(form.correctOption) }
      } else if (form.type === 'binary_choice') {
        assessmentConfig = {
          question: form.question,
          optionA: 'True',
          optionB: 'False',
          pass_threshold: form.passThreshold,
          retake_limit: form.retakeLimit || null,
          score_policy: form.scorePolicy,
        }
        answerKey = { correct: form.trueFalseAnswer ? 'True' : 'False' }
      } else if (form.type === 'word_bank') {
        assessmentConfig = {
          question: form.question,
          blanks: form.blanks,
          wordBank: form.wordBankWords,
          pass_threshold: form.passThreshold,
          retake_limit: form.retakeLimit || null,
          score_policy: form.scorePolicy,
        }
        answerKey = { blanks: form.blanks }
      }

      await upsertAssessment(
        { assessment_id: assessmentId, type: form.type, title: form.title, config: assessmentConfig },
        spreadsheetId,
        accessToken
      )

      if (privateSheetId) {
        await saveAnswerKey(assessmentId, answerKey, privateSheetId, accessToken)
      }

      setShowModal(false)
      // Refresh list
      const updated = await loadAssessments(spreadsheetId, accessToken)
      setAssessments(updated)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>Assessments</h1>
        <Button onClick={openNew}>New Assessment</Button>
      </div>

      {loading && <Spinner />}

      {!loading && assessments.length === 0 && (
        <p style={{ color: 'var(--color-text-secondary)' }}>No assessments yet.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {assessments.map((a) => (
          <div key={a.assessment_id} style={{
            padding: 'var(--spacing-md)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
          }}>
            <p style={{ fontWeight: 600 }}>{a.title}</p>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              Type: {a.type}
            </p>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Assessment">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="Assessment title"
              style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Type</label>
            <select
              value={form.type}
              onChange={(e) => setField('type', e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
            >
              <option value="multiple_choice">Multiple Choice</option>
              <option value="binary_choice">True / False</option>
              <option value="word_bank">Word Bank</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Question *</label>
            <textarea
              value={form.question}
              onChange={(e) => setField('question', e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          {/* Multiple choice options */}
          {form.type === 'multiple_choice' && (
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Options (mark correct)</label>
              {form.options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 4 }}>
                  <input
                    type="radio"
                    name="correctOption"
                    checked={form.correctOption === i}
                    onChange={() => setField('correctOption', i)}
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => setOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    style={{ flex: 1, padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* True/False */}
          {form.type === 'binary_choice' && (
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Correct answer</label>
              <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="radio" checked={form.trueFalseAnswer === true} onChange={() => setField('trueFalseAnswer', true)} />
                  True
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="radio" checked={form.trueFalseAnswer === false} onChange={() => setField('trueFalseAnswer', false)} />
                  False
                </label>
              </div>
            </div>
          )}

          {/* Word bank */}
          {form.type === 'word_bank' && (
            <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontWeight: 600 }}>Blanks</label>
                  <button onClick={addBlank} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>+ Add blank</button>
                </div>
                {form.blanks.map((b, i) => (
                  <input
                    key={b.id}
                    type="text"
                    value={b.label}
                    onChange={(e) => updateBlank(i, e.target.value)}
                    placeholder={`Blank ${i + 1} label`}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', marginBottom: 4, boxSizing: 'border-box' }}
                  />
                ))}
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontWeight: 600 }}>Word bank words</label>
                  <button onClick={addWord} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>+ Add word</button>
                </div>
                {form.wordBankWords.map((w, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <input
                      type="text"
                      value={w.word}
                      onChange={(e) => updateWord(i, { word: e.target.value })}
                      placeholder="Word"
                      style={{ flex: 1, padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap' }}>
                      <input type="checkbox" checked={w.isDistractor} onChange={(e) => updateWord(i, { isDistractor: e.target.checked })} />
                      Distractor
                    </label>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Settings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-sm)' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 'var(--font-size-sm)' }}>Retake limit (0=∞)</label>
              <input
                type="number"
                value={form.retakeLimit}
                min={0}
                onChange={(e) => setField('retakeLimit', Number(e.target.value))}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 'var(--font-size-sm)' }}>Score policy</label>
              <select
                value={form.scorePolicy}
                onChange={(e) => setField('scorePolicy', e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
              >
                <option value="highest">Highest</option>
                <option value="latest">Latest</option>
                <option value="average">Average</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 'var(--font-size-sm)' }}>Pass threshold %</label>
              <input
                type="number"
                value={form.passThreshold}
                min={0}
                max={100}
                onChange={(e) => setField('passThreshold', Number(e.target.value))}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {saveError && (
            <p style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>{saveError}</p>
          )}

          <Button onClick={handleSave} loading={saving}>Save Assessment</Button>
        </div>
      </Modal>
    </div>
  )
}
