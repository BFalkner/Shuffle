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
| 11 | The sequence category gains a second metric, pair order (Kendall's tau over every pair of cards), and reads the worse of the two. The category is renamed order, and its first metric neighbour order. Neighbour order, proximity, position and distinguishability read the same values as before. Recheck any row that depends on the order category, totals or clean runs. |

Version 6 replaced every test the site describes. On version 11 the engine measures three categories and
distinguishability:

- **Order** holds two metrics and reads the worse of the two. Before version 11 it was called sequence and held only
  neighbour order.
  - **Neighbour order** is whether the card that followed each card still lands on the same side of it, run after
    run. It reads each pair on its own and combines the pairs with a power mean, so a few bad pairs aren't averaged
    away.
  - **Pair order** is Kendall's tau: the share of all pairs of cards still in their old order, at every spacing. It
    catches a faint order spread across the whole deck.
- **Proximity** is how far apart old neighbours sit, compared with a random deck. It grew out of neighbour gaps.
- **Position** is how much a card's starting place tells you about where it ends up. It reads each starting place on
  its own and combines them the same way.
- **Distinguishability** is the accuracy of a classifier trained to tell the decks from random ones. The engine reports
  it alongside the categories, and it doesn't count toward a clean run.

A category is within noise when its level is at most three standard deviations of random decks: 0.010 for neighbour order,
0.004 for pair order, 0.003 for proximity and 0.003 for position on a 99-card deck. Distinguishability is within noise up to 56%. A
**clean** run has every category within noise. A run is 1,200 simulated decks (1,000 for distinguishability).

Status values:

- **Verified**: rerun on the engine version shown, and the site text matches.
- **Contradicted**: the site says one thing and a rerun shows another. Fix the site or rerun with more samples.
- **Removed test**: the claim is about a test, deck or card type that the engine no longer has, so it can't be
  rerun. The evidence column gives the nearest version 11 reading where there is one. The site-text pass should rewrite
  or drop the claim.
- **Unverified**: inherited from earlier work and never rerun.
- **Historical**: describes an earlier model or how a test came about. It can't be rerun.
- **Code**: follows directly from the code, not from a simulation.

Three scripts reproduce the version 11 evidence. `npm run worst-case` reads 20,000 seeded decks per routine and gives the
worst game in 100: old neighbours still side by side, the longest stretch of old order, close pairs, and where the old
end cards land. `npm run search -- --routine "M×5·P·M×5" --routine "M×3·OHt·M×2" --routine "M×3·OHt·M" --routine
M×7 --routine M×8 --routine M×9 --routine "M×2·OHb·OHt·M×3"` gives the recommendation numbers from 200 runs per starting deck. `npm run claims` gives the
step-by-step levels behind the move steps and the distinguishability checks (`--runs 20` for 200 runs of each). The
moves haven't changed since version 2, so claims about where cards end up, rather than about a test, still hold where
they were verified on version 2 or later.

## Random-deck values

These describe how the old tests read on random decks. None of those tests has existed since version 6.

| Claim | Where | Status | Version | Evidence |
| --- | --- | --- | --- | --- |
| Ordering averages about 50.1 runs, standard deviation 2.9 | Order tests | Removed test | 3 | Ordering (the run count) is gone. |
| Proximity averages about 5.9 close pairs | Order tests | Removed test | 3 | Close pairs is gone. Proximity now reads the share of old neighbours at distances a random deck wouldn't produce. |
| Global proximity averages about 32 | Order tests, simulator | Removed test | 3 | |
| Longest chain is four or five in a random deck | Order tests, simulator | Removed test | 3 | |
| Land spacing reads about 1.8 | Mana tests | Removed test | 3 | Card types are gone. |
| Clump rate's random range is 6.1 to 6.8 | Mana tests | Removed test | 3 | Card types are gone. |
| End retention is 0.08 when random | Simulator | Removed test | 3 | Position now covers cards that stay near their ends. |
| Position averages 9,604; fails above about 13,900 | Global tests | Removed test | 3 | The χ² position test is gone. Position now reads 0 for random decks and 1 for a sorted deck. |

## Home page

| Claim | Status | Version | Depends on | Evidence |
| --- | --- | --- | --- | --- |
| Between-games card: 3 mashes, a half overhand and 2 mashes, six moves; the tests still find traces of the old order | Verified | 11 | Mash, half overhand, played deck | 200 runs from played: 0 clean. Total 0.073, most of it position (0.065); order 0.005, proximity 0.003. From sorted: 0 clean, total 0.36. The five-move version (M×3·OHt·M) read 0.20 from played and 0.90 from sorted in the same session. |
| New-deck card: 5 mashes, a pile and 5 mashes cleared every test as often as a perfectly random deck, from every starting deck | Verified | 11 | Mash, pile, sorted and played decks | 200 runs per deck: sorted 192 clean, played 196 (reference 199 and 194 in the same session). On version 9 it was clean in only 155 from sorted, failing on a slight sequence bias (0.0016 against 0.0030) spread over every pair; version 10's per-pair sequence doesn't see a bias that small, and version 11's pair order doesn't flag it either. |
| A half overhand stacks its packets in reverse order, so any run longer than a packet is cut apart; each packet keeps its own order | Code | 9 | Half overhand | `overhand` in `moves.ts` puts each packet on top of the last (`packet.concat(result)`); `ohTop` applies it to the top half |
| A pile deal always puts cards that sit next to each other into different piles | Code | 9 | Pile | Six piles dealt in rotation: adjacent positions go to adjacent piles |
| Moves intro: readings are the share of a sorted deck's order, proximity and position left, 100% for sorted and 0% for random | Code | 11 | | A percentage is the level from `level` in `scoring.ts` times 100. Order in the steps is the order category (the worse of neighbour order and pair order), except where a sentence names the order across the whole deck, which is pair order. |
| Move charts: order, proximity and position left after each of 0 to 10 repeats of mash, overhand and pile from a sorted deck | Verified | 11 | Mash, overhand, pile, sorted deck | `npm run home-charts` writes `src/pages/Home/charts.json` (seeded, 10 runs per move). Rerun it when ENGINE_VERSION changes. Repeated piles don't settle: proximity goes 95%, 75%, 47%, 37% and then wanders between 21% and 29%, because a fixed deal repeated is still a fixed arrangement. |
| Mash step: every mash lowers all three readings, and eight mashes bring each one under 1% | Verified | 11 | Mash, sorted deck | Mean of 5 runs from sorted (scratch script over `computeResult`; `npm run claims` prints the same steps for M×8, OH×8 and P). After 8: neighbour order 0.005, pair order 0.002, proximity 0.003, position 0.003. Each falls at every step. |
| Mash step: old neighbours nearly always fall in the same half, so order is still at 40% after five mashes | Verified | 11 | Mash, sorted deck | Mean of 5 runs from sorted (scratch script over `computeResult`; `npm run claims` prints the same steps for M×8, OH×8 and P). Order (neighbour order) 0.98, 0.94, 0.86, 0.70, 0.40 after one to five mashes. `riffle` keeps each half's order. |
| Overhand step: one overhand separates more cards from their old followers than five mashes do | Verified | 11 | Mash, overhand, sorted deck | Mean of 5 runs from sorted (scratch script over `computeResult`; `npm run claims` prints the same steps for M×8, OH×8 and P). Neighbour order 0.22 after one overhand, 0.40 after five mashes. |
| Overhand step: the deck comes out close to reversed; after eight overhands order is at 83%, proximity 60%, position 72% | Verified | 11 | Overhand, sorted deck | Mean of 5 runs from sorted (scratch script over `computeResult`; `npm run claims` prints the same steps for M×8, OH×8 and P). Order is pair order, which counts a reliably reversed deck as order. |
| Pile step: one deal cuts the order across the whole deck to 14% | Verified | 11 | Pile, sorted deck | Mean of 5 runs from sorted (scratch script over `computeResult`; `npm run claims` prints the same steps for M×8, OH×8 and P). Pair order 0.137 after one pile. |
| Pile step: the deal is fixed, so position stays at 100%, and old neighbours end up the same distance apart, which keeps proximity at 95% | Verified | 11 | Pile, sorted deck | Mean of 5 runs from sorted (scratch script over `computeResult`; `npm run claims` prints the same steps for M×8, OH×8 and P). Position 1.000 and proximity 0.946 after one pile. `pile()` is deterministic. |
| Combine section: each mash halves the order left across the whole deck (0.50, 0.25, 0.12, 0.06) | Verified | 11 | Mash, sorted deck | Pair order after one to four mashes from sorted, mean of 5 runs: 0.502, 0.252, 0.124, 0.060. The follower check's distance from 1 roughly doubles too: 0.02, 0.06, 0.14, 0.30, 0.60 after one to five. |
| Combine section: after six mashes of a played deck, the old top card is still in the top five in 9% of games and the bottom card in the bottom five in 10%; a random deck gives 5% | Verified | 11 | Mash, played deck | `npm run worst-case` (20,000 seeded decks per routine). M×6 from played: top 8.9%, bottom 9.9%. Random deck: 5.0% and 5.2%. |
| Combine section: a half overhand never left the top card in the top five in 20,000 shuffles of a sorted deck, and in 99 games out of 100 it ended 31st or deeper | Verified | 11 | Half overhand, sorted deck | `npm run worst-case` (20,000 seeded decks per routine). OHt from sorted: top card in top five 0.0%; worst game in 100 puts it 31st; mean 47.9. |
| Combine section: in 20,000 deals, no pair of old neighbours ended within three places of each other | Verified | 11 | Pile | `npm run worst-case` (20,000 seeded decks per routine). P from sorted: close pairs 0 in every deck. Also follows from `pile()`: old neighbours go to adjacent piles, about 16 places apart. |
| Combine section: the half overhand leaves the other half in its old order; the pile puts each card in the same place every time | Code | 11 | Half overhand, pile | `ohTop` copies the bottom half unchanged. `pile()` is deterministic. |
| Combine section: from played, M×2·OHb·OHt·M×3 left the end cards near their ends no more often than random, and passed every test in 127 of 200 runs against 3 for M×7 | Verified | 11 | Mash, half overhands, played deck | `npm run worst-case` (20,000 seeded decks per routine). Top five 4.9%, bottom five 4.2% (random 5.0%, 5.2%). `npm run search`: clean 127 of 200 this session (131 and 140 in earlier ones); M×7 clean 3 (0 to 2 earlier). |
| Footnote: from played, 3 mashes, a half overhand and 2 mashes passed 0 of 200, mostly on position; seven plain mashes passed 3 | Verified | 11 | Mash, half overhand, played deck | 200 runs from played. M×3·OHt·M×2: 0 clean, position 0.065 of a 0.073 total. M×7: 3 clean, failing on position (0.009); earlier sessions gave 0 to 2. |
| Footnote: a test passes when the deck is within three standard deviations of a random deck; a run passes only when it clears every test | Code | 11 | | `noiseLevel` in `scoring.ts` sets each metric's line at 3 standard deviations of random decks; a run is clean when every category is within its line |
| The simulated mash is more even than a real one: real halves are rarely equal, and a block from the middle often drops without weaving in | Unverified | | Mash | The user's hand-measured mash. The engine models neither yet. No longer on the site (removed 2026-09-30). |
| Repeated half overhands with mashes don't beat plain mashing on every test | Verified | 11 | Mash, half overhand, sorted deck | `npm run claims`, from sorted after 8 moves: (OHt·M)×4 reads order 0.34, proximity 0.19, position 0.14; M×8 reads 0.00, 0.00, 0.00. Plain mashing is ahead on all three. No longer on the site (removed 2026-09-30). |
| Starting decks: from sorted, it takes eight mashes to clear every test reliably | Contradicted | 11 | Mash, sorted deck | M×8 from sorted: 51 of 200 clean. M×9: 179 of 200. No longer on the site (removed 2026-09-30). |
| Overhand step: old neighbours never spread out, however long you go | Contradicted | 10 | Overhand, sorted deck | Proximity keeps falling slowly: 0.83 after one overhand, 0.65 after six, 0.45 after 20, 0.32 after 40 (the 20 and 40 readings are from version 9; proximity didn't change in version 10). It stays far from random, but "never" overstates it. No longer on the site (removed 2026-09-30). |
| Overhand step: the overhand breaks up runs quickly, so it passes ordering within a few passes | Contradicted | 11 | Overhand, sorted deck | Ordering is gone, and the version 11 order category says the opposite: order reads 0.93 after one overhand and 0.85 after six (`npm run claims`). An overhand stacks its packets in reverse, so it leaves the deck close to reversed, and pair order counts reliably reversed as order. Neighbour order alone read 0.05 to 0.24, which is why version 10 looked closer to the old claim. No longer on the site (removed 2026-09-30). |
| Half overhand step: four rounds break up order about as well as six mashes | Contradicted | 11 | Mash, half overhand, sorted deck | `npm run claims`: order 0.34 after four rounds of OHt·M, 0.10 after six mashes. On version 9 they read about the same (0.07 and 0.08), because one balance over all pairs let the pairs the half overhand reverses cancel the pairs the mashes keep. No longer on the site (removed 2026-09-30). |
| Half overhand step: it doesn't beat plain mashing | Contradicted | 11 | Mash, half overhands, sorted and played decks | True from sorted: see the row on repeated half overhands above. False from played. `npm run search -- --from played --decks played`: the leaders cost 7 units and use a half overhand of each half. M×2·OHt·OHb·M×3 was clean in 140 of 200 runs (reference 198). M×7 ranked 18th of 32 in stage 2 and was clean in 0 to 2 of 200, failing on position (0.009). No longer on the site (removed 2026-09-30). |
| Pile step: fails proximity on the low side | Contradicted | 9 | Pile, sorted deck | One pile from sorted fails proximity at 0.95, but version 9 proximity has no low side. It reads any distance a random deck wouldn't produce. "Neighbours spread too evenly" still describes why. No longer on the site (removed 2026-09-30). |
| Starting decks: the played deck reads ordering 36, close pairs 12.3, end cards at their ends five times the random rate | Removed test | | Played deck | Before shuffling, the played deck reads sequence 0.09 and proximity 0.09 to 0.10 on version 11 (`npm run claims`). One mash raises sequence to 0.15: pair order rises because the mash spreads the sorted block of played cards through the whole deck. Position reads 1.00 by definition, because it measures from the deck the run started with. No longer on the site (removed 2026-09-30). |

## From discussion

Claims made while working on the site, by the user or by Claude, that aren't on the site. Status says whether the engine
agrees. Contradicted rows stay, so the same idea isn't taken as true again. Added 2026-09-30.

| Claim | Source | Status | Version | Evidence |
| --- | --- | --- | --- | --- |
| OHb·OHt·M (in either order) is equivalent to OH·M | user (question) | Contradicted | 11 | `npm run search`: OHb·OHt·M totals 1.347 from sorted and 0.475 from played; OH·M 1.783 and 0.832. At full length, M×2·OHb·OHt·M×3 was clean in 127 of 200 from played and M×2·OH·M×3 in 0. OHb·OHt is close to OH followed by a cut: a scratch script (not in the repo, 40 runs) read OH, a cut, then M at 1.317 and 0.463. Swapping the halves lowers order, and the cut's random depth lowers position: a cut at exactly 50 left position at 0.626. The order of the two half overhands doesn't matter: neither moves a card across the cut, and M×2·OHt·OHb·M×3 was clean in 140 of 200. |
| The power mean (version 10) raised M×8's score | user | Contradicted | 11 | M×8 from sorted, 200 runs: total 0.015 on version 9 (`ced78e0`), 0.009 on version 10 (`f9bb323`), 0.010 on version 11. Position fell from 0.009 to 0.002 because a power mean over 99 places weighs a few stuck places less than the worst-place reading did. Sequence rose from 0.002 to 0.004. |
| M×8 from a played deck should read much worse than a total of 0.003 | user | Contradicted | 11 | `npm run search`: M×8 from played totals 0.003 and is clean in 184 of 200 (random 198). The played deck already had seven mashes before its top thirty cards were sorted. From sorted M×8 totals 0.010 and is clean in 46. May change with the mash rework. |
| In the worst case, six mashes leave cards near the top and the bottom | user | Verified | 11 | `npm run worst-case`: M×6 from played leaves the old top card in the top five in 8.9% of games and the bottom card in the bottom five in 9.9%. Random: 5.0% and 5.2%. |
| In the worst case, six mashes leave old neighbours side by side and in clumps | user | Contradicted | 11 | `npm run worst-case`, worst game in 100 for M×6 from played: 3 cards still followed by their old follower (random 4), 8 close pairs (random 12), longest run 2 (random 2). The user expects the mash rework to change this. |
| On average, six mashes look better than the between-games routine | user | Verified | 11 | `npm run search`: M×6 totals 0.254 from sorted and 0.058 from played; M×3·OHt·M×2 0.361 and 0.073. Neither is ever clean. |
| A half overhand always buries the top card | user | Verified | 11 | `npm run worst-case`: OHt from sorted never left the top card in the top five in 20,000 shuffles, and the worst game in 100 put it 31st. Code: the top packet lands at the bottom of the top half. |
| A half overhand always breaks linear order | user | Verified (partly) | 11 | Code: every run longer than a packet is cut, but only in the half it touches. `npm run worst-case`: OHt from sorted leaves a longest run of 49.5 cards on average (66 in the worst game in 100), all in the untouched half. |
| Mashing alone relies on luck | user | Verified (partly) | 11 | Single games vary: the end-card rates above. On averages, mashing alone reaches random: M×11 is clean in 195 of 200 from sorted and 198 from played (`npm run search`). |
| Real mashing's main weakness is the ends, and it keeps order longer than the engine shows | user | Unverified | 11 | The user's recent hand results, not in the repo. The mash rework should test both. The engine agrees on the ends: after six mashes the end cards stay near their ends at about twice the random rate. |
| A forced move needs mashes both before and after it | user | Contradicted (partly) | 11 | `npm run search`, 200 runs: from played, the half overhand does worse last (M×5·OHt 0.122) than in the middle (0.073) or first (0.074). From sorted it does best last (0.318, middle 0.361, first 0.466). P·M×10, M×5·P·M×5 and M×10·P are all clean in 192 to 198 of 200: no difference once there are ten mashes. |
| Combining moves overcomes each move's weakness | user | Verified (partly) | 11 | From played, M×2·OHb·OHt·M×3 against M×7 (both 7 moves): clean 127 against 3, and both end cards at random rates (4.9% and 4.2%). But M×3·OHt·M×2 reads above M×6 on averages, and leaves the bottom card in the bottom five in 14.5% of games against M×6's 9.9% (`npm run worst-case`). |
| The between-games routine buries the top card but not the bottom card | Claude | Verified | 11 | `npm run worst-case`, M×3·OHt·M×2 from played: top card in the top five in 4.9% of games (random 5.0%), bottom card in the bottom five in 14.5% (random 5.2%), and the bottom card sits 31.5 places from the bottom on average (random 50). |
| One more mash drops the between-games routine from about 0.21 to about 0.08 | user | Verified | 11 | `npm run search` from played: M×3·OHt·M totals 0.200 and M×3·OHt·M×2 0.073. |

## Tests for leftover order

| Claim | Status | Version | Depends on | Evidence |
| --- | --- | --- | --- | --- |
| A reversed deck breaks into 99 runs | Removed test | 3 | | Ordering (the run count) is gone. |
| From sorted, the mash passes ordering at the sixth mash and longest chain at the fifth | Removed test | 1 | Mash, sorted deck | |
| Six overhands from sorted pass ordering and fail proximity, local order, global proximity and correlation | Removed test | 1 | Overhand, sorted deck | On version 11, six overhands from sorted read sequence 0.85, proximity 0.65 and position 0.75. All three fail. Sequence is high because pair order sees the deck left close to reversed. |
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
| Neighbour gaps, more than end retention, is why a sorted deck needs an eighth mash | Contradicted | 11 | Mash, sorted deck | 200 runs of M×7 from sorted: 0 clean. After seven mashes, every run fails all three categories, and order reads highest. |

## Tests across many shuffles

| Claim | Status | Version | Depends on | Evidence |
| --- | --- | --- | --- | --- |
| Three mashes from played fail global proximity, end retention, position and distinguishability | Removed test | 2 | Mash, played deck | On version 11, three mashes from played read sequence 0.06, proximity 0.05, position 0.37 and distinguishability about 59%. All three categories and distinguishability fail. |
| Adding a pile makes every single-deck test pass, leaving position (and distinguishability) | Removed test | 2 | Mash, pile, played deck | On version 11, M×3·P from played reads sequence 0.00 (within noise), proximity 0.03, position 0.16 and distinguishability about 67%. Proximity still fails, so version 11 doesn't support the claim. |
| Six piles from sorted score over 11 million on position | Removed test | 2 | Pile, sorted deck | The χ² position test is gone. Any number of piles from sorted reads position 1.00. |
| The classifier reads up to about 54% on random decks by luck | Verified (partly) | 11 | | `npm run claims -- --runs 20`, 200 runs of random decks in each of three sessions: means 50.4%, 51.0% and 50.8%; 95th percentiles 52.0% to 53.2%; maxima 54.5% to 55.0%. Every run in one session is compared with the same 1,000 random decks (`randomFeatures` caches them), so each session's readings share one offset, and the spread across sessions or page loads is wider than the spread within one. |
| Near the 56% threshold, readings vary by about 2 points | Verified (partly) | 11 | Mash, half overhand, played deck | Within one session, standard deviation 1.3 to 2.0 points across 5 routines, 200 runs each. Between sessions the averages moved by up to 2.6 points (M×3 from played: 58.0%, 60.6% and 59.8% in three sessions), because of the cached random decks. |
| A routine fails every time only from about 60% up | Verified (partly) | 11 | Mash, played deck | M×3 from played averaged 58.0% to 60.6% across three sessions and failed 171 to 198 of 200. M×4 averaged 53.7% to 56.1% and failed 26 to 109. The session offset from the cached random decks decides much of this. |
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
