// The home page's move charts: series from charts.json (npm run home-charts) and each move's colour.
import CHARTS from './charts.json'

export type ChartMove = 'mash' | 'overhand' | 'pile'
export type Reading = 'order' | 'proximity' | 'position'

/** One colour per move, shared with the move steps. Checked with the dataviz palette validator against the page background. */
export const MOVE_COLOR: Record<ChartMove, string> = { mash: '#1a6b3a', overhand: '#d27a2c', pile: '#3a5f9e' }

export const CHART_MOVES: { op: ChartMove; name: string; color: string }[] = [
  { op: 'mash', name: 'Mash', color: MOVE_COLOR.mash },
  { op: 'overhand', name: 'Overhand', color: MOVE_COLOR.overhand },
  { op: 'pile', name: 'Pile', color: MOVE_COLOR.pile },
]

export const SERIES = CHARTS.series as Record<ChartMove, Record<Reading, number[]>>
export const REPEATS = SERIES.mash.order.length - 1
