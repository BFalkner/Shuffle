import type { MethodResult, Scored } from '../../engine/simulate'

/** A method's simulation result plus its score, for one starting deck. */
export type ScoredResult = MethodResult & Scored

/** A method drawn on the charts. */
export interface Series extends ScoredResult {
  id: string
  name: string
  color: string
  /** the result is for an earlier version of the method's moves, shown while the new one is scored */
  stale?: boolean
}

/** Colours given to methods, by their place in the list. */
export const SERIES_COLORS = ['#3a5f9e', '#c0612a', '#8a5fa6', '#b08d2a', '#3a8e8e', '#a63a5f', '#5f6b3a', '#1a6b3a']
