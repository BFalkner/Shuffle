import Writeup from './Writeup'

export default function ManaTests() {
  return (
    <Writeup
      title="The mana tests"
      subtitle="Land spacing and category clump — the two tests that read the deck by card type: one catches an even land pattern the permutation tests miss, one checks that the deck clumps by type at the natural random rate — neither too much nor too little."
    >
      <h2>Two tests that watch card type, not card identity</h2>
      <p>
        Everything else in the battery measures the exact permutation of ninety-nine distinct cards. These two ignore identity and read the deck by type,
        because the property that matters in play is not <i>which</i> card sits where — it is how the lands are distributed. Both exist because a deck can
        be a fine random-looking permutation and still have its lands arranged in a way the other tests never look for.
      </p>

      <h2>Land spacing — built to catch an even pattern</h2>
      <p>
        Deal a deck&rsquo;s lands at regular intervals — land, spell, spell, land, spell, spell — and then shuffle it lightly, and something slips past the
        rest of the battery. Rising sequences, neighbour distance and position all read healthy: the individual cards are in a fine mess. Only the{' '}
        <i>land pattern</i> is orderly, and no test that reads card identity notices, because identity really is randomized.
      </p>
      <p>
        This test measures the spread of the gaps between successive lands, and it is two-sided by design. Lands gathered into clumps produce a wide, uneven
        spread and read high. Lands spaced too regularly produce gaps that are all nearly equal — a spread far tighter than chance ever yields — and read
        low. Both are structure: metronome-even lands are as far from random as a long drought, because randomness produces neither. If a deck reads low
        here after a shuffling routine, the even pattern survived that routine, and the number says by how much.
      </p>

      <h2>Clump rate — does the deck clump the right amount?</h2>
      <p>
        The instinct is to treat clumping as the enemy: six lands in ten cards feels like a broken shuffle. It is not. A genuinely random ninety-nine-card
        deck clumps by type at a definite, measurable rate, and the real question is not whether a method produces clumps but whether it produces them at{' '}
        <i>that</i> rate.
      </p>
      <p>
        Both directions of miss are structure. Too much clumping means lands are gathering — the deck was not mixed enough. Too little is the subtler failure
        and the reason this test is two-sided: a shuffle that spreads lands more evenly than chance is over-dispersing them, the same anti-clustering a
        strict riffle leaves behind and the same shape a surviving mana-weave carries. A woven deck reads almost no clumping at all, far below the random
        rate. A perfect shuffle sits right at it.
      </p>
      <p>
        One deck cannot answer the question — a single deck&rsquo;s clumping is far too noisy — so the test is judged on the average across many trials,
        where the random rate is sharp and a method that consistently clumps too much or too little shows it clearly. This is what separates a normal random
        flood from a shuffle that is genuinely mismixing lands: the first is expected and lands you inside the band, the second is a pattern and pushes you
        out of it.
      </p>
    </Writeup>
  )
}
