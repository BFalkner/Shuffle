import { FULL, type Metric } from './types.ts'

export const distinguishability: Metric = {
  key: 'classifier', group: 'holistic', core: false, raw: true, unit: '% detect', side: 'low', title: 'Distinguishability', measure: null,
  desc: 'A classifier trained during each run to tell these decks from truly random ones. 50% is a coin flip. The catch-all for patterns no named test looks for. Readings under about 54% are luck.',
  writeup: { to: '/global-tests', label: FULL },
}
