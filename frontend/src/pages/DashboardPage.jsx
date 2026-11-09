import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, CheckCircle2, CircleAlert, Clock3, HandCoins, Package, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import '../styles/pages/dashboard.css'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://lendr-api.onrender.com/api').replace(/\/$/, '')

function readToken() {
  // The login flow can store its Firebase ID token here; it is refreshed on every page load.
  return window.sessionStorage.getItem('lendrIdToken')
}

async function getLoans(path, token) {
  const response = await fetch(`${API_BASE}/loans/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = response.status === 204 ? {} : await response.json()
  if (!response.ok) throw new Error(body.message || 'Could not load your loans.')
  return Array.isArray(body.data) ? body.data : []
}

function personName(user) {
  return user?.displayName || (user?.username ? `@${user.username}` : 'Someone')
}

function dateLabel(value) {
  if (!value) return 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function statusLabel(loan, now) {
  if (loan.status === 'requested') return 'Pending'
  if (loan.status === 'returned') return 'Returned'
  if (loan.status === 'confirmed') return 'Completed'
  if (loan.status === 'rejected') return 'Declined'
  if (loan.status === 'cancelled') return 'Cancelled'
  if (loan.status === 'approved' && new Date(loan.dueDate) < now) return 'Overdue'
  return loan.status === 'approved' ? 'Active' : loan.status
}

export default function DashboardPage() {
  const [loans, setLoans] = useState({ lent: [], borrowed: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasToken, setHasToken] = useState(Boolean(readToken()))

  const load = async () => {
    const token = readToken()
    setHasToken(Boolean(token))
    if (!token) {
      setLoading(false)
      setError('Sign in to see your lending and borrowing activity.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const [lent, borrowed] = await Promise.all([getLoans('lent', token), getLoans('borrowed', token)])
      setLoans({ lent, borrowed })
    } catch (err) {
      setError(err.message || 'Something went wrong while loading your dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const now = new Date()
  const summary = useMemo(() => {
    const activeLent = loans.lent.filter((loan) => loan.status === 'approved')
    const activeBorrowed = loans.borrowed.filter((loan) => loan.status === 'approved')
    const pending = loans.lent.filter((loan) => loan.status === 'requested').length
      + loans.borrowed.filter((loan) => loan.status === 'requested').length
    const overdue = [...loans.lent, ...loans.borrowed].filter((loan) =>
      loan.status === 'approved' && new Date(loan.dueDate) < now,
    ).length
    return { lent: activeLent.length, borrowed: activeBorrowed.length, pending, overdue }
  }, [loans, now])

  const activity = [...loans.lent.map((loan) => ({ ...loan, direction: 'lent' })),
    ...loans.borrowed.map((loan) => ({ ...loan, direction: 'borrowed' }))]
    .sort((a, b) => new Date(b.createdAt || b.approvedAt || 0) - new Date(a.createdAt || a.approvedAt || 0))
    .slice(0, 5)
  const nameLoan = loans.lent[0] || loans.borrowed[0]
  const greeting = nameLoan
    ? personName(nameLoan.direction === 'lent' ? nameLoan.owner : nameLoan.borrower).split(' ')[0]
    : 'there'

  const cards = [
    { label: 'Lent out', count: summary.lent, noun: 'items', icon: HandCoins, tone: 'orange', to: '/loan-details' },
    { label: 'Borrowed', count: summary.borrowed, noun: 'items', icon: BookOpen, tone: 'blue', to: '/loan-details' },
    { label: 'Pending requests', count: summary.pending, noun: summary.pending === 1 ? 'request' : 'requests', icon: Clock3, tone: 'teal', to: '/borrow-request' },
    { label: 'Overdue', count: summary.overdue, noun: 'items', icon: CircleAlert, tone: 'red', to: '/loan-details' },
  ]

  return (
    <AppShell>
    <main className="dashboard-page">
      <div className="dashboard-heading">
        <div><p className="dashboard-eyebrow">YOUR LENDR OVERVIEW</p><h1>Hi {greeting}!</h1>
          <p>Here’s what’s happening with your items.</p></div>
        <button className="dashboard-refresh" onClick={load} disabled={loading || !hasToken} aria-label="Refresh dashboard"><RefreshCw size={16} /> Refresh</button>
      </div>

      <section className="dashboard-stats" aria-label="Loan summary">
        {cards.map(({ label, count, noun, icon: Icon, tone, to }) => (
          <Link className={`dashboard-stat stat-${tone}`} to={to} key={label}>
            <span className="stat-icon"><Icon size={20} /></span>
            <span><strong>{label}</strong><small>{loading ? 'Loading…' : `${count} ${noun}`}</small></span>
            <ArrowRight className="stat-arrow" size={16} />
          </Link>
        ))}
      </section>

      <section className="dashboard-activity">
        <div className="activity-heading"><div><p className="dashboard-eyebrow">THE LATEST</p><h2>Recent activity</h2></div>
          <Link to="/loan-details">View all <ArrowRight size={15} /></Link></div>
        {error ? <div className="dashboard-message" role="status"><CircleAlert size={20} /><span>{error}{!hasToken && <small>Your signed-in session will provide access to this data.</small>}</span></div>
          : loading ? <div className="dashboard-message">Loading your recent loans…</div>
            : activity.length === 0 ? <div className="dashboard-empty"><Package size={25} /><strong>No activity yet</strong><span>Your loan requests and lending activity will show up here.</span><Link to="/browse">Browse items <ArrowRight size={14} /></Link></div>
              : <div className="activity-list">{activity.map((loan) => {
                const status = statusLabel(loan, now)
                const otherPerson = loan.direction === 'lent' ? loan.borrower : loan.owner
                return <Link to={`/loan-details`} className="activity-row" key={loan._id}>
                  <span className="activity-item-icon"><Package size={19} /></span>
                  <span className="activity-item-copy"><strong>{loan.item?.name || 'Deleted item'}</strong><small>{loan.direction === 'lent' ? 'Borrowed by' : 'Borrowed from'} {personName(otherPerson)}</small></span>
                  <span className="activity-due">{status === 'Active' || status === 'Overdue' ? `Due ${dateLabel(loan.dueDate)}` : dateLabel(loan.createdAt)}</span>
                  <span className={`activity-status status-${status.toLowerCase()}`}>{status === 'Completed' && <CheckCircle2 size={13} />}{status}</span>
                </Link>
              })}</div>}
      </section>
    </main>
    </AppShell>
  )
}
