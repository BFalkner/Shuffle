import { FULL, type Metric } from './types.ts'

export const position: Metric = {
  key: 'position', group: 'structure', core: true, raw: false, unit: '%', side: 'low', title: 'Position', measure: null,
  desc: 'Whether cards keep landing in the same places across many shuffles, using a chi-square over every card and position. Built for the pile deal, which puts every card in a fixed place.',
  writeup: { to: '/global-tests', label: FULL },
}
