import Writeup from './Writeup'

export default function GlobalTests() {
  return (
    <Writeup
      title="The global tests"
      subtitle="Position bias and the live classifier — the two backstops, built for a deterministic deal that fools every single-deck test and for the structure nobody thought to name."
    >
      <h2>Two tests that read the deck as a whole</h2>
      <p>
        Every other diagnostic reads one property — runs, neighbours, fragments, spacing. Both tests here were built after decks arrived that passed all of
        those and were still, provably, not random. They are the backstops.
      </p>

      <h2>Position — built because the pile deal is deterministic</h2>
      <p>
        The pile shuffle is the best move in the battery at separating neighbours and the worst in a way no single-deck test can see:{' '}
        <i>it does not shuffle</i>. Deal 99 cards into six piles and stack them back, and every card ends up exactly where the arithmetic says it will. Do
        it twice and the deck is still fully determined. Look at any one such deck and it appears thoroughly disordered — runs broken, neighbours
        separated, chains gone. Every test that examines a single deck in isolation passes it.
      </p>
      <p>
        The flaw only exists <i>across</i> decks, so the test has to look there. Run the same method many times and count how often each card lands in each
        slot, then compare that table to uniform with a chi-square. A random process spreads each card over every position; a deterministic one sends it to
        the same place every time, and the table lights up. This is the test that fails a pile-only routine outright, and it is why every recommended
        method on the landing page ends with mashing rather than a deal.
      </p>
      <p>
        The statistic has (99−1)² = 9,604 degrees of freedom and a truly random process averages exactly that <i>regardless of trial count</i>, while a
        biased one accumulates excess linearly with trials — which is why the pass ceiling scales with the number of chains run rather than sitting at a
        fixed number.
      </p>

      <h2>Distinguishability — the test that admits we might have missed something</h2>
      <p>
        Every test above answers a question we thought to ask. The obvious worry is the question nobody thought of: structure sitting in the joint shape of
        the arrangement, in no single property any of us named. So this one asks a machine to find it.
      </p>
      <p>
        A logistic-regression classifier is trained during every run to separate this method&rsquo;s decks from genuinely random ones, using gap-spacing
        features and neighbour correlation, and scored on held-out accuracy. If it cannot beat a coin flip, the deck is indistinguishable from random along
        every axis it can see. If it can, there is structure — even if no named test has fired.
      </p>
      <p>
        It earned its place. When the mash model was refitted to a real hand, this test flagged decks at the fifth pass as clearly detectable while
        ordering, proximity and position all reported passes. Chasing that discrepancy through its features turned up the over-dispersion — a strict riffle
        spreading neighbours <i>too</i> evenly — and led directly to proximity gaining a lower bound. The classifier found a hole in the battery that the
        battery could not see.
      </p>
      <p>
        Read its numbers with its own noise in mind. Trained on random against random, where the true answer is exactly 50%, it still reads as high as 53%
        on training luck alone, so anything below that means nothing. Near the 56% threshold, run-to-run wiggle is about ±2 points; a method only fails{' '}
        <i>consistently</i> from roughly 60% up. It is deliberately a simple model — a random forest on these same features measured forty to a hundred
        times the cost and one to six points <i>worse</i> — so treat a pass as necessary evidence, not proof.
      </p>
    </Writeup>
  )
}
