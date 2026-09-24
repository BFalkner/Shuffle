import Writeup from './Writeup'

export default function ManaTests() {
  return (
    <Writeup
      title="Tests for land placement"
      subtitle="Two tests that read the deck by card type: land spacing, which catches lands spaced too evenly, and clump rate, which catches what land spacing lets through."
    >
      <h2>These tests read card types</h2>
      <p>
        The other tests look at which card sits where. In play, what matters most is how the lands are spread, and a deck can pass those tests while its
        lands are still badly placed. The two tests on this page ignore which card is which and look only at card types.
      </p>

      <h2>Mana weaving spaces lands too evenly</h2>
      <p>
        Some players space their lands evenly through the deck before shuffling: land, spell, spell, land. A light shuffle can leave that pattern in place.
        We added land spacing to catch it.
      </p>

      <h3>Land spacing</h3>
      <p>
        Land spacing measures how much the gaps between one land and the next vary. The test is two-sided. Lands in clumps leave some long gaps and some
        short ones, so they read high. Lands spaced too evenly leave gaps that are all about the same, so they read low. A random 99-card deck reads about
        1.8, and a woven deck reads 0.5.
      </p>
      <p>
        The simulator&rsquo;s woven deck is random apart from its lands. The card order, and which cards are lands, are drawn fresh every time. Before any
        shuffling, land spacing and clump rate are the only tests that fail. Every test that reads card order passes, because the order is random.
      </p>

      <h2>Land spacing clears too early</h2>
      <p>
        Land spacing turned out to clear quickly. After one mash, it passes the woven deck, whose lands are still spread more evenly than chance. It also
        passes a deck whose lands started in three clusters, even though those lands aren&rsquo;t mixed yet. Land spacing judges each deck on its own, and
        the gaps in a single deck vary so much that its passing range has to be wide.
      </p>
      <p>
        We turned clump rate into a pass/fail test to catch the weaving that land spacing lets through. It turned out to catch leftover clumps as well.
      </p>

      <h3>Clump rate</h3>
      <p>
        Clump rate looks at every run of ten cards in the deck and counts each card type in it: lands, card draw, interaction and the rest. It measures how
        far those counts stray from the mix you&rsquo;d expect, and compares the result with how much a random deck strays.
      </p>
      <p>
        Clumping isn&rsquo;t the enemy. Six lands in ten cards feels like a broken shuffle, but a random deck clumps by type at a definite rate. The
        question is whether a shuffle clumps at that rate. Too much clumping means the types aren&rsquo;t mixed yet. Too little means they&rsquo;re spread
        more evenly than chance, which is also a pattern. A woven deck clumps too little. So does a sorted deck for a while as it&rsquo;s mashed: between
        about the third and fifth mash, clump rate reads below the random range, and it settles into the range by the sixth.
      </p>
      <p>
        One deck is too noisy to judge, so clump rate works on the average over many decks, where the random rate is sharp. That tight range is why it
        catches what land spacing misses. From the woven deck, clump rate reads below the random range until the fourth mash. From the clustered deck, it
        reads 10.0 after two mashes, against a random range of 6.1 to 6.8, and clears at the fifth.
      </p>
    </Writeup>
  )
}
