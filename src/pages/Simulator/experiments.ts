// Saved shuffle methods ("experiments"), persisted in the browser's localStorage.
import { isOpKey, type OpKey } from '../../engine/moves'

export interface Experiment {
  id: string
  title: string
  seq: OpKey[]
}

const STORAGE_KEY = 'shuffleExperiments'
const EXAMPLES_FLAG = 'shuffleExamplesV2'

const fill = (op: OpKey, count: number): OpKey[] => Array(count).fill(op)

/** The default list: the home page's recommendations, plain mashing to compare them with, and simple baselines. */
export const SEED: Omit<Experiment, 'id'>[] = [
  { title: 'Between games — 3× Mash, Half overhand, Mash', seq: ['mash', 'mash', 'mash', 'ohr', 'mash'] },
  { title: 'New or sorted deck — 5× Mash, Pile, 5× Mash', seq: [...fill('mash', 5), 'pile', ...fill('mash', 5)] },
  { title: 'Plain mashing — 7× Mash', seq: fill('mash', 7) },
  { title: 'Plain mashing — 8× Mash', seq: fill('mash', 8) },
  { title: 'Shorter pile — 4× Mash, Pile, 4× Mash', seq: ['mash', 'mash', 'mash', 'mash', 'pile', 'mash', 'mash', 'mash', 'mash'] },
  { title: 'Half-Overhand method', seq: ['mash', 'mash', 'ohr', 'mash', 'ohr', 'mash', 'ohr', 'mash', 'mash'] },
  { title: 'Repeated mash ×12', seq: fill('mash', 12) },
  { title: 'Repeated overhand ×10', seq: fill('overhand', 10) },
  { title: 'Repeated pile ×6', seq: fill('pile', 6) },
]

/** Instructive failures, each defeating a different diagnostic. */
export const EXAMPLES: Omit<Experiment, 'id'>[] = [
  { title: 'Undercleaned pile — clears the marginals, fails distinguishability', seq: ['pile', 'mash', 'mash', 'mash', 'mash', 'mash'] },
  { title: 'Pile-dominant stack — residual fixed-position bias', seq: ['pile', 'overhand', 'pile', 'mash', 'mash', 'pile'] },
  { title: 'Terminal pile — rising-sequence artifact', seq: ['mash', 'mash', 'mash', 'mash', 'mash', 'pile'] },
  { title: 'Overhand-only — residual local order', seq: fill('overhand', 7) },
  { title: 'Between-match cleanup — 3× Half Overhand (6 ops)', seq: ['mash', 'ohr', 'mash', 'ohr', 'mash', 'ohr'] },
]

export function uid(): string {
  return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function defaultExperiments(): Experiment[] {
  return SEED.concat(EXAMPLES).map((experiment) => ({ id: uid(), ...experiment, seq: experiment.seq.slice() }))
}

/** Load saved methods, falling back to the defaults. Unknown move names become 'overhand'. */
export function loadExperiments(): Experiment[] {
  let list: Experiment[] | null = null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as { id: string; title: string; seq: string[] }[]
      if (Array.isArray(saved) && saved.length) {
        list = saved.map((entry) => ({ id: entry.id, title: entry.title, seq: (entry.seq || []).map((op) => (isOpKey(op) ? op : 'overhand')) }))
      }
    }
  } catch {
    // unreadable storage: use defaults
  }
  if (!list) return defaultExperiments()

  // One-time migration: add any example methods an older saved list is missing.
  try {
    if (!localStorage.getItem(EXAMPLES_FLAG)) {
      for (const example of EXAMPLES) {
        if (!list.some((existing) => existing.title === example.title)) list.push({ id: uid(), ...example, seq: example.seq.slice() })
      }
      localStorage.setItem(EXAMPLES_FLAG, '1')
    }
  } catch {
    // ignore
  }
  return list
}

export function saveExperiments(list: Experiment[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    localStorage.setItem(EXAMPLES_FLAG, '1')
  } catch {
    // storage full or blocked: changes last for this visit only
  }
}
