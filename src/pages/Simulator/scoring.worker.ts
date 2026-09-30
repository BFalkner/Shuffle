// Scores one routine at a time off the main thread, so the page stays responsive while thousands of decks are dealt.
//
// Each job is seeded from its own key (deck kind, size and moves), so a routine gets the same score in every worker and
// every visit: undoing an edit brings back exactly the numbers it had. The classifier's random decks are drawn from
// their own fixed seed first, so they are the same in every worker too.
import { randomFeatures } from '../../engine/classifier'
import { hash, seed } from '../../engine/seeded'
import { computeResult } from '../../engine/simulate'
import type { ScoreJob } from './scorer'

const RANDOM_DECKS_SEED = 0x5eed

addEventListener('message', (event: MessageEvent<ScoreJob>) => {
  const { key, kind, deckSize, seq } = event.data
  seed(RANDOM_DECKS_SEED + deckSize)
  randomFeatures(deckSize)
  seed(parseInt(hash(key), 16) | 0)
  postMessage({ key, result: computeResult(kind, deckSize, seq) })
})
