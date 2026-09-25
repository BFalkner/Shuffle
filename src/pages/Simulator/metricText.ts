// What the simulator says about each test: a short description and a link to its write-up.
import type { MetricKey } from '../../engine/metrics'

export type WriteupRoute = '/order-tests' | '/global-tests' | '/mana-tests' | '/sticky-ends'

export interface MetricText {
  /** Short description. `<i>…</i>` marks italics; nothing else is markup. */
  desc: string
  writeup: { to: WriteupRoute; label: string }
}

/** The usual label for a link to a test's write-up. */
const FULL = 'Full write-up'

export const METRIC_TEXT: Record<MetricKey, MetricText> = {
  ordering: {
    desc: 'Counts the rising runs the deck breaks into: one when sorted, about 50 when random. Built for the mash, which leaves long runs for several passes. Too many runs is leftover order too, so the test is two-sided.',
    writeup: { to: '/order-tests', label: FULL },
  },
  proximity: {
    desc: 'Counts pairs of cards that started side by side and are still within three places. Built for the overhand, which keeps neighbours together. Too few also fails: a pile deal or an early mash spreads neighbours <i>too</i> evenly.',
    writeup: { to: '/order-tests', label: FULL },
  },
  drift: {
    desc: 'For each pair of cards now side by side, how far apart they started. Proximity as a distance rather than a count. An overhand-only routine fails it low, because its packets never separate the pairs inside them.',
    writeup: { to: '/order-tests', label: FULL },
  },
  gaps: {
    desc: 'How far apart cards that started side by side now sit, at every distance, compared with a random deck. Seven mashes from a sorted deck leave too many pairs touching and too few two to eight apart.',
    writeup: { to: '/order-tests', label: FULL },
  },
  position: {
    desc: 'Whether cards keep landing in the same places across many shuffles, using a chi-square over every card and position. Built for the pile deal, which puts every card in a fixed place.',
    writeup: { to: '/global-tests', label: FULL },
  },
  endret: {
    desc: 'Whether the original top card and bottom card are still within three places of their end: 0.08 when random. Built for the mash, which barely moves the ends. Two-sided, and judged on the average over many shuffles.',
    writeup: { to: '/sticky-ends', label: 'The sticky-ends write-up' },
  },
  corr: {
    desc: 'Correlation between each card and the next: +1 sorted, −1 reversed, 0 random. A second reading of what proximity measures. It has never caught anything on its own.',
    writeup: { to: '/order-tests', label: FULL },
  },
  classifier: {
    desc: 'A classifier trained during each run to tell these decks from truly random ones. 50% is a coin flip. The catch-all for patterns no named test looks for. Readings under about 54% are luck.',
    writeup: { to: '/global-tests', label: FULL },
  },
  chain: {
    desc: 'The longest run of consecutive cards still in order anywhere in the deck. Random decks show four or five. The mash leaves longer runs for its first few passes.',
    writeup: { to: '/order-tests', label: FULL },
  },
  strided: {
    desc: 'The longest run of cards evenly spaced in the old order and still in sequence. Built for the pile deal’s every-sixth-card pattern, but ordering and proximity already catch that pile, so it confirms rather than catches.',
    writeup: { to: '/order-tests', label: FULL },
  },
  gradient: {
    desc: 'How often three or more consecutive cards still sit together in order. Near zero when random. Built for the overhand, which keeps short runs intact inside its packets.',
    writeup: { to: '/order-tests', label: FULL },
  },
  spacing: {
    desc: 'How much the gaps between lands vary. Built for mana weaving: lands spaced <i>too</i> evenly read low, and clumped lands read high. It clears within a mash or two.',
    writeup: { to: '/mana-tests', label: FULL },
  },
  clump: {
    desc: 'How far each run of ten cards strays from the expected mix of card types, averaged over many shuffles. Catches the weaving and clumps that land spacing lets through. Too little clumping fails too.',
    writeup: { to: '/mana-tests', label: FULL },
  },
}
