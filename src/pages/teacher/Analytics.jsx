/**
 * src/pages/teacher/Analytics.jsx
 * Course analytics dashboard. Shows per-item pass rates, bottleneck alerts,
 * and an overall progress chart using data from useAnalytics.
 */

import { useParams } from 'react-router-dom'
import { useCourseConfig } from '../../hooks/useCourseConfig.js'
import { useAnalytics } from '../../hooks/useAnalytics.js'
import { useLearningPath } from '../../hooks/useLearningPath.js'
import ItemPassRates from '../../components/analytics/ItemPassRates.jsx'
import BottleneckAlert from '../../components/analytics/BottleneckAlert.jsx'
import ProgressChart from '../../components/analytics/ProgressChart.jsx'
import Spinner from '../../components/common/Spinner.jsx'

/**
 * Analytics page.
 */
export default function Analytics() {
  const { courseId } = useParams()
  const { getConfig } = useCourseConfig()
  const config = getConfig(courseId)
  const spreadsheetId = config?.courseSheetId

  const { itemStats, bottlenecks, loading: analyticsLoading, error: analyticsError } = useAnalytics(spreadsheetId)
  const { modules, loading: pathLoading } = useLearningPath(spreadsheetId)

  const allItems = modules.flatMap((m) => m.items)

  // Build itemStats array enriched with titles from learning path
  const itemStatsArray = [...itemStats.entries()].map(([itemId, stats]) => {
    const pathItem = allItems.find((i) => i.item_id === itemId)
    return {
      itemId,
      title: pathItem?.title || itemId,
      passRate: stats.passRate,
      avgScore: stats.avgScore,
      avgAttempts: stats.totalAttempts > 0 && stats.totalStudents > 0
        ? Math.round(stats.totalAttempts / stats.totalStudents)
        : null,
      avgConfidence: null, // not tracked in this version
    }
  })

  // Enrich bottlenecks with titles
  const bottleneckData = bottlenecks.map((itemId) => {
    const pathItem = allItems.find((i) => i.item_id === itemId)
    const stats = itemStats.get(itemId)
    return {
      itemId,
      title: pathItem?.title || itemId,
      stuckCount: stats ? stats.totalStudents - stats.passed : 0,
      totalStudents: stats?.totalStudents || 0,
    }
  })

  // Progress chart data: completion % per item
  const chartData = itemStatsArray.map((s) => ({
    label: s.title,
    value: Math.round((s.passRate || 0) * (itemStats.get(s.itemId)?.totalStudents || 0)),
    max: itemStats.get(s.itemId)?.totalStudents || 1,
  }))

  const loading = analyticsLoading || pathLoading

  return (
    <div style={{ padding: 'var(--spacing-lg)' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>
        Analytics
      </h1>

      {!spreadsheetId && (
        <p style={{ color: 'var(--color-warning)' }}>Course not configured. Run course setup first.</p>
      )}

      {loading && <Spinner />}
      {analyticsError && <p style={{ color: 'var(--color-danger)' }}>Failed to load analytics: {analyticsError}</p>}

      {!loading && spreadsheetId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
          <section>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--spacing-md)' }}>
              Bottleneck Alerts
            </h2>
            <BottleneckAlert bottlenecks={bottleneckData} />
          </section>

          <section>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--spacing-md)' }}>
              Item Pass Rates
            </h2>
            <ItemPassRates itemStats={itemStatsArray} />
          </section>

          <section>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--spacing-md)' }}>
              Completion Overview
            </h2>
            <ProgressChart data={chartData} />
          </section>
        </div>
      )}
    </div>
  )
}
