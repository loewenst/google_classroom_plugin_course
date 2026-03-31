/**
 * cloud-function/sheetsSchema.js
 * CommonJS copy of the Google Sheets schema definitions.
 * Intentionally duplicated from src/utils/sheetsSchema.js.
 * The cloud function runs in Node.js and cannot import from the src/ ESM tree.
 * If you update column order in src/utils/sheetsSchema.js, update this file too.
 */

const SHEET_NAMES = {
  MODULES: 'Modules',
  LEARNING_PATH: 'LearningPath',
  ASSESSMENTS: 'Assessments',
  PROGRESS: 'Progress',
  GROUPS: 'Groups',
  GLOSSARY: 'Glossary',
  GRADING_QUEUE: 'GradingQueue',
  ANSWER_KEYS: 'AnswerKeys',
}

const COLUMNS = {
  MODULES: { module_id: 0, title: 1, description: 2, order: 3 },
  LEARNING_PATH: {
    item_id: 0, module_id: 1, type: 2, title: 3, drive_file_id: 4,
    order: 5, estimated_minutes: 6, due_date: 7, teacher_note: 8,
    pass_threshold: 9, retake_limit: 10, score_policy: 11, checkpoint_slides: 12,
  },
  ASSESSMENTS: { assessment_id: 0, type: 1, title: 2, config: 3 },
  PROGRESS: {
    student_id: 0, item_id: 1, status: 2, score: 3, attempts: 4,
    confidence: 5, student_note_text: 6, student_note_audio_id: 7, updated_at: 8,
  },
  GROUPS: { group_id: 0, name: 1, student_ids: 2, color: 3 },
  GLOSSARY: { term_id: 0, term: 1, definition: 2, module_id: 3 },
  GRADING_QUEUE: {
    submission_id: 0, student_id: 1, item_id: 2, submitted_at: 3, status: 4,
    score: 5, feedback_text: 6, feedback_audio_id: 7, reviewed_at: 8,
  },
  ANSWER_KEYS: { assessment_id: 0, answers_json: 1 },
}

module.exports = { SHEET_NAMES, COLUMNS }
