import { useEffect, useState } from 'react'

const SETTINGS = [
  { label: 'slow', speed: 0.5, enabled: true },
  { label: 'normal', speed: 1, enabled: true },
  { label: 'fast', speed: 2, enabled: true },
  { label: 'off', speed: 1, enabled: false },
] as const

export interface AnimationSetting {
  label: string
  /** multiplier: 2 = twice as fast */
  speed: number
  enabled: boolean
  /** advance to the next setting (slow → normal → fast → off → slow) */
  cycle: () => void
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)')

/** Card-animation speed, starting at "off" for people who prefer reduced motion. */
export function useAnimationSetting(): AnimationSetting {
  const [idx, setIdx] = useState(() => (reducedMotion().matches ? 3 : 1))

  useEffect(() => {
    const reducedMotionQuery = reducedMotion()
    const onChange = (event: MediaQueryListEvent) => setIdx(event.matches ? 3 : 1)
    reducedMotionQuery.addEventListener('change', onChange)
    return () => reducedMotionQuery.removeEventListener('change', onChange)
  }, [])

  const setting = SETTINGS[idx]
  return { ...setting, cycle: () => setIdx((current) => (current + 1) % SETTINGS.length) }
}
