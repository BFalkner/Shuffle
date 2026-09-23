import Writeup from './Writeup'

export default function OrderTests() {
  return (
    <Writeup
      title="Reading residual order"
      subtitle="Six diagnostics for leftover sequence, and the decks that forced each one into existence — the overhand that beat run-counting, the pile lattice no read-through can see."
    >
      <h2>The battery grew one hole at a time</h2>
      <p>
        None of these tests was designed in advance. Each one exists because a deck passed everything we already had and was still, plainly, not random.
        The order in which they arrived is the order in which those decks turned up.
      </p>

      <h2>Ordering — the first test, and the reason for the second</h2>
      <p>
        The starting question was the simple one: how many shuffles does it take? Rising sequences answer it. Count the maximal ascending runs the deck
        breaks into — one when sorted, about 50.1 on average when random, standard deviation 2.9 — and watch the number climb toward random.
      </p>
      <p>
        It was made two-sided after a deliberate attempt to break it: a reversed deck reads far <i>above</i> fifty, and an early one-sided version waved it
        through. Too many runs is as much a fingerprint as too few.
      </p>
      <p>
        What ordering cannot see is a deck whose runs are broken but whose neighbours are intact. Overhand shuffling produces exactly that — it reverses
        packet order, so the run count leaps toward random within a few passes while cards that started side by side are still side by side. Ordering
        declared such decks shuffled. They obviously were not.
      </p>

      <h2>Proximity — built to catch the overhand</h2>
      <p>
        Count the originally-adjacent pairs still within three positions of each other: 98 in a sorted 99-card deck, 5.9 on average in a random one. This
        is the test that fails an overhand-only routine no matter how long you keep going, and it is the reason the pile shuffle earns its place in a method
        at all — a pile deal is the only move that forces every neighbouring pair into separate stacks in a single pass.
      </p>
      <p>
        Proximity acquired a <i>lower</i> bound much later, and by accident. After the riffle model was refitted to a hand-measured mash — packets that are
        mostly single cards — the close-pair count from a sorted deck did something unexpected around the fifth pass: it dropped to roughly 1.6, far{' '}
        <i>below</i> the random 5.9, and only relaxed back later. The interleave was so fine it was spreading original neighbours more evenly than chance
        would. The classifier had already flagged those decks as detectable while proximity was reporting a comfortable pass, which is what forced the
        question.
      </p>
      <p>
        Fixing it required a different kind of threshold. The over-dispersion is under two per-deck standard deviations, invisible to a band scaled by
        per-deck spread, so the lower bound is rate-based instead: three standard errors below the random mean at the test&rsquo;s trial count. Too evenly
        spread is as non-random as too clumped, and now it fails.
      </p>

      <h2>Global proximity — the same question, without a threshold</h2>
      <p>
        Proximity asks a binary question of every pair: are they within three positions, yes or no. That threshold is useful for a clean pass/fail number,
        but it discards magnitude — a pair sitting four apart and a pair sitting forty apart both just fail to count. Global proximity keeps the magnitude.
        For every pair still adjacent in the shuffled deck, it measures how far apart those two cards originally sat, subtracts one so that an unmoved
        neighbour scores zero, and averages across all ninety-eight pairs.
      </p>
      <p>
        On a random 99-card deck the number sits close to 32, with a tight enough spread that a rate-based band — the same convention as proximity&rsquo;s
        lower bound — catches real deviation quickly. Checked against proximity directly, the two are not measuring the same thing twice: at any single
        point in a mash sequence, knowing one tells you almost nothing about the other. They are correlated across a whole shuffle only because both happen
        to climb as the deck randomizes, the same way two unrelated clocks agree that time is passing.
      </p>
      <p>
        It has one honest blind spot worth stating rather than discovering later: it never dips below the random band the way proximity does at the
        over-dispersion point. Magnitude and count are different measurements, and this one is not sensitive to that particular anomaly. Where it is sharp
        is on moves that preserve pairs outright — an overhand-only routine reads as a permanent, unmistakable low failure no matter how many passes you
        run, because packets moving as blocks never actually separate a pair.
      </p>

      <h2>Neighbour correlation — the cheap confirmation</h2>
      <p>
        The Pearson correlation between adjacent card values: near +1 sorted, near −1 reversed, near 0 random. This one was suggested rather than provoked
        — it is a second, independent read on the same property proximity measures, sensitive to gradual drift rather than exact adjacency. It has never
        been the test that catches something alone, and that is fine: it is the corroborating witness.
      </p>

      <h2>The fragment counters — catching what averages dilute</h2>
      <p>
        Aggregate statistics have a blind spot: one intact fragment in an otherwise random deck barely moves an average over ninety-nine cards. But a player
        who knows a five-card sequence survived has real information. Three tests hunt survivors directly.
      </p>
      <p>
        <b>Longest chain</b> came first — the longest run of consecutive cards still in forward order anywhere in the deck. Random decks sit near four or
        five; a reading of nine means an intact splinter that every aggregate test above averaged into invisibility.
      </p>
      <p>
        <b>Strided chain</b> exists because of the pile shuffle, and it is the sharpest example of a test built for one specific attacker. A six-pile deal
        leaves cards 3, 9, 15, 21 in perfect order — a lattice, invisible to any test that reads the deck front to back, because nothing <i>adjacent</i> is
        in sequence. Longest chain sees nothing. Ordering sees nothing. The deck reads beautifully shuffled and can be reconstructed by anyone who knows the
        pile count. Strided chain looks for exactly that pattern at every stride, and it is the reason a pile deal can never be the last move in a method.
      </p>
      <p>
        <b>Local order</b> is the density of three-or-more consecutive cards still sitting together — effectively zero in a random deck, so any reading at
        all is leftover sequence. It catches the small survivors that are too short to register as a longest chain but too numerous to be chance.
      </p>
    </Writeup>
  )
}
