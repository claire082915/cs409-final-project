import { Link } from 'react-router-dom'

export default function Logo({ light = false }) {
  return (
    <Link className={`logo${light ? ' logo-light' : ''}`} to="/" aria-label="Lendr home">
      <span className="logo-mark" aria-hidden="true">
        <span />
      </span>
      <span>Lendr</span>
    </Link>
  )
}
