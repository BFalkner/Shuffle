import { useEffect, useState } from 'react'
import { Button } from 'react-aria-components'

interface Props {
  label: string
  /** what the button says once armed, naming what the second press does */
  armedLabel: string
  onConfirm: () => void
  className?: string
}

/** A button for actions that can't be undone: the first press arms it for a few seconds, and the second one acts. */
export default function ConfirmButton({ label, armedLabel, onConfirm, className = '' }: Props) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(false), 3500)
    return () => clearTimeout(timer)
  }, [armed])
  return (
    <Button
      className={`${className}${armed ? ' armed' : ''}`}
      onPress={() => {
        setArmed(!armed)
        if (armed) onConfirm()
      }}
    >
      {armed ? armedLabel : label}
    </Button>
  )
}
