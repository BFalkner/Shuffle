import Writeup from './Writeup'

export default function OrderTests() {
  return (
    <Writeup
      title="Reading residual order"
      subtitle="Seven diagnostics for leftover sequence, and the decks that forced each one into existence: the overhand that beat run-counting, and the pile lattice that no read-through can see."
    >
      <h2>The battery grew one gap at a time</h2>
      <p>
        None of these tests was designed in advance. Each one exists because a deck passed every test we already had and was still plainly not random.
        They appear here in the order those decks turned up.
      </p>

      <h2>Ordering: the first test, and the reason for the second</h2>
      <p>
        The first question was the simple one: how many shuffles does it take? Rising sequences answer it. Count the maximal ascending runs the deck breaks
        into (one when sorted, and about 50.1 on average when random, with a standard deviation of 2.9) and watch the count climb toward random.
      </p>
      <p>
        The test became two-sided after a deliberate attempt to break it. A reversed deck reads far <i>above</i> fifty, and an early one-sided version
        passed it. Too many runs is as much a fingerprint as too few.
      </p>
      <p>
        What ordering cannot see is a deck whose runs are broken but whose neighbours are intact. Overhand shuffling produces exactly that. It reverses the
        order of the packets, so the run count jumps toward random within a few passes while cards that started side by side are still side by side.
        Ordering declared those decks shuffled, and they were not.
      </p>

      <h2>Proximity: built to catch the overhand</h2>
      <p>
        Proximity counts the originally adjacent pairs still within three positions of each other: 98 in a sorted 99-card deck, and 5.9 on average in a
        random one. It fails an overhand-only routine no matter how long you keep going, and it is the reason the pile shuffle earns a place in a method at
        all. A pile deal is the only move that puts every neighbouring pair into separate stacks in a single pass.
      </p>
      <p>
        Proximity gained a <i>lower</i> bound much later, and by accident. After the riffle model was refitted to a hand-measured mash, with packets that
        are mostly single cards, the close-pair count from a sorted deck did something unexpected around the fifth pass. It dropped to roughly 1.6, far{' '}
        <i>below</i> the random 5.9, and only recovered later. The interleave was fine enough to spread original neighbours more evenly than chance would.
        The classifier had already flagged those decks as detectable while proximity reported a comfortable pass, and that disagreement forced the
        question.
      </p>
      <p>
        Fixing it took a different kind of threshold. The over-dispersion is smaller than two per-deck standard deviations, so a band scaled by per-deck
        spread cannot see it. The lower bound is rate-based instead: three standard errors below the random mean at the test&rsquo;s trial count. Spreading
        neighbours too evenly is as non-random as leaving them clumped, and the test now fails it.
      </p>

      <h2>Global proximity: the same question without a threshold</h2>
      <p>
        Proximity asks a yes-or-no question of every pair: are they within three positions? The threshold gives a clean pass/fail number but throws away
        distance, so a pair sitting four apart and a pair sitting forty apart both simply fail to count. Global proximity keeps the distance. For every pair
        of cards now adjacent in the shuffled deck, it measures how far apart those two cards originally sat, subtracts one so that an unmoved neighbour
        scores zero, and averages over all ninety-eight pairs.
      </p>
      <p>
        On a random 99-card deck the value sits close to 32, and the spread is tight enough that a rate-based band, the same approach as proximity&rsquo;s
        lower bound, catches real deviation quickly. Checked against proximity directly, the two are not measuring the same thing twice. At any single point
        in a mash sequence, knowing one tells you almost nothing about the other. They move together across a whole shuffle only because both climb as the
        deck randomizes.
      </p>
      <p>
        It has one blind spot, worth stating up front: it never dips below the random band the way proximity does at the over-dispersion point. A distance
        and a count are different measurements, and this one is not sensitive to that anomaly. Where it is sharp is on moves that keep pairs together
        outright. An overhand-only routine fails it low, permanently and unmistakably, however many passes you run, because packets that move as blocks
        never separate the pairs inside them.
      </p>

      <h2>Neighbour correlation: the cheap confirmation</h2>
      <p>
        This is the Pearson correlation between adjacent card values: near +1 when sorted, near −1 when reversed and near 0 when random. It was suggested
        rather than forced on us by a failing deck. It gives a second, independent reading of the property proximity measures, and it responds to gradual
        drift rather than exact adjacency. It has never caught anything on its own. Its job is to corroborate.
      </p>

      <h2>The fragment counters: catching what averages dilute</h2>
      <p>
        Aggregate statistics have a blind spot. One intact fragment in an otherwise random deck barely moves an average over ninety-nine cards, yet a player
        who knows a five-card sequence survived has real information. Three tests look for survivors directly.
      </p>
      <p>
        <b>Longest chain</b> came first. It is the longest run of consecutive cards still in forward order anywhere in the deck. Random decks sit near four
        or five; a reading of nine means an intact fragment that every aggregate test above averaged away.
      </p>
      <p>
        <b>Strided chain</b> exists because of the pile shuffle, and it is the clearest example of a test built for one specific weakness. A six-pile deal
        leaves cards 3, 9, 15 and 21 in perfect order. That lattice is invisible to any test that reads the deck front to back, because no <i>adjacent</i>{' '}
        cards are in sequence. Longest chain sees nothing, and neither does ordering. The deck reads as well shuffled, yet anyone who knows the pile count
        can reconstruct it. Strided chain looks for exactly this pattern at every stride, and it is the reason a pile deal can never be the last move in a
        method.
      </p>
      <p>
        <b>Local order</b> is the density of three or more consecutive cards still sitting together. It is effectively zero in a random deck, so any
        reading at all is leftover sequence. It catches small survivors that are too short to register as a longest chain but too numerous to be chance.
      </p>
    </Writeup>
  )
}
