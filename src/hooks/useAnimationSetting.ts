import { useEffect, useState } from 'react'

export const ANIMATION_SETTINGS = [
  { label: 'Slow', speed: 0.5, enabled: true },
  { label: 'Normal', speed: 1, enabled: true },
  { label: 'Fast', speed: 2, enabled: true },
  { label: 'Off', speed: 1, enabled: false },
] as const

export type AnimationLabel = (typeof ANIMATION_SETTINGS)[number]['label']

export interface AnimationSetting {
  label: AnimationLabel
  /** multiplier: 2 = twice as fast */
  speed: number
  enabled: boolean
  choose: (label: AnimationLabel) => void
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)')

/** Card-animation speed, starting at "Off" for people who prefer reduced motion. */
export function useAnimationSetting(): AnimationSetting {
  const [label, setLabel] = useState<AnimationLabel>(() => (reducedMotion().matches ? 'Off' : 'Normal'))

  useEffect(() => {
    const reducedMotionQuery = reducedMotion()
    const onChange = (event: MediaQueryListEvent) => setLabel(event.matches ? 'Off' : 'Normal')
    reducedMotionQuery.addEventListener('change', onChange)
    return () => reducedMotionQuery.removeEventListener('change', onChange)
  }, [])

  const setting = ANIMATION_SETTINGS.find((candidate) => candidate.label === label)!
  return { ...setting, choose: setLabel }
}
