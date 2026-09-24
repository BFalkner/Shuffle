import { Link } from 'react-router'
import Writeup from './Writeup'

export default function OrderTests() {
  return (
    <Writeup
      title="Tests for leftover order"
      subtitle="How we check that a shuffled deck has lost its old order, and which shuffle made us add each test."
    >
      <h2>We added these tests one at a time</h2>
      <p>
        We didn&rsquo;t plan these tests in advance. Each time a shuffled deck passed every test we had and still wasn&rsquo;t random, we added a test
        that could see what it left behind. This page follows that order. Each section starts with the shuffle that got past the tests we had, then
        explains the tests that catch it.
      </p>

      <h2>The mash leaves long runs in order</h2>
      <p>
        The first question was the simple one: how many mashes does it take? A mash splits the deck in two and lets the halves fall together. Each half
        keeps its cards in their original order, so after one mash a sorted deck is two long runs woven together. Each mash roughly doubles the number of
        runs, and it takes several mashes before the runs are short enough to look random.
      </p>

      <h3>Ordering</h3>
      <p>
        Ordering counts the runs of cards that are still in rising order. A sorted deck is one run. A random 99-card deck breaks into about 50.1 runs,
        with a standard deviation of 2.9. From a sorted deck, the mash passes ordering at the sixth mash.
      </p>
      <p>
        The test is two-sided. An early version failed only decks with too few runs, and a reversed deck passed it. A reversed deck breaks into 99 runs of
        one card each, which is as far from random as a single run. Too many runs is as much a trace of the old order as too few.
      </p>

      <h3>Longest chain</h3>
      <p>
        A run count is an average over the whole deck. One run that survives in one piece barely changes it, but a player who knows five cards are still in
        order has real information. Longest chain finds the longest run of consecutive cards still in forward order anywhere in the deck. In a random deck
        that run is usually four or five cards long. A reading of nine means a piece of the old order survived. From a sorted deck, the mash passes
        longest chain at the fifth mash.
      </p>

      <h2>The overhand keeps neighbours together</h2>
      <p>
        The overhand got past ordering. It moves the deck in small packets and reverses their order, so the run count gets close to random within a few
        passes. But the cards inside each packet stay together and stay in order. Cards that started side by side are still side by side. Ordering passed
        those decks, and they weren&rsquo;t random. Six overhands from a sorted deck still pass ordering and still fail all four tests in this section.
      </p>

      <h3>Proximity</h3>
      <p>
        Proximity counts pairs of cards that started next to each other and are still within three places of each other. A sorted 99-card deck has 98 of
        these pairs, and a random deck has about 5.9. An overhand-only routine never passes, however long you keep going.
      </p>

      <h3>Local order</h3>
      <p>
        Local order counts places where three or more consecutive cards still sit together in order. In a random deck the count is almost zero, so any
        reading is leftover order. It catches the short runs inside overhand packets. Those runs are too short to show up as a longest chain, but there are
        too many of them to be chance.
      </p>

      <h3>Global proximity</h3>
      <p>
        Proximity asks a yes-or-no question of each pair: are the two cards within three places of each other? That gives a clean count, but it ignores
        distance. A pair four apart and a pair forty apart both just fail to count. Global proximity keeps the distance. For each pair of cards now side by
        side, it measures how far apart they started, minus one, so a pair that never moved scores zero. It then averages over all 98 pairs. A random
        99-card deck scores about 32.
      </p>
      <p>
        An overhand-only routine fails it low every time, because the pairs inside each packet never separate. Global proximity and proximity don&rsquo;t
        measure the same thing twice. At any single point in a mash sequence, knowing one tells you almost nothing about the other. Global proximity also
        misses the too-even spread described at the end of this page, which proximity catches.
      </p>

      <h3>Neighbour correlation</h3>
      <p>
        Neighbour correlation measures how closely each card&rsquo;s number follows the number of the card before it. It reads near +1 for a sorted deck,
        near &minus;1 for a reversed one and near 0 for a random one. We added it on a suggestion, not because a deck got past the other tests. It gives a
        second, independent reading of what proximity measures. It has never caught anything on its own. Its job is to confirm the others.
      </p>

      <h2>The pile leaves every sixth card in sequence</h2>
      <p>
        A pile deal from a sorted deck puts cards 21, 15, 9 and 3 side by side. They sat six apart in the old order and are still in
        sequence, only reversed. No two neighbours are consecutive cards, so we expected tests
        that read the deck front to back to miss the pattern. We built strided chain for it. Strided chain looks for runs of cards that are evenly spaced in
        the old order and still in sequence, in either direction.
      </p>
      <p>
        In the current model, strided chain hasn&rsquo;t turned out to be necessary. A single pile deal from a sorted deck leaves 17 runs, so ordering
        fails it. It also fails proximity on the low side. The deal is fixed, so in a 99-card deck 82 of the 98 pairs of
        neighbours always land 16 or 17 places apart, and the rest land 83 apart. None stays close, and a random deck keeps a few close by chance.
        Across the pile routines we tried, strided chain failed only where ordering and proximity also failed. Like neighbour correlation, it confirms rather
        than catches.
      </p>
      <p>
        The pile&rsquo;s lasting weakness is that the deal isn&rsquo;t random. Every card lands where the arithmetic puts it. The{' '}
        <Link to="/global-tests">position test</Link> catches that, and it&rsquo;s the failure that keeps showing up in routines with a pile in them.
      </p>

      <h2>The mash spreads neighbours too evenly</h2>
      <p>
        Proximity gained a lower bound much later. After we refitted the mash model to a hand-measured mash, with packets that are mostly single cards,
        the close-pair count from a sorted deck did something unexpected around the fifth mash. It dropped to roughly 1.6, far below the random 5.9, and
        recovered only later. The interleave was fine enough to spread old neighbours more evenly than chance would.
      </p>
      <p>
        <Link to="/global-tests">Distinguishability</Link> had already flagged those decks as detectable while proximity reported a comfortable pass. That
        disagreement is what showed us the problem. The fix needed a different kind of threshold. The too-even spread is smaller than two per-deck
        standard deviations, so a band based on per-deck spread can&rsquo;t see it. The lower bound works on the average over all trials instead. It sits
        three standard errors below the random mean. Spreading neighbours too evenly is as far from random as leaving them together, and proximity now
        fails it.
      </p>
    </Writeup>
  )
}
