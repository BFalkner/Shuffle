import type { MethodResult, Scored } from '../../engine/simulate'

/** A method's simulation result plus its score, for the current deck condition. */
export type ScoredResult = MethodResult & Scored

/** A method overlaid on the charts. */
export interface Series extends ScoredResult {
  id: string
  name: string
  color: string
}

/** Colours given to overlaid methods, in order. */
export const SERIES_COLORS = ['#3a5f9e', '#c0612a', '#8a5fa6', '#b08d2a', '#3a8e8e', '#a63a5f', '#5f6b3a', '#1a6b3a']
