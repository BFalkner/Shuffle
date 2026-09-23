# Shuffle simulator regression suite

Runs against the *actual shipped file* (`shuffle-simulator.html`) every time -
it extracts the live `<script>` block, so it can never drift from what users
get. No copy of the engine is maintained separately.

## Run it
    node suite.js

Exits 0 on all-pass, 1 on any failure, with a readable failure list.

## How it works
1. `dom-stub.js` fakes just enough DOM (elements, `value`, `addEventListener`)
   for the simulator's script to execute without a real browser.
2. `transform.js` rewrites top-level `let`/`const` to `var` before evaluating
   in a Node `vm` context - `vm` does not expose `let`/`const` bindings on
   the sandbox object, only `var` and `function` declarations do. This is a
   quirk of the *test harness*, not the shipped file, which is never touched.
3. `suite.js` then calls the real engine functions (`mash`, `m_ordering`,
   `getBase`, `passWith`, `toggleTracked`, ...) directly and checks them
   against invariants established over the course of this project.

## What it checks
- Every OP is a true permutation (no cards duplicated or dropped)
- ohTop/ohBottom structurally never touch the half they shouldn't
- Random-deck statistics still match the calibration anchors (ordering
  mean ~50, proximity mean ~5.85) - catches a silently-drifted riffle model
- Every METRICS entry has required fields, with position/classifier's
  intentional `fn:null` (batch-computed, not per-deck) explicitly allowed
- Band-side metrics have valid, correctly-ordered hi/lo after calibration
- Proximity's band is asymmetric as designed (tight rate-based low side,
  looser per-deck high side)
- Operation costs match the ratified units (M/T/B=1, O=2, P=4)
- Tracking slots never renumber on removal (the fixed-slot regression)
- Every seeded experiment has a valid, known, non-empty move sequence
- No duplicate experiment titles
- MMTMMB clears the core battery on trial-averaged values

## Known marginal finding (not a bug, but worth knowing)
MMTMMB's true proximity mean sits close to the lower band edge (~5.65-5.78
at T=3000 vs a band starting ~5.6-5.7 depending on n) - the same
over-dispersion signature the interleaved half-overhands were built to
counter. The test allows one extra standard deviation of slack here rather
than asserting a clean pass, specifically so this doesn't get silently
asserted away if it worsens. If a future engine change pushes this further
out, the test will catch it as a real regression rather than reclassifying
it as "still marginal."

## Adding a test
Follow the existing pattern: pull real functions off `ctx` (the loaded
sandbox), assert against values you've *independently verified*, and if a
test fails, check whether it's revealing a real bug or an incorrect
assumption in the test before touching either.
