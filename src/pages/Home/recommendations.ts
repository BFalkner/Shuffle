// The two routines the home page recommends, as shown in its routine blocks.
import type { Pip } from './Cost'

export interface Recommendation {
  /** the routine, in words */
  name: string
  /** the situation the routine is for; the block's title */
  crown: string
  /** the routine as move pips, with repeat counts */
  moves: [Pip, number][]
  /** optional "Use on:" line */
  when?: string
  blurb: string
}

export const RECOMMENDATIONS: Recommendation[] = [
  {
    name: '3 mashes, half overhand, 2 mashes',
    crown: 'Between games',
    moves: [
      ['M', 3],
      ['OHt', 1],
      ['M', 2],
    ],
    blurb: 'After a game, the cards you played go back on top in a clump. Three mashes spread that clump through the deck. Then cut, overhand the top half, and mash twice more. The overhand stacks its packets in reverse order, so any run longer than a packet is cut apart, however the mashes fell. It takes six moves. Our tests still find traces of the old order, and the footnote has the numbers.',
  },
  {
    name: '5 mashes, pile, 5 mashes',
    crown: 'New or sorted deck',
    moves: [
      ['M', 5],
      ['P', 1],
      ['M', 5],
    ],
    when: 'a freshly built or sorted deck, or any deck you’re unsure about.',
    blurb: 'A new deck starts with every card next to the cards it was sorted with. Five mashes break up the long runs. Then deal the deck into six piles and stack them, which always puts cards that sat together into different piles. Five more mashes weave the piles back together. It’s slower than mashing alone, but a new deck only needs it once. From every starting deck we tried, it cleared every test as often as a perfectly random deck.',
  },
]
