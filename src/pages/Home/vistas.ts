// The night below the hero, one stretch per section, from the hero's foot down to the lamp-lit table. Each palette's
// sky starts with the nearest ridge of the one above it, and the first starts with the hero's own foot.
import type { Palette } from './Landscape'

export const VISTAS: Record<'routines' | 'moves' | 'combine', { seed: number; palette: Palette }> = {
  routines: {
    seed: 41,
    palette: {
      sky: ['#150f25', '#1a1330', '#2e1f48', '#5a2f5c'],
      ridges: ['#4b3468', '#34254f', '#241a3a', '#1a1330'],
      glow: '#f0a24a',
      starCount: 46,
    },
  },
  moves: {
    seed: 58,
    palette: {
      sky: ['#1a1330', '#1c1535', '#2a2150', '#4a3a78'],
      ridges: ['#4a3f7a', '#33295c', '#251d47', '#1c1534'],
      glow: '#9fb4e8',
      starCount: 60,
    },
  },
  combine: {
    seed: 73,
    palette: {
      sky: ['#1c1534', '#1f1737', '#3a2448', '#7a3f4e'],
      ridges: ['#5a3452', '#3d2644', '#2b1d3a', '#22182f'],
      glow: '#f0a24a',
      starCount: 34,
      keep: { x: 1240, y: 215, scale: 0.42 },
    },
  },
}
