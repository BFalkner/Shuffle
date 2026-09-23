import { useEffect, useState } from 'react'

const SETTINGS = [
  { label: 'slow', speed: 0.5, on: true },
  { label: 'normal', speed: 1, on: true },
  { label: 'fast', speed: 2, on: true },
  { label: 'off', speed: 1, on: false },
] as const

export interface AnimationSetting {
  label: string
  /** multiplier: 2 = twice as fast */
  speed: number
  on: boolean
  /** advance to the next setting (slow → normal → fast → off → slow) */
  cycle: () => void
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)')

/** Card-animation speed, starting at "off" for people who prefer reduced motion. */
export function useAnimationSetting(): AnimationSetting {
  const [idx, setIdx] = useState(() => (reducedMotion().matches ? 3 : 1))

  useEffect(() => {
    const mq = reducedMotion()
    const onChange = (e: MediaQueryListEvent) => setIdx(e.matches ? 3 : 1)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const s = SETTINGS[idx]
  return { ...s, cycle: () => setIdx((i) => (i + 1) % SETTINGS.length) }
}
