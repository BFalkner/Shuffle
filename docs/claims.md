# Claims log

This log lists the factual claims on the site, whether each one has been checked against the engine, and the evidence.
Use it to decide what to recheck after the engine changes.

## How to use this log

The engine version is `ENGINE_VERSION` in `src/engine/version.ts`. It goes up only when simulation results change, and
`src/engine/version.test.ts` fails until it does. When the version goes up, recheck every row that was verified on an
older version and whose **Depends on** column includes what changed.

| Version | Change |
| --- | --- |
| 1 | The original model, through commit `7dc1e61`. |
| 2 | The pile deal reverses each pile (`2f968b5`). Changes results for any routine with a pile. |
| 3 | The woven and clumped decks draw their card order and card types at random (`ad939d2`). Changes results from those two decks only. |
| 4 | Pass lines come from a stored calibration of 1,000,000 seeded random decks per deck size (`src/engine/baselines.ts`, `npm run calibrate`, `9774886`), not 400 random decks each time the engine starts. Measured values don't change, but pass/fail results for every routine can. Recheck any row that counts passes or says when a test clears. |
| 5 | A thirteenth test, neighbour gaps, compares how far apart old neighbours sit with a random deck's spread. The existing tests' values and pass lines don't change, but a run now also has to pass neighbour gaps. Recheck any row that counts passes. |

Status values:

- **Verified**: rerun on the engine version shown, and the site text matches.
- **Contradicted**: the site says one thing and a rerun shows another. Fix the site or rerun with more samples.
- **Unverified**: inherited from earlier work and never rerun.
- **Historical**: describes an earlier model or how a test came about. It can't be rerun.
- **Code**: follows directly from the code, not from a simulation.

Most evidence comes from one-off checks run in September 2026 that weren't saved as scripts. Runs average 1,200
simulated decks each, and a "run passes" means it cleared every test. `npm run search` reproduces the recommendation
numbers.

## Random-deck values

Measured with `calibrate(99, 400)` three times on version 3. These values don't depend on any move or starting deck.

| Claim | Where | Status | Version | Evidence |
| --- | --- | --- | --- | --- |
| Ordering averages about 50.1 runs, standard deviation 2.9 | Order tests | Verified | 3 | 49.9 to 50.1, sd 2.7 to 2.8 |
| Proximity averages about 5.9 close pairs | Order tests, home | Verified | 3 | 5.7 to 5.9 |
| Global proximity averages about 32 | Order tests, simulator | Verified | 3 | 32.2 to 32.3 |
| Longest chain is four or five in a random deck | Order tests, simulator | Verified | 3 | Mean 4.5 to 4.6 |
| Land spacing reads about 1.8 | Mana tests | Verified | 3 | 1.80 to 1.82 |
| Clump rate's random range is 6.1 to 6.8 | Mana tests | Verified | 3 | The band itself varies by calibration: 5.95 to 6.53, 6.10 to 6.75, 6.06 to 6.76 |
| End retention is 0.08 when random | Simulator | Code | 3 | `8 / deckSize` in `calibrate.ts` |
| Position averages 9,604; fails above about 13,900 | Global tests | Code | 3 | `(n-1)²` and `1.45 × (n-1)²` in `calibrate.ts` |
| Footnote: a test passes within three standard deviations of random; ordering about 41.3 to 58.7 runs, proximity about 5.4 to 12.9 close pairs | Home | Verified | 5 | Stored calibration: ordering 41.33 to 58.67, proximity 5.38 to 12.92, unchanged by version 5. On version 3 the pass lines were recalibrated each start, and three starts gave proximity lower edges of 5.23, 5.46 and 5.52. |

## Home page

| Claim | Status | Version | Depends on | Evidence |
| --- | --- | --- | --- | --- |
| Between-games card: 3 mashes, a half overhand and a mash; the finer tests still find traces of the old order | Verified | 5 | Mash, half overhand, played deck | 200 runs from played on version 5: 0 clear every test (neighbour gaps 200, clump rate 36, end retention 10, global proximity 9). |
| New-deck card: 5 mashes, a pile and 5 mashes cleared every test as often as a perfectly random deck, from every starting deck | Verified | 5 | Mash, pile, all decks | 200 runs per deck on version 5 (`npm run search -- --routine`): sorted 198 (reference 196), woven 197 (197), clumped 196 (198), played 197 (194). Worst-test degree 0.46 to 0.50, reference 0.47 to 0.49. |
| A half overhand stacks its packets in reverse order, so any run longer than a packet is cut apart; each packet keeps its own order | Code | 5 | Half overhand | `overhand` in `moves.ts` puts each packet on top of the last (`packet.concat(result)`); `ohTop` applies it to the top half |
| A pile deal always puts cards that sit next to each other into different piles | Code | 5 | Pile | Six piles dealt in rotation: adjacent positions go to adjacent piles |
| A mash never changes the order of the cards within each half | Code | 5 | Mash | `riffle` in `moves.ts` drops packets from each half in order |
| The simulated mash is more even than a real one: real halves are rarely equal, and a block from the middle often drops without weaving in | Unverified | | Mash | The user's hand-measured mash. The engine models neither yet. |
| Repeated half overhands with mashes don't beat plain mashing on every test | Unverified | | Mash, half overhand | Carried over from the earlier step text; not rerun on version 5 |
| Plain mashing needs eight rounds on a sorted deck mainly because old neighbours sit at the wrong distances after seven ("mash, again" step) | Verified | 5 | Mash, sorted deck | 200 runs of seven mashes from sorted: 1 passes; neighbour gaps fails 198, end retention 64. On version 4, before neighbour gaps, 125 passed and end retention caused most failures. |
| Footnote: from sorted, 5 mashes, a pile and 5 mashes passed 198 of 200 and at least 196 from each other deck; eight mashes passed 184 from sorted; from played, 3 mashes, a half overhand and a mash passed 0 of 200 (neighbour gaps 200, clump rate 36); seven mashes passed 197 | Verified | 5 | Mash, half overhand, pile | 200 runs per deck on version 5. M×5·P·M×5: see the new-deck card row. M×8 from sorted: 184 (earlier version 5 run). M×3·OHt·M from played: 0; M×7: 197. |
| Footnote: over 20,000 single shuffles, 3 mashes, a half overhand and a mash left no longer runs of spells, and no more spells side by side, than a random deck, even in the worst game in 100 | Verified | 5 | Mash, half overhand, played deck | Ad hoc check on version 5, not saved as a script. From played: spell run 1 in 100 = 3 (random 3); spells within three places 3.39 mean, 1 in 100 = 8 (random 3.49, 8). |
| Mash step: runs roughly double each mash; from sorted, the run count looks random only after six | Verified | 1 | Mash, sorted deck | Ordering 2.0, 4.0, 8.0, 15.9, 30.7, 45.8; passes at the sixth mash |
| Overhand step: old neighbours never spread out, however long you go | Verified | 1 | Overhand, sorted deck | Six overhands: proximity 34.9 against a random 5.9 |
| Half overhand step: four rounds break up order about as well as six mashes | Verified | 1 | Mash, half overhand, sorted deck | Ordering 46.8 after four rounds against 45.8 after six mashes |
| Half overhand step: it doesn't beat plain mashing | Verified | 1 | Mash, half overhands, sorted and played decks | From sorted, plain mashes clear at 8 moves and the mixes at 12 to 14. From played, the best mix ties six mashes. |
| Pile step: fails proximity on the low side | Verified | 2 | Pile, sorted deck | One pile from sorted: 0 close pairs |
| Pile step: a pile adds nothing random | Code | 3 | Pile | `pile()` is deterministic |
| Mana weaving step: land spacing catches evenly spaced lands | Verified | 3 | Woven deck | Woven deck reads 0.50 against a random 1.8 |
| Starting decks: the played deck reads ordering 36, close pairs 12.3, end cards at their ends five times the random rate | Unverified | | Played deck | |
| Charts: mash, overhand and half overhand series | Unverified | | Mash, overhand, half overhand | Precomputed in `data.json`; the method isn't saved |
| Charts and bars: pile series | Verified | 2 | Pile, sorted deck | Regenerated with the fixed pile; the old code reproduced the stored values exactly |

## Tests for leftover order

| Claim | Status | Version | Depends on | Evidence |
| --- | --- | --- | --- | --- |
| A reversed deck breaks into 99 runs | Code | 3 | | Every card starts a new rising run |
| From sorted, the mash passes ordering at the sixth mash and longest chain at the fifth | Verified | 1 | Mash, sorted deck | Longest chain fails through the fourth mash |
| Six overhands from sorted pass ordering and fail proximity, local order, global proximity and correlation | Verified | 1 | Overhand, sorted deck | Ordering 45.6 (pass), proximity 34.9, global proximity 5.8 (low), correlation 0.95, local order failing |
| An overhand-only routine fails global proximity low every time | Verified | 1 | Overhand, sorted deck | Low at every one of six passes |
| Knowing global proximity tells you almost nothing about proximity at a single point in a mash sequence | Unverified | | Mash | |
| Global proximity misses the too-even spread | Unverified | | Mash | |
| Neighbour correlation has never caught anything on its own | Verified (partly) | 2 | All moves | In every check this session, it failed only alongside proximity |
| A pile deal puts neighbours 16 or 17 places apart (82 pairs) and 83 apart (16 pairs) | Code | 2 | Pile | Worked out from the deal |
| A single pile from sorted leaves 17 runs and fails proximity low | Verified | 2 | Pile, sorted deck | Ordering 17, proximity 0 |
| Strided chain failed only where ordering and proximity also failed | Verified | 2 | Pile, sorted and played decks | 24 pile routines; strided chain failed only for one pile from sorted |
| The too-even spread: close pairs dropped to about 1.6 around the fifth mash | Historical | 1 | Mash, sorted deck | From the refit of the mash model; not rerun |
| Proximity's lower bound sits three standard errors below the random mean | Code | 3 | | `mean - 3 × sd / √200` in `calibrate.ts` |
| Before neighbour gaps, seven mashes from sorted passed every test in about 6 of 10 runs | Verified | 4 | Mash, sorted deck | 125 of 200 on version 4 |
| After seven mashes from sorted, old neighbours sit next to each other about 11% more often than chance, and 2 to 8 apart 7% to 16% less often | Verified | 4 | Mash, sorted deck | 30 batches of 200 decks: ratios to random 1.11 at distance 1; 0.84 to 0.93 at 2 to 8 |
| Neighbour gaps: batches of 200 random 99-card decks read about 41, sd 9, and the test fails above about 68 | Code | 5 | | Stored calibration: mean 40.58, sd 9.02, pass line 67.65 |
| Seven mashes from sorted read about 108 on neighbour gaps and fail almost every time; eight read about 49 and pass about 39 times in 40 | Verified | 5 | Mash, sorted deck | 200 runs each: seven mashes fail neighbour gaps 198 times; eight fail it 5 times |
| Neighbour gaps, more than end retention, is why a sorted deck needs an eighth mash (also on the home page) | Verified | 5 | Mash, sorted deck | Seven mashes from sorted: neighbour gaps fails 198 of 200, end retention 64 |

## Tests across many shuffles

| Claim | Status | Version | Depends on | Evidence |
| --- | --- | --- | --- | --- |
| Three mashes from played fail global proximity, end retention, position and distinguishability | Verified | 2 | Mash, played deck | 5 of 5 runs |
| Adding a pile makes every single-deck test pass, leaving position (and distinguishability) | Verified | 2 | Mash, pile, played deck | 5 of 5 runs; position 14,128 to 15,098 against 13,926 |
| Six piles from sorted score over 11 million on position | Verified | 2 | Pile, sorted deck | 11,642,400 |
| The classifier reads up to about 54% on random decks by luck | Verified | 2 | | 200 trainings: 95% under 52.2%, maximum 54.3% |
| Near the 56% threshold, readings vary by about 2 points | Verified | 2 | Mash, half overhand | Standard deviation 1.4 to 2.3 points across 8 routines, 20 runs each |
| A routine fails every time only from about 60% up | Verified | 2 | Mash, half overhand | Averages of 60% and above failed 20 of 20; averages of 55% failed 6 to 7 of 20 |
| A random forest took about 40 times as long and scored 1 to 2 points worse | Verified | 2 | | 100 trees, depth 8: 37 to 45 times the time, 1.0 to 2.3 points lower. The original forest's settings weren't recorded. |
| The classifier found the too-even spread before proximity had a lower bound | Historical | 1 | | |

## Tests for land placement

| Claim | Status | Version | Depends on | Evidence |
| --- | --- | --- | --- | --- |
| Before shuffling, the woven deck fails only land spacing and clump rate | Verified | 3 | Woven deck | One run: land spacing 0.50, clump rate 3.41 |
| Land spacing clears after one mash on the woven and clustered decks | Verified | 3 | Mash, woven and clumped decks | One run each |
| From the woven deck, clump rate reads below the random range until the fourth mash | Verified | 3 | Mash, woven deck | 3.74, 4.32, 5.35, then passing; one run |
| From the clustered deck, clump rate reads 10.0 after two mashes and clears at the fifth | Verified | 3 | Mash, clumped deck | 11.60, 10.01, 5.57, 5.64, then passing; one run |
| From sorted, clump rate reads below range between about the third and fifth mash and settles by the sixth | Verified | 1 | Mash, sorted deck | 4.18, 4.61, 5.72, then 6.33 |
| On a real deck, only the two land tests see a weave | Verified | 3 | Mash, overhand | Probe with random card order and random types: every other test passed at every step |
| Clump rate became a pass/fail test to catch weaving that land spacing lets through | Historical | | | `CHANGELOG.md` |

## Simulator

| Claim | Status | Version | Depends on | Evidence |
| --- | --- | --- | --- | --- |
| Ordering, proximity, position and land spacing show as percentages; the rest keep their units | Code | 3 | | `raw: false` in `metrics.ts` |
| Seven tests can also fail low | Code | 3 | | `side: 'two'` or `'band'` in `metrics.ts` |
| The four core tests count double, and the score is capped at the lowest failing test except clump rate | Code | 3 | | `compositeScore` in `scoring.ts` |
| Test descriptions (which shuffle each test was built for) | Verified | 2 | | Follow the write-ups above |

## Sticky ends

Every claim on this page is **unverified**. The page waits for the mash model to include the overhang.
