# Shuffle randomization project

An empirical analysis of Commander (99-card) deck shuffle randomization: a
live in-browser simulator, a battery of statistical diagnostics for "is this
deck actually randomized," and write-ups explaining what each test catches,
why it exists, and what the numbers can honestly say.

Everything is static HTML/CSS/JS &mdash; no build step, no framework, no
server-side code. The one Node dependency is the regression test suite,
which uses only Node's built-in modules (no npm packages to install).

## Setup

1. **Get Node.js** if you don't have it (v18+): [nodejs.org](https://nodejs.org)
   Check with `node --version` in a terminal.

2. **Open the folder in VS Code.** File &rarr; Open Folder, point it at this
   directory. No install step is required for the site itself &mdash; the
   HTML files are self-contained.

3. **Put it under git**, if you want history from here on:
   ```
   git init
   git add .
   git commit -m "initial import"
   ```

4. **Serve it over a real local address** rather than opening the HTML files
   directly (`file://`). This matters: browsers block `fetch()` and some
   cross-frame access for local files as a security measure, which breaks
   the test page and would break any future cross-page data loading. Run:
   ```
   npm run serve
   ```
   then open **http://localhost:8080/index.html**. (This uses Node's plain
   `http` module directly &mdash; `npm install` isn't required for this to
   work, but the `package.json` is there so VS Code, and any future real
   dependency, has somewhere to live.)

   Any other static server works identically if you'd rather use one you
   already have (VS Code's Live Server extension, `python3 -m http.server`,
   etc.) &mdash; the only requirement is serving over `http://`, not opening
   files directly.

5. **Run the regression tests:**
   ```
   npm test
   ```
   or `node tests/suite.js` directly. See `tests/README.md` for what it
   checks and how it works.

## How the pages link together

```
index.html  (the conclusion / landing page)
    \u2193 recommendation cards link to \u2192
shuffle-simulator.html  (the interactive tool \u2014 the hub)
    \u2193 diagnostic descriptions link out to \u2192
shuffle-order-tests.html
shuffle-global-tests.html
shuffle-mana-tests.html
shuffle-offcenter.html   (linked from the simulator's End Retention test)

shuffle-tracker.html     (standalone, not linked from elsewhere \u2014 see note below)
shuffle-tests.html       (standalone regression-test UI, not linked from elsewhere)
```

`index.html`'s links are generated from a JS data object at load time
(there's no static `href="..."` to grep for), which is why a plain link
search on that file won't show them.

## File-by-file

### `index.html`
The landing page and conclusion. States the project's empirical findings in
plain language: what a fresh riffle-style mash does and doesn't fix, the
sticky-ends problem, mana-weave detection, and two concrete recommended
shuffle methods with their measured scores. Includes inline SVG visuals of
the four starting-deck kinds the simulator tests against (sorted, played,
mana-weaved, mana-clumped). All data on this page is **precomputed** and
baked into the HTML/JS at generation time &mdash; it does not run live
simulations itself.

### `shuffle-simulator.html`
The interactive core of the project. Lets you pick a starting deck
condition (fresh/sorted, already played, mana-weaved, mana-clumped, custom
size), build custom shuffle methods from four primitive moves (Mash,
Overhand-top, Overhand-bottom, Pile), and see them scored live against a
twelve-test randomness battery, with animated step-through visualizations
and a head-to-head comparison view between methods. This is where the
"fitted riffle model" (packet sizes calibrated to a real hand-shuffle) and
every diagnostic's calibration actually lives in code.

### `shuffle-order-tests.html`
Write-up covering the diagnostics that read leftover *sequence* structure:
Ordering (rising-run count), Proximity and Global Proximity (how far
originally-adjacent cards have drifted apart), Neighbour correlation, and
the three "fragment counter" tests (Longest chain, Strided chain, Local
order). Explains the motivating failure case for each &mdash; most of these
tests exist because a specific deck defeated the ones that came before it.

### `shuffle-global-tests.html`
Write-up covering the two diagnostics that read the *whole arrangement* at
once rather than one property: Position (a chi-square across many trials,
built to catch deterministic moves like a pile deal that look random on any
single inspection) and Distinguishability (a live-trained classifier that
catches joint structure no single named test was built to look for).

### `shuffle-mana-tests.html`
Write-up covering the two diagnostics that read the deck by **card type**
rather than card identity: Land spacing (catches a surviving mana-weave, in
either direction &mdash; too clumped or too evenly spread) and Clump rate
(checks that the deck clumps by type at the natural random rate, not more
and not less).

### `shuffle-offcenter.html`
A focused deep-dive on one specific residue: riffle shuffles are
structurally bad at moving the top and bottom few cards of a deck, no
matter how many passes you run. Covers the measurement, an off-centre
riffle variant that targets the problem directly, and the data behind the
recommended "between-games" method on the index page. Linked from the
simulator's End Retention test description.

### `shuffle-tracker.html`
A standalone card-tracking tool for following specific cards through a
**physical** shuffle you're performing at a table (not a simulation) &mdash;
tap cards to mark them, step through moves, watch where they end up. Not
currently linked from any other page. Its core interaction (tap-to-track,
step-by-step move building) was later absorbed into the simulator's method
builder, so this page may be a candidate for retirement; kept for now since
it's the only tool here meant for tracking a *real* shuffle rather than a
simulated one.

### `shuffle-tests.html`
A browser-based UI for the regression test suite (see below), for
situations where running `node tests/suite.js` isn't convenient. Loads
`shuffle-simulator.html` into a hidden iframe via ordinary navigation and
re-injects its script to read live bindings out of it, since fetching a
local file's contents directly is blocked by most browsers. **This only
works when served over `http://`** (see Setup step 4) &mdash; opening it as
a local file will hit exactly the restriction it's designed around.

### `tests/`
The Node-based regression suite. Extracts the live `<script>` block from
`shuffle-simulator.html` on every run (never a stale copy) and checks it
against invariants established over the course of building this project:
engine correctness (every shuffle move is a true permutation, half-overhand
moves never touch the wrong half), calibration sanity (band thresholds are
correctly ordered and shaped), operation costing, card-tracking slot
behavior, and the recommended method's pass rate. See `tests/README.md` for
the full list and one documented marginal finding it deliberately surfaces
rather than hides.

### `package.json`
Minimal manifest: `npm test` runs the suite, `npm run serve` starts a
zero-dependency static file server on port 8080. No packages need
installing for either to work.

## A note on project history

This project grew from single-file exploration into its current shape
through many iterative rounds (verified live in a chat interface, hence no
prior git history). If you want the reasoning behind specific design
choices &mdash; why the riffle model uses those specific packet weights, why
Proximity's pass band is asymmetric, why the pile shuffle can never be a
method's last move &mdash; the write-up pages above capture the *what* and
*why* for the diagnostics; the underlying empirical work (parameter
searches, calibration sweeps) was done ad hoc and isn't preserved as
separate scripts in this folder, only as its results baked into the pages.
