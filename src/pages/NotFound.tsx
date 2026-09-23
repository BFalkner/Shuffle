import { Link } from 'react-router'
import { useTitle } from '../hooks/useTitle'

export default function NotFound() {
  useTitle('Page not found')
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.4rem', lineHeight: 1.6 }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', margin: 0 }}>Page not found</h1>
      <p>
        <Link to="/">Back to the start</Link>
      </p>
    </div>
  )
}
