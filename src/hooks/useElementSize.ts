import { useCallback, useRef, useState } from 'react'

/**
 * Track an element's width and height (px), for something that fits itself into the box it is given, both ways.
 *
 * Returns a callback ref: attach it with `ref={ref}`. Until the element is measured, the size is `fallback`.
 */
export function useElementSize<T extends HTMLElement>(fallback: { width: number; height: number }) {
  const [size, setSize] = useState(fallback)
  const observer = useRef<ResizeObserver | null>(null)

  const ref = useCallback((element: T | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!element) return
    const measure = () => {
      const box = element.getBoundingClientRect()
      const width = Math.round(box.width)
      const height = Math.round(box.height)
      if (width > 0 && height > 0) setSize((last) => (last.width === width && last.height === height ? last : { width, height }))
    }
    measure()
    observer.current = new ResizeObserver(measure)
    observer.current.observe(element)
  }, [])

  return [ref, size] as const
}
