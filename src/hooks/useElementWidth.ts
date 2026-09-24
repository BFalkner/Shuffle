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

  const ref = useCallback((element: T | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!element) return
    const measure = () => {
      const measured = Math.round(element.getBoundingClientRect().width)
      if (measured > 0) setWidth(measured)
    }
    measure()
    observer.current = new ResizeObserver(measure)
    observer.current.observe(element)
  }, [])

  return [ref, width] as const
}
