import { describe, expect, test } from 'vitest'
import { METRICS } from '../../engine/metrics'
import { METRIC_TEXT } from './metricText'

describe('metric text', () => {
  test('every metric has a description and a write-up link', () => {
    for (const metric of METRICS) {
      expect(METRIC_TEXT[metric.key]?.desc, metric.key).toBeTruthy()
      expect(METRIC_TEXT[metric.key].writeup.to, metric.key).toMatch(/^\//)
    }
  })

  test('metric descriptions stay near the ~30-word budget', () => {
    // Depth belongs on the write-up pages, not inline.
    for (const metric of METRICS) {
      const words = METRIC_TEXT[metric.key].desc.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length
      expect(words, metric.key).toBeLessThanOrEqual(45)
    }
  })
})
