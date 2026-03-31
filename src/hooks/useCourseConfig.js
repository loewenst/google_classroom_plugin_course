/**
 * src/hooks/useCourseConfig.js
 * Manages course configuration objects stored in localStorage.
 * Each config links a Google Classroom course to its associated spreadsheets
 * and Drive folder. Exposes CRUD operations for configs.
 */

import { useState, useCallback } from 'react'

const STORAGE_KEY = 'classroom_app_courses'

/**
 * Reads the raw config array from localStorage.
 * @returns {Array}
 */
function readConfigs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * Writes the config array to localStorage.
 * @param {Array} configs
 */
function writeConfigs(configs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs))
}

/**
 * Hook for reading and writing course configuration objects.
 * Configs are persisted to localStorage under 'classroom_app_courses'.
 *
 * @returns {{
 *   courseConfigs: Array,
 *   getConfig: (classroomCourseId: string) => object|undefined,
 *   saveConfig: (config: object) => void,
 *   removeConfig: (classroomCourseId: string) => void,
 * }}
 */
export function useCourseConfig() {
  const [courseConfigs, setCourseConfigs] = useState(() => readConfigs())

  /**
   * Returns the config for a specific Classroom course ID, or undefined.
   * @param {string} classroomCourseId
   * @returns {object|undefined}
   */
  const getConfig = useCallback((classroomCourseId) => {
    return readConfigs().find((c) => c.classroomCourseId === classroomCourseId)
  }, [])

  /**
   * Saves or updates a course config. Matches on classroomCourseId.
   * @param {object} config - Must include classroomCourseId.
   */
  const saveConfig = useCallback((config) => {
    if (!config.classroomCourseId) {
      throw new Error('saveConfig: config must include classroomCourseId.')
    }
    setCourseConfigs((prev) => {
      const existing = prev.findIndex((c) => c.classroomCourseId === config.classroomCourseId)
      let updated
      if (existing >= 0) {
        updated = prev.map((c, i) => (i === existing ? { ...c, ...config } : c))
      } else {
        updated = [...prev, config]
      }
      writeConfigs(updated)
      return updated
    })
  }, [])

  /**
   * Removes the config for a specific Classroom course ID.
   * @param {string} classroomCourseId
   */
  const removeConfig = useCallback((classroomCourseId) => {
    setCourseConfigs((prev) => {
      const updated = prev.filter((c) => c.classroomCourseId !== classroomCourseId)
      writeConfigs(updated)
      return updated
    })
  }, [])

  return { courseConfigs, getConfig, saveConfig, removeConfig }
}
