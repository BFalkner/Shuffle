import Writeup from './Writeup'

export default function GlobalTests() {
  return (
    <Writeup
      title="The global tests"
      subtitle="Position bias and the live classifier: the two backstops, built for a deterministic deal that fools every single-deck test and for structure nobody thought to name."
    >
      <h2>Two tests that read the deck as a whole</h2>
      <p>
        Every other diagnostic reads one property: runs, neighbours, fragments or spacing. Both tests here were added after decks turned up that passed all
        of those and were still provably not random. They are the backstops.
      </p>

      <h2>Position: built because the pile deal is deterministic</h2>
      <p>
        The pile shuffle is the best move in the battery at separating neighbours, and the worst in a way no single-deck test can see:{' '}
        <i>it does not shuffle</i>. Deal 99 cards into six piles and stack them back, and every card ends up exactly where the arithmetic says it will. Do
        it twice and the deck is still fully determined. Any one such deck looks thoroughly disordered, with runs broken, neighbours separated and chains
        gone, so every test that examines a single deck passes it.
      </p>
      <p>
        The flaw only shows <i>across</i> decks, so the test has to look there. Run the same method many times, count how often each card lands in each
        position, and compare that table to a uniform one with a chi-square test. A random process spreads each card over every position; a deterministic
        one sends it to the same place every time, and the table shows it plainly. This test fails a pile-only routine outright, and it is why neither
        recommended method on the home page ends with a pile deal.
      </p>
      <p>
        The statistic has (99−1)² = 9,604 degrees of freedom. A truly random process averages exactly that <i>regardless of the number of trials</i>, while
        a biased one accumulates excess in proportion to the number of trials. That is why the pass threshold scales with the number of trials run rather
        than sitting at a fixed number.
      </p>

      <h2>Distinguishability: the test that admits we might have missed something</h2>
      <p>
        Every test above answers a question we thought to ask. The obvious worry is the question nobody thought of: structure in the overall shape of the
        arrangement that shows up in no single property we named. This test asks a machine to find it.
      </p>
      <p>
        A logistic-regression classifier is trained during every run to separate this method&rsquo;s decks from genuinely random ones, using gap-spacing
        features and neighbour correlation, and it is scored on held-out accuracy. If it cannot beat a coin flip, the deck is indistinguishable from random
        along every axis the classifier can see. If it can, there is structure, even if no named test has fired.
      </p>
      <p>
        It has already proved its worth. When the mash model was refitted to a real hand, this test flagged decks at the fifth pass as clearly detectable
        while ordering, proximity and position all reported passes. Tracing that disagreement through the classifier&rsquo;s features turned up the
        over-dispersion (a strict riffle spreading neighbours <i>too</i> evenly), which led directly to proximity gaining a lower bound. The classifier
        found a gap in the battery that the other tests could not see.
      </p>
      <p>
        Read its numbers with its own noise in mind. Trained on random decks against random decks, where the true answer is exactly 50%, it still reads as
        high as 53% on training luck alone, so anything below that means nothing. Near the 56% threshold, results vary by about ±2 points from run to run,
        and a method only fails <i>consistently</i> from roughly 60% up. It is a deliberately simple model: a random forest on the same features cost forty
        to a hundred times as much and scored one to six points <i>worse</i>. Treat a pass as necessary evidence, not proof.
      </p>
    </Writeup>
  )
}
