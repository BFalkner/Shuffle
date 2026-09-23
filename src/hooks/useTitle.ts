import { useEffect } from 'react'

/** Set the browser tab title while this page is shown. */
export function useTitle(title: string) {
  useEffect(() => {
    document.title = title
  }, [title])
}
