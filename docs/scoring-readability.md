# Making the simulator's scores readable

This note is about how the simulator shows a routine's score, and the options for making it something a person without a
statistics background can read, compare and rank. Nothing here is decided except the category bars, which now show
noise lines on a log scale. The numbers are from engine version 11, written up on 2026-10-01.

## The total hides the edge of random

The simulator's headline score is the total: the sum of the three categories' levels, where 0 is a random deck and 1 is
a sorted deck that was never shuffled. Two problems make it hard to read.

- **It hides the noise line.** From a sorted deck, M×8, M×9 and M×12 total 0.010, 0.004 and 0.001. All three look like
  zero, but M×8 fails 7 runs in 10 and the other two pass almost every run. What decides a pass is whether each
  category is under its noise line: three standard deviations of what random decks read. Those lines sit between
  0.003 and 0.010 on the level scale, so the difference between failing and passing is invisible in the total.
- **It ranks differently from the tests.** From a sorted deck, M×3·OHt·M×2 totals 0.361, worse than M×6's 0.254. By
  how far its worst test sits past the noise line, it is the less detectable of the two: 28 noise lines against 36.
  The sum adds categories whose levels aren't on comparable scales.

## How the comparison was made

`npm run readability` runs 16 routines, plus a perfect shuffle as a reference, 200 times from each starting deck with
99 cards, and prints each candidate measure. It takes about 6 minutes (`scripts/score-readability.ts`). The measures:

- **Clean runs:** the share of runs where every category is within the noise of random. This is what the search counts.
- **Noise lines:** the worst metric's mean level divided by its noise line. 1 is the edge of random, and under 1 passes.
- **Spotted after:** about how many shuffled decks a careful observer would need to see before the leftover order
  showed. The noise line is set for a run of 1,200 decks and shrinks with the square root of the number of decks, so a
  routine at m noise lines is spotted after about 1,200 ÷ m² decks.
- **Mash equivalent:** the number of plain mashes from the same deck with the same noise lines, interpolated on a log
  scale between whole numbers of mashes.

## Results

From a sorted deck:

| Routine | Total | Clean runs | Noise lines | Spotted after | Mash equivalent |
| --- | --- | --- | --- | --- | --- |
| Perfect shuffle | 0.001 | 98% | 0.0 | never | — |
| M×5 | 0.637 | 0% | 40 | 1 | 5 |
| M×6 | 0.254 | 0% | 36 | 1 | 6 |
| M×3·OHt·M×2 | 0.361 | 0% | 28 | 1 | 6.1 |
| M×2·OHb·OHt·M×3 | 0.054 | 0% | 16 | 5 | 6.5 |
| M×7 | 0.058 | 0% | 7.4 | 22 | 7 |
| M×4·P·M×4 | 0.030 | 0% | 2.7 | 171 | 7.6 |
| M×8 | 0.010 | 30% | 1.15 | about 900 | 8 |
| M×9 | 0.004 | 92% | 0.43 | about 6,400 | 9 |
| M×10 | 0.003 | 93% | 0.33 | about 11,000 | 10 |
| M×5·P·M×5 | 0.002 | 98% | 0.04 | over 500,000 | over 10 |

From a played deck:

| Routine | Total | Clean runs | Noise lines | Spotted after | Mash equivalent |
| --- | --- | --- | --- | --- | --- |
| M×5 | 0.168 | 0% | 39 | 1 | 5 |
| M×3·OHt·M×2 | 0.073 | 0% | 19 | 3 | 5.7 |
| M×6 | 0.058 | 0% | 14 | 6 | 6 |
| M×7 | 0.012 | 1% | 2.5 | 187 | 7 |
| M×2·OHb·OHt·M×3 | 0.006 | 66% | 0.74 | about 2,200 | 7.7 |
| M×8 | 0.003 | 91% | 0.41 | about 7,100 | 8 |
| M×4·P·M×4 | 0.003 | 94% | 0.24 | about 21,000 | 8.3 |

Over 200 runs, a routine's noise lines are known to about ±0.025, so readings under about 0.05 can't be told apart from
a random deck's. That is why the script prints figures like 90 million for M×12, and why mash equivalents past about 10
aren't meaningful: the mashes themselves are already that close to random.

## Four ways to show a score

**Clean runs** is the most honest pass or fail, but it can't rank. From a sorted deck, everything up to M×7 reads 0% and
everything from M×9 reads 90% or more, so it only separates a narrow band in the middle. It also needs about 100 runs
per routine, about 4 seconds, where one run takes 41ms.

**Noise lines** is the natural unit. 1 is the edge of random, it keeps separating routines at both ends, and a single
run measures it to about ±0.3. It still needs explaining: "noise line" isn't a term a card player has.

**Spotted after N games** is the same measure in a card player's terms, since a deck is shuffled once a game. Its ratios
mean something: 900 games is ten times harder to notice than 90. The range is enormous, though, so it needs rounding
and a cap, such as "over 10,000 games", because one run can't resolve readings far below the line.

**Mash equivalent** is the most relatable ("as random as 7.6 mashes"), but it is defined by the mash model, which is due
to be reworked, so every routine's figure would move when the mash changes. It also stops working past about 10 mashes.

## What has changed so far: the category bars

The score card's category bars used to show each category's level from 0 to 1. A category that fails at a level of 0.02
drew a bar too short to see, so the bars couldn't tell a pass from a fail. They now show each category in noise lines
on a log scale from 0.1 to 1,000, with a mark at 1, a quarter of the way along. A bar that stops before the mark is
clear, and one that passes it isn't, in the clear or failing colour to match. For example, from a sorted deck, M×7's
three bars reach 2.0 to 6.9 noise lines, past the mark, and M×12's stop at 0.42 or less, short of it. The numbers beside
the bars are still the levels.

This needed no engine change. `noiseLines` in `src/engine/scoring.ts` works the figure out from the readings the score
card already has, and the score the engine gives is unchanged.

## A suggestion, not yet chosen

- Rank routines by noise lines on their weaker starting deck. The method list would show that figure in place of the
  total.
- Lead the score card with the plain-language version, for example "From a sorted deck: a careful player would spot it
  after about 900 games (1.15 noise lines)".
- Show the first run's figure at once, and let idle workers add runs in the background, tightening the figure the
  longer the routine is open.

## What a change would touch

- **The engine version** stays the same. None of these options changes a reading, a level or a pass line.
- **The site's text and `docs/claims.md`** quote totals, such as the footnote's 0.073 from a played deck. If the site
  moves to another measure, those claims need rewording and rechecking.
- **The search** (`npm run search`) ranks by the weakest deck's mean total. Ranking by noise lines would reorder its
  results: M×3·OHt·M×2 and M×6 swap places from a sorted deck, for example. That changes which routines the site
  recommends, so it is a separate decision from how the simulator shows a score.

## Open questions

- Which headline: games to spot, noise lines, or something else?
- Should the summed total go, or stay as a secondary figure?
- Should the search's ranking change to match?
