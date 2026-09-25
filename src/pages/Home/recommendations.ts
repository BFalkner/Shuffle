// The two routines the home page recommends, as shown on its cards.

export interface Recommendation {
  name: string
  /** the situation the routine is for */
  crown: string
  /** optional "Use on:" line */
  when?: string
  blurb: string
}

export const RECOMMENDATIONS: Recommendation[] = [
  {
    name: '3 mashes, half overhand, 1 mash',
    crown: 'Between games',
    blurb: 'After a game, the cards you played go back on top in a clump. Three mashes spread that clump through the deck. Then cut, overhand the top half, and mash once more. The overhand stacks its packets in reverse order, so any run longer than a packet is cut apart, however the mashes fell. It takes five moves. Our finer tests still find traces of the old order, and the footnote has the numbers.',
  },
  {
    name: '5 mashes, pile, 5 mashes',
    crown: 'New or sorted deck',
    when: 'a freshly built or sorted deck, or any deck you’re unsure about.',
    blurb: 'A new deck starts with every card next to the cards it was sorted with. Five mashes break up the long runs. Then deal the deck into six piles and stack them, which always puts cards that sat together into different piles. Five more mashes weave the piles back together. It’s slower than mashing alone, but a new deck only needs it once. From every starting deck we tried, it cleared every test as often as a perfectly random deck.',
  },
]
