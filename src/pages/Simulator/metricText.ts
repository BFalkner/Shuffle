// What the simulator says about each metric: a short description and a link to its write-up.
import type { MetricKey } from '../../engine/metrics'

export type WriteupRoute = '/order-tests' | '/global-tests'

export interface MetricText {
  /** Short description. `<i>…</i>` marks italics; nothing else is markup. */
  desc: string
  writeup: { to: WriteupRoute; label: string }
}

/** The usual label for a link to a metric's write-up. */
const FULL = 'Full write-up'

export const METRIC_TEXT: Record<MetricKey, MetricText> = {
  neighbourOrder: {
    desc: 'For each card, whether the card that followed it in the old order still comes after it, across the shuffled decks. The more consistently a pair lands one way, kept or reversed, the more it counts. It shows whether old neighbours land predictably.',
    writeup: { to: '/order-tests', label: FULL },
  },
  pairOrder: {
    desc: 'It looks at every pair of cards, not just neighbours, and compares how many are still in their old order with how many are reversed. It catches a faint lean toward the old order across the whole deck, such as played cards spread through it.',
    writeup: { to: '/order-tests', label: FULL },
  },
  proximity: {
    desc: 'How many places apart old neighbours end up, and how many land at distances a random deck wouldn’t produce. It shows whether cards that sat together stay close, as after an overhand, or spread <i>too</i> evenly, as after a pile.',
    writeup: { to: '/order-tests', label: FULL },
  },
  position: {
    desc: 'For each starting place, which tenth of the deck its card ends in, compared with an even spread. A few bad places count heavily. It shows whether knowing where a card started tells you where it is now, like the mash’s top and bottom cards.',
    writeup: { to: '/global-tests', label: FULL },
  },
  classifier: {
    desc: 'A simple classifier learns to tell these decks from random ones, then guesses on decks it hasn’t seen. The value is how often it’s right, where 50% is a coin flip. It catches patterns the other tests miss, and isn’t part of the total.',
    writeup: { to: '/global-tests', label: FULL },
  },
}
