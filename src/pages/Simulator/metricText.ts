// What the simulator says about each metric: a short description and a link to its write-up.
import type { MetricKey } from '../../engine/metrics'

export type WriteupRoute = '/order-tests' | '/global-tests' | '/sticky-ends'

export interface MetricText {
  /** Short description. `<i>…</i>` marks italics; nothing else is markup. */
  desc: string
  writeup: { to: WriteupRoute; label: string }
}

/** The usual label for a link to a metric's write-up. */
const FULL = 'Full write-up'

export const METRIC_TEXT: Record<MetricKey, MetricText> = {
  sequence: {
    desc: 'Whether cards that started next to each other still come in the same order. A random deck keeps half of them in order. The mash keeps most of them. The overhand reverses most of them, which counts too.',
    writeup: { to: '/order-tests', label: FULL },
  },
  proximity: {
    desc: 'How far apart cards that started next to each other end up, compared with a random deck. The overhand leaves them too close. A pile deal or an early mash spreads them <i>too</i> evenly. Both count.',
    writeup: { to: '/order-tests', label: FULL },
  },
  spread: {
    desc: 'Whether a card’s starting place tells you where it ends up. It checks the worst starting place, so a few cards that stay put count, like the mash’s top and bottom cards. A pile deal fails it completely.',
    writeup: { to: '/global-tests', label: FULL },
  },
  ends: {
    desc: 'How often the top and bottom cards stay within three places of their end. A random 99-card deck leaves each one there 4 times in 99. The mash barely moves the ends.',
    writeup: { to: '/sticky-ends', label: 'The sticky-ends write-up' },
  },
  classifier: {
    desc: 'A classifier learns to tell these decks from random ones. It catches patterns the three categories don’t look for. It isn’t part of the total, and its readings are noisier than the others.',
    writeup: { to: '/global-tests', label: FULL },
  },
}
