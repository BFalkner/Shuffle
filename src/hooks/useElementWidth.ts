import { useCallback, useRef, useState } from 'react'

/**
 * Track an element's width (px). Charts use this to draw at their real size,
 * so nothing gets stretched on wide or narrow screens.
 *
 * Returns a callback ref: attach it with `ref={ref}`. It works even when the
 * element appears later (e.g. only after a click).
 */
export function useElementWidth<T extends HTMLElement>(fallback: number) {
  const [width, setWidth] = useState(fallback)
  const observer = useRef<ResizeObserver | null>(null)

  const ref = useCallback((el: T | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!el) return
    const measure = () => {
      const w = Math.round(el.getBoundingClientRect().width)
      if (w > 0) setWidth(w)
    }
    measure()
    observer.current = new ResizeObserver(measure)
    observer.current.observe(el)
  }, [])

  return [ref, width] as const
}
