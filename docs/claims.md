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
| 6 | The thirteen tests become five metrics in four categories (order, neighbours, position and lands), each read as a level from 0 (random) to 1 (an unshuffled sorted deck), plus distinguishability (`81c3ad2`). Every test result changes. |
| 7 | Spread reads its worst starting place, not the average over all places (`f574e4e`). The order and neighbours categories become sequence and proximity, with the same values. |
| 8 | The woven and clumped decks, card types and the lands metric are removed (`b9ac2e1`). A sorted deck totals about 3, not 4. |
| 9 | Ends is removed and spread is renamed position, so each category holds one metric (`ced78e0`). Sequence, proximity and distinguishability don't change. |
| 10 | Sequence and position read each part on its own (each pair of old neighbours, each starting place) and combine the parts with a power mean (p = 4), not one balance over all pairs or the worst starting place. Recheck any row that depends on sequence, position or clean runs. Proximity and distinguishability don't change. |

Version 6 replaced every test the site describes. On version 10 the engine measures three categories and
distinguishability:

- **Sequence** is whether old neighbours still come in their old order, or reliably reversed. It reads each pair on
  its own and combines the pairs with a power mean, so a few bad pairs aren't averaged away.
- **Proximity** is how far apart old neighbours sit, compared with a random deck. It grew out of neighbour gaps.
- **Position** is how much a card's starting place tells you about where it ends up. It reads each starting place on
  its own and combines them the same way.
- **Distinguishability** is the accuracy of a classifier trained to tell the decks from random ones. The engine reports
  it alongside the categories, and it doesn't count toward a clean run.

A category is within noise when its level is at most three standard deviations of random decks: 0.010 for sequence,
0.003 for proximity and 0.003 for position on a 99-card deck. Distinguishability is within noise up to 56%. A
**clean** run has every category within noise. A run is 1,200 simulated decks (1,000 for distinguishability).

Status values:

- **Verified**: rerun on the engine version shown, and the site text matches.
- **Contradicted**: the site says one thing and a rerun shows another. Fix the site or rerun with more samples.
- **Removed test**: the claim is about a test, deck or card type that the engine no longer has, so it can't be
  rerun. The evidence column gives the nearest version 10 reading where there is one. The site-text pass should rewrite
  or drop the claim.
- **Unverified**: inherited from earlier work and never rerun.
- **Historical**: describes an earlier model or how a test came about. It can't be rerun.
- **Code**: follows directly from the code, not from a simulation.

Two scripts reproduce the version 10 evidence. `npm run search -- --routine "M×5·P·M×5" --routine "M×3·OHt·M" --routine
M×7 --routine M×8 --routine "M×2·OHb·OHt·M×3"` gives the recommendation numbers from 200 runs per starting deck. `npm run claims` gives the
step-by-step levels behind the move steps and the distinguishability checks (`--runs 20` for 200 runs of each). The
moves haven't changed since version 2, so claims about where cards end up, rather than about a test, still hold where
they were verified on version 2 or later.

## Random-deck values

These describe how the old tests read on random decks. None of those tests has existed since version 6.

| Claim | Where | Status | Version | Evidence |
| --- | --- | --- | --- | --- |
| Ordering averages about 50.1 runs, standard deviation 2.9 | Order tests | Removed test | 3 | Ordering (the run count) is gone. |
| Proximity averages about 5.9 close pairs | Order tests, home | Removed test | 3 | Close pairs is gone. Proximity now reads the share of old neighbours at distances a random deck wouldn't produce. |
| Global proximity averages about 32 | Order tests, simulator | Removed test | 3 | |
| Longest chain is four or five in a random deck | Order tests, simulator | Removed test | 3 | |
| Land spacing reads about 1.8 | Mana tests | Removed test | 3 | Card types are gone. |
| Clump rate's random range is 6.1 to 6.8 | Mana tests | Removed test | 3 | Card types are gone. |
| End retention is 0.08 when random | Simulator | Removed test | 3 | Position now covers cards that stay near their ends. |
| Position averages 9,604; fails above about 13,900 | Global tests | Removed test | 3 | The χ² position test is gone. Position now reads 0 for random decks and 1 for a sorted deck. |
| Footnote: a test passes within three standard deviations of random; ordering about 41.3 to 58.7 runs, proximity about 5.4 to 12.9 close pairs | Home | Removed test | 5 | "Three standard deviations" still holds for the version 9 categories (`noiseLevel` in `scoring.ts`), but both ranges belong to removed tests. The random-deck averages in the footnote come from `data.json`. |

## Home page

| Claim | Status | Version | Depends on | Evidence |
| --- | --- | --- | --- | --- |
| Between-games card: 3 mashes, a half overhand and a mash; the finer tests still find traces of the old order | Verified | 10 | Mash, half overhand, played deck | 200 runs from played: 0 clean. Total 0.20, most of it position (0.163); proximity 0.026, sequence 0.012. From sorted: 0 clean, total 0.90. |
| New-deck card: 5 mashes, a pile and 5 mashes cleared every test as often as a perfectly random deck, from every starting deck | Verified | 10 | Mash, pile, sorted and played decks | 200 runs per deck: sorted 199 clean, played 199 (reference 197 each). On version 9 it was clean in only 155 from sorted, failing on a slight sequence bias (0.0016 against 0.0030) spread over every pair. Sequence read per pair is less sensitive to a bias that small, so version 10 no longer sees it. |
| A half overhand stacks its packets in reverse order, so any run longer than a packet is cut apart; each packet keeps its own order | Code | 9 | Half overhand | `overhand` in `moves.ts` puts each packet on top of the last (`packet.concat(result)`); `ohTop` applies it to the top half |
| A pile deal always puts cards that sit next to each other into different piles | Code | 9 | Pile | Six piles dealt in rotation: adjacent positions go to adjacent piles |
| A mash never changes the order of the cards within each half | Code | 9 | Mash | `riffle` in `moves.ts` drops packets from each half in order |
| The simulated mash is more even than a real one: real halves are rarely equal, and a block from the middle often drops without weaving in | Unverified | | Mash | The user's hand-measured mash. The engine models neither yet. |
| Repeated half overhands with mashes don't beat plain mashing on every test | Verified | 10 | Mash, half overhand, sorted deck | `npm run claims`, from sorted after 8 moves: (OHt·M)×4 reads sequence 0.33, proximity 0.20, position 0.14; M×8 reads 0.01, 0.00, 0.00. Plain mashing is ahead on all three. |
| Plain mashing needs eight rounds on a sorted deck mainly because old neighbours sit at the wrong distances after seven ("mash, again" step) | Contradicted | 10 | Mash, sorted deck | 200 runs of M×7 from sorted: 0 clean, and every run fails all three categories: sequence 0.029, proximity 0.020, position 0.010. Eight mashes aren't enough either: 65 of 200 clean, failing mostly on proximity (0.0030 against 0.003). |
| Starting decks: from sorted, it takes eight mashes to clear every test reliably | Contradicted | 10 | Mash, sorted deck | M×8 from sorted: 65 of 200 clean. |
| Footnote: from sorted, 5 mashes, a pile and 5 mashes passed 198 of 200 and at least 196 from each other deck; eight mashes passed 184 from sorted; from played, 3 mashes, a half overhand and a mash passed 0 of 200 (neighbour gaps 200, clump rate 36); seven mashes passed 197 | Contradicted | 10 | Mash, half overhand, pile | 200 runs per deck. M×5·P·M×5: sorted 199, played 199. M×8 from sorted: 65. M×3·OHt·M from played: 0, failing on position every time (clump rate is gone). M×7 from played: 0 or 1, failing on position (0.009). |
| Footnote: over 20,000 single shuffles, 3 mashes, a half overhand and a mash left no longer runs of spells, and no more spells side by side, than a random deck, even in the worst game in 100 | Removed test | 5 | Mash, half overhand, played deck | Card types are gone. On version 5, from played: spell run 1 in 100 = 3 (random 3); spells within three places 3.39 mean, 1 in 100 = 8 (random 3.49, 8). |
| Mash step: runs roughly double each mash; from sorted, the run count looks random only after six | Removed test | 1 | Mash, sorted deck | Ordering (the run count) is gone. On version 10, sequence reads 0.12 after six mashes and 0.02 after seven, and reaches noise at eight (`npm run claims`). |
| Overhand step: old neighbours never spread out, however long you go | Contradicted | 10 | Overhand, sorted deck | Proximity keeps falling slowly: 0.83 after one overhand, 0.65 after six, 0.45 after 20, 0.32 after 40 (the 20 and 40 readings are from version 9; proximity didn't change in version 10). It stays far from random, but "never" overstates it. |
| Half overhand step: four rounds break up order about as well as six mashes | Contradicted | 10 | Mash, half overhand, sorted deck | `npm run claims`: sequence 0.33 after four rounds of OHt·M, 0.12 after six mashes. On version 9 they read about the same (0.07 and 0.08), because one balance over all pairs let the pairs the half overhand reverses cancel the pairs the mashes keep. |
| Half overhand step: it doesn't beat plain mashing | Contradicted | 10 | Mash, half overhands, sorted and played decks | True from sorted: see the row on repeated half overhands above. False from played. `npm run search -- --from played --decks played`: the leaders cost 7 units and use a half overhand of each half. M×2·OHb·OHt·M×3 was clean in 151 of 200 runs (reference 198). M×7 ranked 12th of 32 in stage 2 and was clean in 0 or 1 of 200, failing on position (0.009). |
| Pile step: fails proximity on the low side | Contradicted | 9 | Pile, sorted deck | One pile from sorted fails proximity at 0.95, but version 9 proximity has no low side. It reads any distance a random deck wouldn't produce. "Neighbours spread too evenly" still describes why. |
| Pile step: a pile adds nothing random | Code | 10 | Pile | `pile()` is deterministic. One pile from sorted reads position 1.00, the same as an unshuffled deck. |
| Mana weaving step: land spacing catches evenly spaced lands | Removed test | 3 | Woven deck | Card types and the woven deck are gone. |
| Starting decks: the played deck reads ordering 36, close pairs 12.3, end cards at their ends five times the random rate | Removed test | | Played deck | Before shuffling, the played deck reads sequence 0.08 to 0.09 and proximity 0.09 to 0.10 on version 10 (`npm run claims`). Position reads 1.00 by definition, because it measures from the deck the run started with. |
| Starting decks: the woven and clumped decks | Removed test | 8 | | Both decks are gone, but the home page still describes four starting decks. |
| Charts and bars: ordering, proximity (close pairs) and position (χ²) series for each move | Removed test | | Mash, overhand, pile, half overhand | All three measures are gone. The series are precomputed in `data.json`, and the method isn't saved. |

## Tests for leftover order

| Claim | Status | Version | Depends on | Evidence |
| --- | --- | --- | --- | --- |
| A reversed deck breaks into 99 runs | Removed test | 3 | | Ordering (the run count) is gone. |
| From sorted, the mash passes ordering at the sixth mash and longest chain at the fifth | Removed test | 1 | Mash, sorted deck | |
| Six overhands from sorted pass ordering and fail proximity, local order, global proximity and correlation | Removed test | 1 | Overhand, sorted deck | On version 10, six overhands from sorted read sequence 0.07, proximity 0.65 and position 0.75. All three fail. |
| An overhand-only routine fails global proximity low every time | Removed test | 1 | Overhand, sorted deck | |
| Knowing global proximity tells you almost nothing about proximity at a single point in a mash sequence | Removed test | | Mash | |
| Global proximity misses the too-even spread | Removed test | | Mash | |
| Neighbour correlation has never caught anything on its own | Removed test | 2 | All moves | The classifier still uses neighbour correlation as a feature. |
| A pile deal puts neighbours 16 or 17 places apart (82 pairs) and 83 apart (16 pairs) | Code | 9 | Pile | Worked out from the deal. `pile()` hasn't changed since version 2. |
| A single pile from sorted leaves 17 runs and fails proximity low | Removed test | 2 | Pile, sorted deck | On version 10, one pile from sorted reads sequence 1.00 and proximity 0.95. |
| Strided chain failed only where ordering and proximity also failed | Removed test | 2 | Pile, sorted and played decks | |
| The too-even spread: close pairs dropped to about 1.6 around the fifth mash | Historical | 1 | Mash, sorted deck | From the refit of the mash model; not rerun |
| Proximity's lower bound sits three standard errors below the random mean | Removed test | 3 | | |
| Before neighbour gaps, seven mashes from sorted passed every test in about 6 of 10 runs | Historical | 4 | Mash, sorted deck | 125 of 200 on version 4 |
| After seven mashes from sorted, old neighbours sit next to each other about 11% more often than chance, and 2 to 8 apart 7% to 16% less often | Verified | 4 | Mash, sorted deck | 30 batches of 200 decks: ratios to random 1.11 at distance 1; 0.84 to 0.93 at 2 to 8. This is about where cards sit, not about a test, and the mash hasn't changed since, so it still holds. |
| Neighbour gaps: batches of 200 random 99-card decks read about 41, sd 9, and the test fails above about 68 | Removed test | 5 | | Proximity replaced neighbour gaps and reads on the level scale. |
| Seven mashes from sorted read about 108 on neighbour gaps and fail almost every time; eight read about 49 and pass about 39 times in 40 | Removed test | 5 | Mash, sorted deck | On version 10, proximity fails every run after seven mashes (0.020) and about half after eight (0.0030 against a noise line of 0.003). |
| Neighbour gaps, more than end retention, is why a sorted deck needs an eighth mash (also on the home page) | Contradicted | 10 | Mash, sorted deck | See the home page row. After seven mashes, every run fails all three categories, and sequence reads highest. |

## Tests across many shuffles

| Claim | Status | Version | Depends on | Evidence |
| --- | --- | --- | --- | --- |
| Three mashes from played fail global proximity, end retention, position and distinguishability | Removed test | 2 | Mash, played deck | On version 10, three mashes from played read sequence 0.06, proximity 0.05, position 0.36 and distinguishability about 59% to 61%. All three categories and distinguishability fail. |
| Adding a pile makes every single-deck test pass, leaving position (and distinguishability) | Removed test | 2 | Mash, pile, played deck | On version 10, M×3·P from played reads sequence 0.00 (within noise), proximity 0.03, position 0.15 and distinguishability about 62%. Proximity still fails, so version 10 doesn't support the claim. |
| Six piles from sorted score over 11 million on position | Removed test | 2 | Pile, sorted deck | The χ² position test is gone. Any number of piles from sorted reads position 1.00. |
| The classifier reads up to about 54% on random decks by luck | Verified (partly) | 10 | | `npm run claims -- --runs 20`, 200 runs of random decks: mean 51.0%, 95th percentile 53.2%, maximum 55.0%. A version 9 session read 50.4%, 52.0% and 54.5%. Every run in one session is compared with the same 1,000 random decks (`randomFeatures` caches them), so each session's readings share one offset, and the spread across sessions or page loads is wider than the spread within one. |
| Near the 56% threshold, readings vary by about 2 points | Verified (partly) | 10 | Mash, half overhand, played deck | Within one session, standard deviation 1.7 to 2.0 points across 5 routines, 200 runs each. Between sessions the averages moved by up to 2.6 points (M×3 from played: 58.0% in one session, 60.6% in the next), because of the cached random decks. |
| A routine fails every time only from about 60% up | Verified (partly) | 10 | Mash, played deck | M×3 from played averaged 60.6% and failed 198 of 200 in one session; in another it averaged 58.0% and failed 171. M×4 averaged 55.4% to 56.1% and failed 71 to 109. The session offset from the cached random decks decides much of this. |
| A random forest took about 40 times as long and scored 1 to 2 points worse | Verified | 2 | | 100 trees, depth 8: 37 to 45 times the time, 1.0 to 2.3 points lower. The original forest's settings weren't recorded. The classifier hasn't changed since. |
| The classifier found the too-even spread before proximity had a lower bound | Historical | 1 | | |

## Tests for land placement

Version 8 removed card types and the woven and clumped decks. Every claim on this page is about them.

| Claim | Status | Version | Depends on | Evidence |
| --- | --- | --- | --- | --- |
| Before shuffling, the woven deck fails only land spacing and clump rate | Removed test | 3 | Woven deck | |
| Land spacing clears after one mash on the woven and clustered decks | Removed test | 3 | Mash, woven and clumped decks | |
| From the woven deck, clump rate reads below the random range until the fourth mash | Removed test | 3 | Mash, woven deck | |
| From the clustered deck, clump rate reads 10.0 after two mashes and clears at the fifth | Removed test | 3 | Mash, clumped deck | |
| From sorted, clump rate reads below range between about the third and fifth mash and settles by the sixth | Removed test | 1 | Mash, sorted deck | |
| On a real deck, only the two land tests see a weave | Removed test | 3 | Mash, overhand | |
| Clump rate became a pass/fail test to catch weaving that land spacing lets through | Historical | | | `CHANGELOG.md` |

## Simulator

| Claim | Status | Version | Depends on | Evidence |
| --- | --- | --- | --- | --- |
| Ordering, proximity, position and land spacing show as percentages; the rest keep their units | Removed test | 3 | | Every measure now shows as a level. |
| Seven tests can also fail low | Removed test | 3 | | Version 9 levels fail only on the high side. |
| The four core tests count double, and the score is capped at the lowest failing test except clump rate | Removed test | 3 | | The total is now the sum of three category levels (`totalLevel` in `scoring.ts`). |
| Test descriptions (which shuffle each test was built for) | Removed test | 2 | | They describe the thirteen old tests. |

## Off-centre riffle

| Claim | Status | Version | Depends on | Evidence |
| --- | --- | --- | --- | --- |
| Position χ² spreads its evidence across all 9,801 card–position pairs, so it misses a single end card | Removed test | | Mash | Version 9 position reads the worst starting place, so a single stuck end card now counts in full. The rest of this page hasn't been checked. |

## Sticky ends

Every claim on this page is **unverified**. The page waits for the mash model to include the overhang. It also relies on
end retention, which the engine hasn't had since version 6. Position now catches cards that stay near their ends.
