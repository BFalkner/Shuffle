import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useTitle } from '../../hooks/useTitle'
import './writeup.css'

interface Props {
  title: string
  subtitle: string
  children: ReactNode
  /** show the "back to the simulator" link (default true) */
  backLink?: boolean
}

/** Shared layout for the long-form write-up pages. */
export default function Writeup({ title, subtitle, children, backLink = true }: Props) {
  useTitle(title)
  return (
    <article className="writeup">
      <h1>{title}</h1>
      <p className="sub">{subtitle}</p>
      {backLink && (
        <p className="writeup-back">
          <Link className="backlink" to="/simulator">
            ← back to the simulator
          </Link>
        </p>
      )}
      {children}
    </article>
  )
}
