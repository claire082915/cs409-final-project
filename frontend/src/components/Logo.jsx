import { Link } from 'react-router-dom'

export default function Logo({ light = false }) {
  return (
    <Link className={`logo${light ? ' logo-light' : ''}`} to="/" aria-label="Lendr home">
      <img className="logo-mark" src="/favicon.svg" alt="" aria-hidden="true" />
      <span>Lendr</span>
    </Link>
  )
}
