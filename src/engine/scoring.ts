// Levels: how far each reading sits from random, on a scale where random decks read 0 and an unshuffled sorted deck
// reads 1. Categories read their worst metric, and a routine's total is the sum of its three categories.
import type { Base } from './calibrate.ts'
import { CATEGORIES, metricsIn, type Category, type Metric, type MetricKey } from './metrics.ts'

/** Each metric's reading at every step: avg[key][step]. */
export type Averages = Record<MetricKey, number[]>

/**
 * How far a reading sits from random: 0 is what random decks read on average, and 1 is what an unshuffled sorted deck
 * reads. Noise takes random decks a little either side of 0.
 */
export function level(metric: Metric, value: number, base: Base): number {
  const baseline = base[metric.key]
  return (value - baseline.mean) / (baseline.sorted - baseline.mean)
}

/** The level random decks stay under: three standard deviations of their reading above 0. */
export function noiseLevel(metric: Metric, base: Base): number {
  const baseline = base[metric.key]
  return (3 * baseline.standardDeviation) / Math.abs(baseline.sorted - baseline.mean)
}

/** Whether a reading is within the noise of random decks. */
export function withinNoise(metric: Metric, value: number, base: Base): boolean {
  return level(metric, value, base) <= noiseLevel(metric, base)
}

export interface CategoryReading {
  category: Category
  title: string
  /** the category's level: its worst metric's */
  level: number
  /** the metric with that level */
  worst: Metric
  /** every metric in the category is within noise */
  clear: boolean
}

/** Each category's reading at one step. */
export function categoryReadings(avg: Averages, base: Base, step: number): CategoryReading[] {
  return CATEGORIES.map(({ key, title }) => {
    const metrics = metricsIn(key)
    const levels = metrics.map((metric) => level(metric, avg[metric.key][step], base))
    const worstIndex = levels.indexOf(Math.max(...levels))
    return {
      category: key,
      title,
      level: levels[worstIndex],
      worst: metrics[worstIndex],
      clear: metrics.every((metric) => withinNoise(metric, avg[metric.key][step], base)),
    }
  })
}

/**
 * How far a category sits from random in noise lines, at one step: its worst metric's level divided by that metric's
 * noise line. Under 1, every metric in the category is within the noise of random decks, so it's clear; 1 is the edge
 * of random. For display: it isn't part of a category's reading, so the scores the engine gives don't change.
 */
export function noiseLines(category: Category, avg: Averages, base: Base, step: number): number {
  return Math.max(...metricsIn(category).map((metric) => level(metric, avg[metric.key][step], base) / noiseLevel(metric, base)))
}

/** A routine's total: the sum of its categories' levels. 0 is random, and an unshuffled sorted deck reads about 3. */
export function totalLevel(readings: CategoryReading[]): number {
  return readings.reduce((total, reading) => total + reading.level, 0)
}

/**
 * A level to two decimal places, or three below 0.01 so readings near the noise line don't all show as 0.00, without a
 * minus sign on values that round to 0.
 */
export function fmtLevel(value: number): string {
  const decimals = Math.abs(value) < 0.01 ? 3 : 2
  const text = value.toFixed(decimals)
  return Number(text) === 0 ? (0).toFixed(decimals) : text
}
