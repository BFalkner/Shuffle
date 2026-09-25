# Review notes: branch `test-areas`

This branch changes how routines are judged. It adds tests for what a player would notice, groups the tests into
four areas, and fixes end retention. It also records the results of an overnight set of searches. Nothing here is on
`main`, and no reader-facing site text has changed yet.

## Commits

| Commit | What it does | Engine version |
| --- | --- | --- |
| Add spell-only tests and a noticeable tier | Four tests that ignore lands, and a flag on each test for which failures a player would notice | 6 |
| Track the real end cards in end retention | End retention follows the starting deck's top and bottom cards | 7 |
| Judge routines by area | Order, proximity, position and grouping; the search and simulator judge by area | 7 (no result changes) |

## What changed

### Spell-only tests

Lands are interchangeable, so a player doesn't notice their order, but notices spells coming back in the same order.
Four new tests look at the spells alone:

- **Spell ordering** counts rising runs among the spells. It fails on either side.
- **Spell proximity** counts spells that were next to each other and are still within three places. It fails only
  when there are too many.
- **Spell chain** is the longest run of spells still in their old order.
- **Top spell retention** checks whether the spell that started highest is still in the seven-card opening hand. It
  is judged as a rate over 400 shuffles, like end retention. A random deck: 7 in 99.

### The noticeable tier

Each test records which failures a player would notice at the table (`noticeable` in `metrics.ts`):

| Test | Noticeable failures |
| --- | --- |
| Spell ordering | Both sides |
| Spell proximity, spell chain, top spell retention | Too high |
| Position | Too high (cards landing in the same places) |
| Land spacing | Too high (clumped lands). An even spread is welcome unless it was forced, so the woven side stays statistical. |
| Everything else | None: statistical only |

Every test is still measured and reported. The noticeable tier decides the ranking first.

### Areas

| Area | Tests |
| --- | --- |
| Order | Ordering, longest chain, local order, spell ordering, spell chain |
| Proximity | Proximity, global proximity, neighbour gaps, neighbour correlation, spell proximity |
| Position | Position, end retention, top spell retention, strided chain |
| Grouping | Land spacing, clump rate |

An area fails when any of its tests fails, so a weakness counts once. An area reads its worst test's degree.

### End retention fix

End retention checked card 0 and the last card by number. That was right only for a sorted deck. It now follows the
cards that started on top and on the bottom. The pass line is unchanged. From a played deck, the bottom card turns
out to be sticky: in a 20-run check, M×6 failed end retention 18 times and M·OHt·M×4 19 times. Before the fix, the
test was effectively checking only the top card of a played deck. End retention is statistical only, so this doesn't
affect the noticeable tier.

## Decisions I made that you should check

1. **Distinguishability is reported alongside the areas, not as a fifth area.** Its job is to flag what the four
   areas missed.
2. **Strided chain is under position** (it comes from the pile deal's fixed arithmetic), and **neighbour correlation
   is under proximity** (the write-up calls it a second reading of proximity).
3. **Areas are compared by excess, not by ratio.** Areas with more tests read higher on a random deck, so the search
   subtracts what a perfect shuffle reads in each area (`areaReference.ts`). I first divided instead, but a perfect
   shuffle reads close to 0 in some areas (order: 0.03; most noticeable readings: 0.01), so small harmless leftovers
   became large multiples.
4. **The composite score in the simulator weights each area equally.** Before, an area with five tests had five times
   the weight of an area with one.
5. **The older end retention test still uses four places at each end** and counts both ends. Only the new top spell
   test uses the opening hand.
6. **The overnight runs used 20 stage 2 runs** (`--leader-runs 20`) as a per-run option. The default is still 5.

## Overnight runs

Results are in `logs/` (not committed): console output as `.txt` and full statistics as `.json`. The script that ran
them is `logs/overnight.sh`.

Only two of the four runs finished. At 23:25 Claude Code stopped the background task because the computer was low
on memory. Its note said this reflects the system's memory, not the searches, and not to restart them without being
asked. The third run (`sorted-8`) was partway through stage 1, and its `node` process kept running after the stop; I
ended it. The fourth run, the claims recheck on version 7, never started. So the claims log isn't updated for
versions 6 and 7.

| Run | Options | Result |
| --- | --- | --- |
| `between-7` | Up to 7 units, from played, ranked on played; 100 leaders × 20 runs, 10 finalists × 200 runs | Finished, 30 min |
| `between-5` | Up to 5 units, same otherwise; 60 leaders | Finished, 11 min |
| `sorted-8` | Up to 8 units, from sorted, all four decks | Stopped in stage 1 |
| `claims-v7` | The routines the site cites, all four decks, 200 runs | Not started |

Figures below are from a played deck, 200 runs each. "Nothing noticeable" counts runs with no noticeable failure.
"All areas" counts runs with all four areas clear. Excess is the worst area's reading above a perfect shuffle: about 0
is as random as a perfect shuffle, and the pass line is about 1 above it.

### Between games, up to 7 units

| Routine | Nothing noticeable | Noticeable excess | All areas | All-areas excess | Areas that failed |
| --- | --- | --- | --- | --- | --- |
| Perfect shuffle | 199 | 0.09 | 196 | 0.20 ± 0.17 | – |
| M×2·OHb·M·OHt·M×2 | 200 | 0.01 | 173 | 0.43 ± 0.23 | Proximity 19, grouping 6 |
| M·OHb·M×2·OHt·M×2 | 200 | 0.04 | 163 | 0.49 ± 0.23 | Grouping 26, proximity 14 |
| M·OHt·M·OHb·M×2·OHb | 200 | 0.02 | 146 | 0.55 ± 0.23 | Proximity 49 |
| M×3·OHt·M·OHb·M | 200 | 0.07 | 143 | 0.55 ± 0.28 | Position 38, proximity 22 |
| M×2·OHb·M×4 | 199 | 0.04 | 143 | 0.53 ± 0.30 | Position 50, proximity 12 |
| M×2·OHb·OHt·M×2·OHb | 200 | 0.03 | 138 | 0.59 ± 0.27 | Proximity 43, grouping 26 |
| M×3·OHt·OHb·M·OHb | 200 | 0.06 | 78 | 0.86 ± 0.41 | Proximity 116 |
| M×2·OHt·OH·M×2 | 200 | 0.01 | 71 | 0.78 ± 0.27 | Proximity 78, position 76 |
| M·OHt·M×4·OHt | 199 | 0.07 | 4 | 1.63 ± 0.47 | Position 195 |
| M×2·OHb·M×3·OHb | 200 | 0.02 | 1 | 1.65 ± 0.44 | Position 199 |

In stage 2 (20 runs), M×6 ranked 41st (noticeable excess 0.07, all-areas excess 1.38) and M×7 ranked 53rd (0.09 and
0.54), so neither reached stage 3.

### Between games, up to 5 units

| Routine | Nothing noticeable | Noticeable excess | All areas | All-areas excess |
| --- | --- | --- | --- | --- |
| Perfect shuffle | 200 | 0.07 | 198 | 0.17 ± 0.16 |
| M×3·OHt·M | 200 | 0.06 | 0 | 4.32 ± 0.55 |
| OHt·M·OHb·M×2 | 200 | 0.08 | 0 | 3.16 ± 0.89 |
| M×4·OHt | 199 | 0.12 | 0 | 2.78 ± 0.49 |
| (seven more, all 198–200 and 0) | | | | |

In stage 2, M×5 ranked 12th (noticeable excess 0.14) and M×4 ranked 39th (0.23).

### What the results show

1. **From a played deck, the noticeable tier clears early.** Every finalist at 5 units, and M×5, had nothing
   noticeable in at least 198 of 200 runs. In the model, a player wouldn't see leftovers after about five moves. This
   doesn't match your experience at the table. The likely reason is the one in your notes on the mash: the engine
   doesn't yet model uneven halves or the middle block that drops without interleaving, so the simulated mash mixes
   better than a real one.
2. **Ranking by the noticeable tier first doesn't work once it clears.** At 6 to 7 units, every leader sits at or
   below a perfect shuffle's noticeable excess (0.01 to 0.09 against 0.09). The ranking is then decided by noise in a
   tier that has nothing left to find. That is how M×2·OHb·M×3·OHb (1 of 200 runs with all areas clear) reached the
   finals ahead of M×7 (0.54 all-areas excess in stage 2). Some routines also read *below* a perfect shuffle on the
   noticeable tier: a routine that reliably buries the top spell reads 0 on top spell retention, while a truly random
   deck sometimes leaves it in the opening hand.
3. **With the end retention fix, the bottom card matters on the full battery.** Routines with a half overhand of the
   bottom (OHb) as well as the top lead the all-areas ranking. The best, M×2·OHb·M·OHt·M×2, clears all four areas in
   173 of 200 runs. Routines that end on OHb, or that never touch the bottom half, fail position (end retention) almost
   every time.

## Suggested next steps

- **Use the noticeable tier as a gate, not the first ranking key.** For example: first require nothing noticeable in
  at least 97% of runs, then rank by all-areas excess. This is a change to how the search ranks, so it's your call.
- **Rerun `sorted-8` and `claims-v7`** when the computer has memory to spare. Running them one at a time, with nothing
  else open, should help. Then update the claims log for versions 6 and 7.
- **Model the real mash's uneven halves and overhang,** then rerun `between-5`. That is the most direct test of
  whether an early half overhand removes the runs you see at the table.
- **Site text:** nothing is drafted yet. It depends on the ranking decision and the claims recheck.
