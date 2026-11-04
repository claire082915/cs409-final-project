import { Link } from 'react-router-dom'

export default function Button({
  children,
  href = '#get-started',
  to,
  variant = 'primary',
  ...props
}) {
  const className = `button button-${variant}`
  const handleAnchorClick = (event) => {
    props.onClick?.(event)
    if (event.defaultPrevented || !href.startsWith('#')) return
    event.preventDefault()
    document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' })
  }
  return to ? (
    <Link className={className} to={to} {...props}>
      {children}
    </Link>
  ) : (
    <a className={className} href={href} {...props} onClick={handleAnchorClick}>
      {children}
    </a>
  )
}
