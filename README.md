# Shuffle randomization project

An empirical analysis of Commander (99-card) deck shuffle randomization: a
live in-browser simulator, a battery of statistical diagnostics for "is this
deck actually randomized," and write-ups explaining what each test catches,
why it exists, and what the numbers can honestly say.

Built with **React + TypeScript**, bundled by **Vite**, routed with
**React Router**, tested with **Vitest**, linted with **oxlint**.

## Getting started

You need [Node.js](https://nodejs.org) 20 or newer (`node --version` to check).

```
npm install        # once, to download dependencies into node_modules/
npm run dev        # start the dev server, then open the URL it prints
```

The dev server reloads the page as you save files, usually without losing
what's on screen.

| Command             | What it does                                                    |
| ------------------- | --------------------------------------------------------------- |
| `npm run dev`       | Local dev server with hot reload (http://localhost:5173)        |
| `npm test`          | Run the engine test suite once                                  |
| `npm run test:watch`| Re-run tests whenever a file changes                            |
| `npm run lint`      | Check the code for common mistakes                              |
| `npm run typecheck` | Check TypeScript types without building                         |
| `npm run build`     | Production build into `dist/` (type-checks first)               |
| `npm run preview`   | Serve the production build locally to try it                    |

In VS Code, install the extensions it recommends when you open the folder
(TypeScript support is built in).

## Project layout

```
index.html                  HTML shell; everything renders into <div id="root">
src/
  main.tsx                  entry point: mounts <App> inside the router
  App.tsx                   the list of pages (routes)
  styles/global.css         colours, fonts, base styles shared by every page

  engine/                   the maths — plain TypeScript, no React
    moves.ts                the shuffle moves (mash, overhand, pile, …) and the riffle model
    decks.ts                starting decks, card types, colours
    metrics.ts              the twelve diagnostics and their descriptions
    calibrate.ts            random-deck baselines and pass thresholds
    classifier.ts           the Distinguishability classifier
    scoring.ts              pass/fail, % toward random, the composite score, formatting
    simulate.ts             runs a method 1200× and averages every diagnostic
    tracking.ts             following individual cards
    experiments.ts          saved methods (defaults + localStorage)
    engine.test.ts          the regression suite

  components/               reusable UI pieces
    MiniDeck.tsx            the animated tile grid (simulator panels and builder)
    RichText.tsx            renders <i>…</i> in metric descriptions

  hooks/                    small reusable React hooks
    useElementWidth.ts      measure an element so charts draw at their real size
    useAnimationSetting.ts  the slow / normal / fast / off animation toggle
    useTitle.ts             set the browser tab title

  pages/                    one folder per page, each with its own CSS
    Home/                   /              the conclusion / landing page
    Simulator/              /simulator     the interactive tool
    writeups/               /order-tests, /global-tests, /mana-tests
    OffCenter/              /sticky-ends   the off-centre riffle study
```

### Where to make common changes

- **Change how a move shuffles** → `src/engine/moves.ts`. Run `npm test`
  afterwards; the anchor tests will tell you if the riffle model drifted.
- **Add or tune a diagnostic** → `src/engine/metrics.ts` (the function and
  its entry in `METRICS`), plus its threshold in `src/engine/calibrate.ts`.
- **Change the default method list** → `SEED` / `EXAMPLES` in
  `src/engine/experiments.ts`. Methods people saved themselves live in their
  browser's localStorage and aren't affected; "reset list to defaults" in
  the simulator reloads these.
- **Edit page text** → the page's `.tsx` file under `src/pages/`.
- **Styling** → the page's `.css` file. Each page's rules are prefixed with
  that page's root class (`.sim`, `.home`, `.writeup`) so class
  names can't clash between pages.

### Precomputed data

The home page and the sticky-ends page show results from long simulation
runs that aren't re-run in the browser. That data lives in
`src/pages/Home/data.json` and `src/pages/OffCenter/data.json`. The
parameter searches and calibration sweeps that produced it were done ad hoc
and aren't preserved as scripts — only their results.

## Tests

`npm test` runs `src/engine/engine.test.ts` against the real engine code.
It checks engine correctness (every move is a true permutation; the
half-overhands never touch the wrong half; the pile is deterministic), the
riffle model's calibration anchors, threshold structure, move costs,
card-tracking slot behaviour, and that the recommended between-games method
clears the core battery.

The engine is random, so the statistical checks use tolerances wide enough
to be stable from run to run. One is deliberately marginal: the
recommended method's Proximity mean sits right at the lower band edge (the
over-dispersion signature its half-overhands were built to counter). The
test allows one standard deviation of slack there, explicitly, rather than
hiding it — if an engine change pushes it further out, the test fails.

## Deploying

`npm run build` produces a static site in `dist/` that any static host can
serve. Because pages use real URLs (`/simulator`, `/sticky-ends`, …), configure
the host to serve `index.html` for unknown paths (often called "SPA
fallback" or a "rewrite to index.html") so that reloading a page or opening
a shared link works.
