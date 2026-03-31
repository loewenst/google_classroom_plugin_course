/**
 * src/utils/sheetsSchema.js
 * Frontend (ESM) copy of the Google Sheets schema definitions.
 * Defines tab names, per-tab column index maps (0-based), and header arrays
 * used to initialize a new spreadsheet or validate existing sheets.
 *
 * DUPLICATION NOTE: This file is intentionally duplicated at cloud-function/sheetsSchema.js
 * (CommonJS format). The cloud function runs in a Node.js environment that cannot use ESM
 * imports from the src/ tree. Keeping both copies in sync is a deliberate architectural
 * tradeoff: it avoids a build step for the cloud function while guaranteeing both the
 * frontend preview and the authoritative server-side code use the same schema.
 * If you change column order here, update cloud-function/sheetsSchema.js as well.
 */

/** Names of all tabs in the course spreadsheet. */
export const SHEET_NAMES = {
  MODULES: 'Modules',
  LEARNING_PATH: 'LearningPath',
  ASSESSMENTS: 'Assessments',
  PROGRESS: 'Progress',
  GROUPS: 'Groups',
  GLOSSARY: 'Glossary',
  GRADING_QUEUE: 'GradingQueue',
  ANSWER_KEYS: 'AnswerKeys',
}

/**
 * 0-based column index maps for each tab.
 * These must match the order of SHEET_HEADERS below.
 */
export const COLUMNS = {
  MODULES: {
    module_id: 0,
    title: 1,
    description: 2,
    order: 3,
  },

  LEARNING_PATH: {
    item_id: 0,
    module_id: 1,
    type: 2,
    title: 3,
    drive_file_id: 4,
    order: 5,
    estimated_minutes: 6,
    due_date: 7,
    teacher_note: 8,
    pass_threshold: 9,
    retake_limit: 10,
    score_policy: 11,
    checkpoint_slides: 12,
  },

  ASSESSMENTS: {
    assessment_id: 0,
    type: 1,
    title: 2,
    config: 3,
  },

  PROGRESS: {
    student_id: 0,
    item_id: 1,
    status: 2,
    score: 3,
    attempts: 4,
    confidence: 5,
    student_note_text: 6,
    student_note_audio_id: 7,
    updated_at: 8,
  },

  GROUPS: {
    group_id: 0,
    name: 1,
    student_ids: 2,
    color: 3,
  },

  GLOSSARY: {
    term_id: 0,
    term: 1,
    definition: 2,
    module_id: 3,
  },

  GRADING_QUEUE: {
    submission_id: 0,
    student_id: 1,
    item_id: 2,
    submitted_at: 3,
    status: 4,
    score: 5,
    feedback_text: 6,
    feedback_audio_id: 7,
    reviewed_at: 8,
  },

  ANSWER_KEYS: {
    assessment_id: 0,
    answers_json: 1,
  },
}

/**
 * Header row arrays for each tab. Used when initializing a new spreadsheet.
 * Order must match COLUMNS above.
 */
export const SHEET_HEADERS = {
  MODULES: ['module_id', 'title', 'description', 'order'],

  LEARNING_PATH: [
    'item_id', 'module_id', 'type', 'title', 'drive_file_id',
    'order', 'estimated_minutes', 'due_date', 'teacher_note',
    'pass_threshold', 'retake_limit', 'score_policy', 'checkpoint_slides',
  ],

  ASSESSMENTS: ['assessment_id', 'type', 'title', 'config'],

  PROGRESS: [
    'student_id', 'item_id', 'status', 'score', 'attempts',
    'confidence', 'student_note_text', 'student_note_audio_id', 'updated_at',
  ],

  GROUPS: ['group_id', 'name', 'student_ids', 'color'],

  GLOSSARY: ['term_id', 'term', 'definition', 'module_id'],

  GRADING_QUEUE: [
    'submission_id', 'student_id', 'item_id', 'submitted_at', 'status',
    'score', 'feedback_text', 'feedback_audio_id', 'reviewed_at',
  ],

  ANSWER_KEYS: ['assessment_id', 'answers_json'],
}
