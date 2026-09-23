import DATA from './data.json'

export type Move = 'mash' | 'overhand' | 'pile' | 'ohr'
export type Key = 'seq' | 'cp' | 'chi'

export const OPS = DATA.ops as { k: number[]; rand: Record<Key, number>; series: Record<Move, Record<Key, (number | null)[]>> }
export const MOVE_COLORS: Record<Move, string> = { mash: '#1a6b3a', overhand: '#c0612a', pile: '#3a5f9e', ohr: '#2f8f7f' }
export const MOVES: Move[] = ['mash', 'overhand', 'pile', 'ohr']

export interface Config {
  key: Key
  title: string
  desc: string
  sub: string
  target: number
  log: boolean
}

export const OPS_CHARTS: Config[] = [
  {
    key: 'seq',
    title: 'Ordering',
    desc: 'How many runs of cards remain in sequence, forward or reverse. A sorted deck is one run; a random deck is about 48. The slowest property to break.',
    sub: `sequence runs · random ≈ ${OPS.rand.seq} · higher is better`,
    target: OPS.rand.seq,
    log: false,
  },
  {
    key: 'cp',
    title: 'Proximity',
    desc: 'How many cards that were neighbors stay within three positions. The pile breaks this directly; mashing does not.',
    sub: `close pairs · random ≈ ${OPS.rand.cp} · lower is better`,
    target: OPS.rand.cp,
    log: false,
  },
  {
    key: 'chi',
    title: 'Position',
    desc: 'Whether any card favors a fixed location across many shuffles. A pile on its own fails this; mashing clears it.',
    sub: `uniformity · random ≈ ${Math.round(OPS.rand.chi).toLocaleString()} · lower is better · log`,
    target: OPS.rand.chi,
    log: true,
  },
]

