import { Link } from 'react-router-dom'

const pages = [
  ['Dashboard', '/dashboard'], ['My items', '/inventory'], ['Browse items', '/browse'],
  ['Borrow request', '/borrow-request'], ['Lending approval', '/lending-approval'],
  ['Loan details', '/loan-details'], ['Reminder email', '/reminder-email'],
  ['Return confirmation', '/return-confirmation'], ['Reputation', '/reputation'],
  ['Mobile view', '/mobile'],
]

export default function PagePlaceholder({ title, description }) {
  return (
    <main className="placeholder-page">
      <Link className="placeholder-home" to="/">← Back to Lendr</Link>
      <span className="placeholder-kicker">LENDR PAGE SCAFFOLD</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <p className="placeholder-note">This screen is ready for its layout and interactions.</p>
      <nav className="placeholder-nav" aria-label="Page scaffolds">
        {pages.map(([label, to]) => <Link key={to} to={to}>{label}</Link>)}
      </nav>
    </main>
  )
}
