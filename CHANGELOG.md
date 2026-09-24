# Changelog

## Recommendations re-derived

- Re-ran the recommendation search on the current engine: every move
  sequence costing up to 7 units (11,492 in all), scored from a played deck.
  The leading 32 were re-run 5 times from each of the four starting decks,
  and the finalists 20 times.
- New recommendations: **7 mashes** between games (all 20 runs from a
  played deck passed every test) and **8 mashes** from any start (18–19 of
  20 runs from each starting deck).
- Dropped MMTMMB, which now passes in only 8 of 20 played-deck runs. No
  six-unit sequence was reliable; the best (MMTMBM, MMBMTM) passed in 16
  of 20.
- Dropped 4 Mash · Pile · 4 Mash as the ordered-deck pick. It costs 12
  units and failed from a sorted deck in 3 of 5 runs, where 8 mashes
  passed in 18 of 20.
- The regression test now checks 8 mashes from sorted, replacing the
  MMTMMB test and its extra slack on proximity.

## React project

- Converted the site from standalone HTML files into a Vite + React +
  TypeScript project with React Router (one URL per page) and Vitest.
- The engine (moves, diagnostics, calibration, classifier, scoring) is now
  one set of TypeScript modules under `src/engine/`, shared by the
  simulator and the sticky-ends page instead of being copied into each.
  Checked against the original by running both side by side: scores match
  within run-to-run noise.
- The regression suite now tests the engine modules directly with Vitest,
  replacing the Node `vm` harness and the in-browser test page.
- Charts draw at their measured width everywhere, so nothing stretches on
  wide screens.
- Removed code the simulator no longer used (the old single-deck stage,
  per-test card flagging, the experiments menu), along with the empty space
  and help text that still referred to them.
- Removed the standalone card tracker page (`shuffle-tracker.html`); the
  simulator's method builder and animation panels already cover tracking
  cards through a shuffle.
- Fixed tapping two cards in quick succession tracking only one.
- The original HTML pages were removed; they remain in git history.

## Earlier work

Covers the work done in this conversation, from the mid-project engine
propagation through packaging for local development. Dates aren't tracked
per-entry since this reflects one continuous working session; entries are
in the order they happened.

## Engine & battery

- Propagated the fitted riffle model (packet sizes 1&ndash;4, weighted
  80/15/4/1, matching a hand-measured mash) into the simulator and tracker.
- Added **End retention** as a rate-based, two-sided diagnostic &mdash;
  riffles structurally under-move the top/bottom few cards, and this was
  invisible to every prior test.
- Discovered and fixed an **over-dispersion blind spot**: a strict riffle
  can spread originally-adjacent cards *too* evenly, which read as a pass
  under the old one-sided Proximity test. Proximity became an asymmetric
  band (rate-based low side, per-deck high side).
- Added **Global proximity** ("average drift"): the average distance every
  originally-adjacent pair now sits apart, zeroed so unmoved neighbours
  score 0. Verified non-redundant with Proximity via within-depth
  correlation, not just pooled correlation.
- Converted **Category clump** from an informational, one-sided,
  never-fails metric into a real two-sided pass/fail test (**Clump rate**)
  judged on the trial-averaged rate &mdash; catches a mana-weave by type,
  independent of the Land spacing test. Fixed a window-sampling stride that
  could alias against a pile shuffle's own stride; confirmed with an
  overlapping-window resampler that the conclusion didn't change.
- Retuned trial counts per test based on which ones actually needed
  precision: scalars at 200, End retention at 400, Position χ² and the
  classifier raised in steps (400 → 800 → 1000/1200 with rescaled margins)
  after measuring the classifier's real noise floor by running it
  random-vs-random repeatedly.
- Fixed the Overhand move: split into **Overhand-top** and
  **Overhand-bottom**, neither of which ever includes a riffle (a prior
  bug made it look like Overhand was silently mashing).

## Search & recommendation

- Ran an exhaustive search over all 1,218 six-unit-cost move sequences
  (Mash/Overhand-top/Overhand-bottom = 1, full Overhand = 2, Pile = 4)
  against a played-deck model, in three refinement stages.
- Redefined "played" mid-project (7 mashes, then the top 30 cards
  re-sorted, matching how a deck is actually gathered after a game) and
  re-ran the full search against the corrected model.
- New index recommendation: **2 Mash → Overhand-top → 2 Mash →
  Overhand-bottom** ("MMTMMB"), which clears every diagnostic from both a
  sorted and a played start, replacing the old Half-Overhand suggestion.
- The regression suite documents one honest marginal finding: this
  method's Proximity mean sits close to the lower band edge, the same
  over-dispersion signature its own half-overhands were built to counter.

## Simulator architecture

- Reworked from a single "current method" model to a **comparison-driven
  list**: no default selection, methods overlay/de-overlay independently,
  charts render from whatever's overlaid.
- Replaced the old chip-based method editor with a **tracker-style
  builder**: tap-to-track up to 6 cards through a live deck stage, moves
  insert at a caret and run immediately, undo restores exact prior states
  (never re-rolls untouched history).
- Added an **animation panel** under each compare-list row: manual
  step-through (no autoplay), a move-token strip synced to the shared step
  position across every open method, unit-cost and pass/fail summary.
- Added a **head-to-head comparison card**: plain-language "X leads on
  Y, Z" summary, only declaring a winner when the gap clears 2 standard
  errors at that metric's own trial tier &mdash; not just "smaller number."
- Added **card tracking** to the read-only comparison panels (previously
  builder-only), shared globally across panels via a fixed 6-slot array so
  removing a tracked card never renumbers the others.
- Redesigned the composite Overhand control (single pill, embossed
  top/bottom halves sharing one border) and consolidated the animation
  speed toggle into one cycling button (slow/normal/fast/off).

## Bug fixes

- **Reflow bug**: builder edits were re-rolling every prior move's
  randomness on each new insert, making unrelated cards jump. Fixed to
  recompute only from the insertion point forward.
- **Chart axis clipping**: percentage and raw-metric charts silently
  clamped at 0%/100% or a soft floor that padding could still cross,
  hiding real excursions (e.g. an over-dispersed Clump rate reading).
  Floors and ceilings are now hard limits applied after padding, for every
  metric, both directions.
- **Index deck-animation bug**: successive shuffle passes appeared to fade
  in from nowhere instead of visibly sliding, because the start position
  was being overwritten in the same frame before the browser committed it.
  Fixed with an explicit reflow between setting the start state and
  animating to the target.
- **Silent failures on mobile**: `confirm()`/`alert()` are suppressed by
  the artifact viewer's sandboxed iframe, so a "Reset to defaults" button
  did nothing with no error. Replaced every confirmation dialog with an
  inline two-tap arm pattern.
- **Tracking slot renumbering**: removing a tracked card used to shift
  every subsequent card's badge down by one. Converted to a fixed
  6-slot array so a card's badge number is stable until it's explicitly
  removed.
- Fixed a `str_replace` edit that silently dropped a function's header
  line while leaving its body in place, caught by a real parser check
  after a hand-rolled brace counter gave a false trail.

## Content

- Rewrote all eleven diagnostic descriptions to a ~30-word budget, moving
  depth to three new write-up pages (`shuffle-order-tests.html`,
  `shuffle-global-tests.html`, `shuffle-mana-tests.html`), each grouped by
  genuine kinship rather than arbitrary split.
- Rewrote those write-ups a second time to lead with **motivation**
  instead of mechanism &mdash; each test introduced by the specific deck
  that defeated the tests before it, rather than a dry "here's what this
  measures."
- Removed rules-legality framing from the mana-weave discussion (checked
  against the actual MTR wording and found the "legal/cheating" framing
  contested between sources) in favor of a pure randomness/detection
  argument that doesn't depend on which reading is right.
- Renamed the "strict"/"lumpy" mana-weave deck kinds to "weaved"/"clumped"
  across the index and simulator (internal `kind` values left untouched to
  avoid an unreviewed cross-file rename).
- Added a starting-decks section to the index with generated SVG strips
  for all four deck kinds.
- Retired ~38 superseded exploration files (early comparison pages,
  per-method simulators, one-off analysis scripts), down to the 8 pages
  that make up the current site.

## Tooling

- Built a Node-based regression suite (`tests/`) that extracts the live
  `<script>` block from `shuffle-simulator.html` on every run &mdash; never
  a stale copy &mdash; and checks 18 invariants: permutation correctness,
  half-overhand structural isolation, calibration anchor drift, band
  ordering, tracking slot semantics, cost accounting, and the recommended
  method's pass rate.
- Built `shuffle-tests.html`, a browser-native version of the same suite,
  after discovering the Node version's `let`/`const`-to-`var` transform
  doesn't apply to a real browser DOM. Went through two designs: a
  `fetch()`-based loader (blocked under `file://`, which is how the
  project was actually being viewed) and the shipped iframe-injection
  version, which re-runs the simulator's script inside its own frame to
  reach `let`/`const` bindings natively.
- Packaged the project for local development: `package.json` (zero
  dependencies; `npm test` and `npm run serve` via a plain Node `http`
  server), `.gitignore`, and a root `README.md` describing setup and every
  file's role, verified by actually running the documented commands
  against a clean checkout rather than assuming they'd work.

## Known open items

- `shuffle-tracker.html` is orphaned (no inbound links); its interaction
  model was absorbed into the simulator's builder. Candidate for
  retirement, kept for now since it's the only tool for tracking a
  *physical* shuffle rather than a simulated one.
- The composite score's methodology footer on the simulator still
  duplicates some explanation now covered by the write-up pages; could be
  shortened further.
