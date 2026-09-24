import { Link } from 'react-router'
import Writeup from './Writeup'

export default function GlobalTests() {
  return (
    <Writeup
      title="Tests across many shuffles"
      subtitle="Two tests that look at many shuffled decks together: one for shuffles that give the same result every time, and one for patterns we didn't think to test for."
    >
      <h2>Most tests look at one deck at a time</h2>
      <p>
        The <Link to="/order-tests">tests for leftover order</Link> each read one shuffled deck and look for one kind of trace: runs, neighbours or
        fragments. Some problems don&rsquo;t show up in any single deck. They only show up when you shuffle the same way many times and compare the
        results. The two tests on this page work that way.
      </p>

      <h2>The pile always deals the same way</h2>
      <p>
        A pile deal doesn&rsquo;t shuffle. Deal 99 cards into six piles and stack them, and every card lands exactly where the arithmetic puts it. Deal
        again and the deck is still fully determined. Anyone who knows the deck before the deal knows it after.
      </p>
      <p>
        Single-deck tests often catch a pile anyway, because a pile leaves patterns of its own. But a pile can also hide a problem. Three mashes from a
        played deck fail global proximity, end retention,
        position and distinguishability. Add a pile at the end and every single-deck test passes, in all five of our runs.
        The pile rearranges each deck thoroughly, but it adds nothing random, so the bias the three mashes left behind is still there. Only a test that
        compares many decks can see it.
      </p>

      <h3>Position</h3>
      <p>
        Position runs the same routine 1,200 times, counts how often each card lands in each position, and compares that table with an even one using a
        chi-square test. A random shuffle spreads each card over every position. A fixed deal sends each card to the same place every time. Six piles from
        a sorted deck score over 11 million, where a random shuffle scores about 9,600.
      </p>
      <p>
        That 9,600 is (99&minus;1)&sup2; = 9,604, the test&rsquo;s degrees of freedom. A random shuffle averages that no matter how many trials you run. A
        biased shuffle scores higher, and its excess grows with the number of trials. The simulator always runs 1,200 trials and fails a routine that
        scores above about 13,900, which is 1.45 times the random average. A different trial count would need a different threshold.
      </p>

      <h2>A catch-all for what we didn&rsquo;t think of</h2>
      <p>
        Every other test answers a question we thought to ask. The obvious worry is the question nobody thought of: a pattern in the overall shape of the
        deck that shows up in none of the properties we named. Distinguishability asks a program to find one.
      </p>

      <h3>Distinguishability</h3>
      <p>
        During every run, the simulator trains a simple classifier to tell this routine&rsquo;s decks from truly random ones. It looks at the gaps between
        consecutive card numbers and at neighbour correlation. It trains on 70% of the decks and is scored on the other 30%. If it can&rsquo;t beat a coin
        flip, the decks look random in every way the classifier can see. If it can, there is a pattern, even when no named test has failed.
      </p>
      <p>
        It has already found one. When we refitted the mash model to a hand-measured mash, the classifier flagged decks around the fifth mash as clearly
        detectable. Proximity had no lower bound yet and reported a comfortable pass. Following that disagreement through the classifier&rsquo;s inputs
        showed that the mash was spreading old neighbours too evenly. That finding gave{' '}
        <Link to="/order-tests">proximity its lower bound</Link>.
      </p>
      <p>
        Read its numbers with its own noise in mind. Trained on random decks against random decks, where the true answer is exactly 50%, it reads up to
        about 54% by luck, so anything below that means nothing. Near the 56% threshold, results vary by about 2 points from run to run, and a routine
        fails every time only from about 60% up. The classifier is simple on purpose. A random forest we tried on the same inputs took about 40 times as
        long and scored 1 to 2 points worse. A pass is evidence, not proof.
      </p>
    </Writeup>
  )
}
