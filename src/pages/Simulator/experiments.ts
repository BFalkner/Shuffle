// Saved shuffle methods ("experiments"), persisted in the browser's localStorage.
import { isOpKey, type OpKey } from '../../engine/moves'

export interface Experiment {
  id: string
  title: string
  seq: OpKey[]
}

const STORAGE_KEY = 'shuffleExperiments'

/** The default list. */
export const SEED: Omit<Experiment, 'id'>[] = [
  { title: 'Between games — 3× Mash, Half overhand, 2× Mash', seq: ['mash', 'mash', 'mash', 'ohr', 'mash', 'mash'] },
  { title: 'New or sorted deck — 5× Mash, Pile, 5× Mash', seq: ['mash', 'mash', 'mash', 'mash', 'mash', 'pile', 'mash', 'mash', 'mash', 'mash', 'mash'] },
]

export function uid(): string {
  return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function defaultExperiments(): Experiment[] {
  return SEED.map((experiment) => ({ id: uid(), ...experiment, seq: experiment.seq.slice() }))
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
  return list ?? defaultExperiments()
}

export function saveExperiments(list: Experiment[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // storage full or blocked: changes last for this visit only
  }
}
