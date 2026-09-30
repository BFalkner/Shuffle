// Saved shuffle methods ("experiments"), persisted in the browser's localStorage.
import { isOpKey, type OpKey } from '../../engine/moves'
import { compressSeq } from '../../engine/routines'

export interface Experiment {
  id: string
  /** a name the person typed; without one, the method is called by its moves */
  name?: string
  seq: OpKey[]
}

const STORAGE_KEY = 'shuffleExperiments'
const DEFAULTS_VERSION_KEY = 'shuffleDefaultsVersion'

/**
 * Bump when SEED gains a method. A saved list from an older version gets the new defaults added (matched by moves),
 * and nothing it already holds is removed.
 */
export const DEFAULTS_VERSION = 4

const EIGHT_MASHES: OpKey[] = ['mash', 'mash', 'mash', 'mash', 'mash', 'mash', 'mash', 'mash']

/** The default list. */
export const SEED: Omit<Experiment, 'id'>[] = [
  { name: 'Between games', seq: ['mash', 'mash', 'mash', 'ohr', 'mash', 'mash'] },
  { name: 'New or sorted deck', seq: ['mash', 'mash', 'mash', 'mash', 'mash', 'pile', 'mash', 'mash', 'mash', 'mash', 'mash'] },
  { name: "Mash x8", seq: EIGHT_MASHES },
]

/** Defaults listed for comparison that start off the charts, matched by moves. */
const OFF_CHART = new Set([EIGHT_MASHES.join(',')])

/** Whether a method starts ticked to show on the charts. */
export function startsShown(experiment: Experiment): boolean {
  return !OFF_CHART.has(experiment.seq.join(','))
}

/** Titles the defaults had before names and moves were shown separately, and the names they become. */
const OLD_DEFAULT_TITLES: Record<string, string> = {
  'Between games — 3× Mash, Half overhand, 2× Mash': 'Between games',
  'Between games — 3× Mash, Half overhand, Mash': 'Between games',
  'New or sorted deck — 5× Mash, Pile, 5× Mash': 'New or sorted deck',
}

/** What to call a method: its name, or its moves in notation. */
export function methodName(experiment: Experiment): string {
  return experiment.name || (experiment.seq.length ? compressSeq(experiment.seq) : 'Empty routine')
}

export function uid(): string {
  return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

const fromSeed = (experiment: Omit<Experiment, 'id'>): Experiment => ({ id: uid(), ...experiment, seq: experiment.seq.slice() })

export function defaultExperiments(): Experiment[] {
  return SEED.map(fromSeed)
}

/**
 * Read one saved entry. Older entries carry a `title`, which was set to the moves when the person left the name blank;
 * that kind of title is dropped so the name follows later edits. Unknown move names become 'overhand'.
 */
function readEntry(entry: { id: string; name?: string; title?: string; seq?: string[] }): Experiment {
  const seq = (entry.seq ?? []).map((op): OpKey => (isOpKey(op) ? op : 'overhand'))
  const title = entry.name ?? entry.title
  const name = title && title !== compressSeq(seq) ? (OLD_DEFAULT_TITLES[title] ?? title) : undefined
  return name ? { id: entry.id, name, seq } : { id: entry.id, seq }
}

/** Load saved methods, falling back to the defaults, and add any defaults newer than the saved list. */
export function loadExperiments(): Experiment[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Parameters<typeof readEntry>[0][] | null
    if (!Array.isArray(saved) || !saved.length) return defaultExperiments()
    const list = saved.map(readEntry)
    const savedVersion = Number(localStorage.getItem(DEFAULTS_VERSION_KEY) ?? 0)
    if (savedVersion >= DEFAULTS_VERSION) return list
    const held = new Set(list.map((experiment) => experiment.seq.join(',')))
    return list.concat(SEED.filter((experiment) => !held.has(experiment.seq.join(','))).map(fromSeed))
  } catch {
    // unreadable storage: use defaults
    return defaultExperiments()
  }
}

export function saveExperiments(list: Experiment[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    localStorage.setItem(DEFAULTS_VERSION_KEY, String(DEFAULTS_VERSION))
  } catch {
    // storage full or blocked: changes last for this visit only
  }
}
