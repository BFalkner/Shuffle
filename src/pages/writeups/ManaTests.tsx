import Writeup from './Writeup'

export default function ManaTests() {
  return (
    <Writeup
      title="The mana tests"
      subtitle="Land spacing and clump rate, the two tests that read the deck by card type. One catches an even land pattern the permutation tests miss; the other checks that the deck clumps by type at the natural random rate, neither more nor less."
    >
      <h2>Two tests that watch card type, not card identity</h2>
      <p>
        Every other test in the battery measures the exact arrangement of ninety-nine distinct cards. These two ignore identity and read the deck by type,
        because what matters in play is not <i>which</i> card sits where but how the lands are distributed. Both exist because a deck can be a fine
        random-looking arrangement and still have its lands placed in a way the other tests never check.
      </p>

      <h2>Land spacing: built to catch an even pattern</h2>
      <p>
        Deal a deck&rsquo;s lands at regular intervals (land, spell, spell, land, spell, spell), shuffle it lightly, and something gets past the rest of the
        battery. Rising sequences, neighbour distance and position all read healthy, because the individual cards really are well mixed. Only the{' '}
        <i>land pattern</i> is orderly, and no test that reads card identity notices it.
      </p>
      <p>
        This test measures the spread of the gaps between successive lands, and it is two-sided by design. Lands gathered into clumps produce a wide, uneven
        spread and read high. Lands spaced too regularly produce gaps that are all nearly equal, a spread far tighter than chance ever gives, and read low.
        Both are structure: perfectly even lands are as far from random as a long drought, because randomness produces neither. If a deck reads low here
        after a shuffling routine, the even pattern survived that routine, and the number shows by how much.
      </p>

      <h2>Clump rate: does the deck clump the right amount?</h2>
      <p>
        The instinct is to treat clumping as the enemy, since six lands in ten cards feels like a broken shuffle. It is not. A genuinely random
        ninety-nine-card deck clumps by type at a definite, measurable rate. The real question is not whether a method produces clumps but whether it
        produces them at <i>that</i> rate.
      </p>
      <p>
        Missing in either direction is structure. Too much clumping means lands are gathering and the deck was not mixed enough. Too little is the subtler
        failure, and it is why this test is two-sided. A shuffle that spreads lands more evenly than chance is over-dispersing them, the same pattern a
        strict riffle leaves behind and the same shape a surviving mana weave carries. A woven deck shows almost no clumping, far below the random rate; a
        perfect shuffle sits right at it.
      </p>
      <p>
        One deck cannot answer the question, because a single deck&rsquo;s clumping is far too noisy. The test is judged on the average across many
        trials, where the random rate is sharp and a method that consistently clumps too much or too little shows it clearly. That is what separates an
        ordinary run of lands, which is expected and stays inside the band, from a shuffle that is genuinely mixing lands badly, which is a pattern and falls
        outside it.
      </p>
    </Writeup>
  )
}
