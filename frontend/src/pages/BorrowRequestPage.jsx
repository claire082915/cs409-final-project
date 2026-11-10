import { useEffect, useState } from 'react'
import { CalendarDays, Check, Clock3, PackageOpen, RefreshCw, UserRound, X } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import '../styles/pages/borrow-request.css'

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'https://lendr-api.onrender.com/api'
).replace(/\/$/, '')
const MOCK_REQUESTS = [
  {
    _id: 'mock-request-1',
    status: 'requested',
    dueDate: '2026-11-18',
    createdAt: '2026-11-09',
    borrower: { displayName: 'Rachel Li', username: 'rachel' },
    item: {
      name: 'MacBook Pro',
      photos: [
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80',
      ],
      description: '13-inch laptop, great for coursework and projects.',
    },
    message: 'Hi! I’d love to borrow this. I’ll take good care of it!',
  },
  {
    _id: 'mock-request-2',
    status: 'requested',
    dueDate: '2026-11-20',
    createdAt: '2026-11-08',
    borrower: { displayName: 'Ethan Moore', username: 'ethan' },
    item: {
      name: '2-person Camping Tent',
      photos: [
        'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=600&q=80',
      ],
      description: 'Lightweight tent with rain fly. Easy to set up.',
    },
    message: 'Could I borrow this for a weekend camping trip? I can pick it up Friday.',
  },
  {
    _id: 'mock-request-3',
    status: 'requested',
    dueDate: '2026-11-16',
    createdAt: '2026-11-07',
    borrower: { displayName: 'Priya Shah', username: 'priya' },
    item: {
      name: 'Wireless Earbuds',
      photos: [
        'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=600&q=80',
      ],
      description: 'Noise-cancelling earbuds with charging case.',
    },
    message: 'I need these for a long study session. Thank you!',
  },
]

const dateLabel = (value) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(`${String(value).slice(0, 10)}T12:00:00`))
    : 'Not set'
const borrowerName = (borrower) =>
  borrower?.displayName || (borrower?.username ? `@${borrower.username}` : 'Community member')

export default function BorrowRequestPage() {
  const [source, setSource] = useState(() => localStorage.getItem('lendrRequestSource') || 'mock')
  const [requests, setRequests] = useState(MOCK_REQUESTS)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadRequests = async (dataSource = source) => {
    setError('')
    if (dataSource === 'mock') {
      setRequests(MOCK_REQUESTS)
      return
    }
    const token = sessionStorage.getItem('lendrIdToken')
    if (!token) {
      setRequests([])
      setError('Sign in to review borrower requests.')
      return
    }
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/loans/lent?status=requested`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.message || 'Could not load borrow requests.')
      setRequests(Array.isArray(body.data) ? body.data : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    localStorage.setItem('lendrRequestSource', source)
    loadRequests(source)
  }, [source])

  const handleDecision = async (decision, event) => {
    event.preventDefault()
    if (!selected) return
    const dueDate = decision === 'approve' ? new FormData(event.currentTarget).get('dueDate') : null
    setActing(true)
    setError('')
    try {
      if (source === 'backend') {
        const token = sessionStorage.getItem('lendrIdToken')
        const response = await fetch(`${API_BASE}/loans/${selected._id}/${decision}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          ...(decision === 'approve' ? { body: JSON.stringify({ dueDate }) } : {}),
        })
        const body = response.status === 204 ? {} : await response.json()
        if (!response.ok) throw new Error(body.message || `Could not ${decision} this request.`)
      }
      setRequests((current) => current.filter((request) => request._id !== selected._id))
      setNotice(
        decision === 'approve'
          ? `Request from ${borrowerName(selected.borrower)} approved.`
          : `Request from ${borrowerName(selected.borrower)} declined.`,
      )
      setSelected(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setActing(false)
    }
  }

  return (
    <AppShell>
      <main className="requests-page">
        <header className="requests-heading">
          <div>
            <p className="requests-eyebrow">YOUR LENDING</p>
            <h1>Borrow requests</h1>
            <p>Review requests from your community and decide what works for you.</p>
          </div>
          <div className="requests-heading-actions">
            <div className="requests-source" aria-label="Request data source">
              <span>Data</span>
              <button
                type="button"
                className={source === 'mock' ? 'active' : ''}
                onClick={() => setSource('mock')}
              >
                Mock
              </button>
              <button
                type="button"
                className={source === 'backend' ? 'active' : ''}
                onClick={() => setSource('backend')}
              >
                Backend
              </button>
            </div>
            <button
              className="requests-refresh"
              type="button"
              onClick={() => loadRequests()}
              disabled={loading}
            >
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>
        </header>
        <section className="requests-panel">
          <div className="requests-panel-heading">
            <div>
              <h2>Needs your response</h2>
              <p>Approve a request to lend the item, or decline it.</p>
            </div>
            <span className="requests-count">{requests.length} pending</span>
          </div>
          {error && (
            <p className="requests-alert error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="requests-alert success" role="status">
              <Check size={15} />
              {notice}
              <button type="button" onClick={() => setNotice('')} aria-label="Dismiss">
                <X size={14} />
              </button>
            </p>
          )}
          {loading ? (
            <div className="requests-empty">Loading requests…</div>
          ) : requests.length === 0 ? (
            <div className="requests-empty">
              <Check size={27} />
              <strong>You’re all caught up</strong>
              <span>New borrow requests will show up here.</span>
            </div>
          ) : (
            <div className="request-list">
              {requests.map((request) => (
                <article className="request-card" key={request._id}>
                  <div className="request-person-avatar">
                    <UserRound size={23} />
                  </div>
                  <div className="request-card-main">
                    <div className="request-card-top">
                      <div>
                        <h3>{borrowerName(request.borrower)}</h3>
                        <p>
                          Wants to borrow your <strong>{request.item?.name || 'item'}</strong>
                        </p>
                      </div>
                      <span className="request-pending">
                        <Clock3 size={13} />
                        Pending
                      </span>
                    </div>
                    <p className="request-card-message">
                      {request.message || 'No message included.'}
                    </p>
                    <div className="request-card-meta">
                      <span>
                        <PackageOpen size={14} />
                        Return by {dateLabel(request.dueDate)}
                      </span>
                      <span>Requested {dateLabel(request.createdAt)}</span>
                    </div>
                    <button
                      type="button"
                      className="request-review-button"
                      onClick={() => {
                        setError('')
                        setSelected(request)
                      }}
                    >
                      Review request
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        {selected && (
          <div
            className="approval-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !acting) setSelected(null)
            }}
          >
            <section
              className="approval-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="approval-title"
            >
              <button
                className="approval-close"
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close"
                disabled={acting}
              >
                <X size={18} />
              </button>
              <div className="approval-borrower">
                <div className="request-person-avatar large">
                  <UserRound size={27} />
                </div>
                <div>
                  <p className="requests-eyebrow">BORROW REQUEST</p>
                  <h2 id="approval-title">{borrowerName(selected.borrower)}</h2>
                  <p>
                    Wants to borrow your <strong>{selected.item?.name || 'item'}</strong>
                  </p>
                  {selected.message && <blockquote>“{selected.message}”</blockquote>}
                </div>
              </div>
              <form onSubmit={(event) => handleDecision('approve', event)}>
                <label className="approval-date-label">
                  Set return date
                  <span>
                    <CalendarDays size={17} />
                    <input
                      name="dueDate"
                      type="date"
                      defaultValue={String(selected.dueDate).slice(0, 10)}
                      min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                      required
                    />
                  </span>
                </label>
                <div className="approval-condition">
                  <h3>Item condition at lending</h3>
                  <p>Listing photos for reference. Condition photo uploads aren’t supported yet.</p>
                  <div className="approval-photo-row">
                    {(selected.item?.photos || []).map((photo) => (
                      <img
                        key={photo}
                        src={photo}
                        alt={`${selected.item?.name || 'Item'} listing`}
                      />
                    ))}
                    {!selected.item?.photos?.length && (
                      <div className="approval-photo-placeholder">
                        <PackageOpen size={25} />
                        No item photos
                      </div>
                    )}
                  </div>
                </div>
                <div className="approval-actions">
                  <button
                    type="button"
                    className="approval-decline"
                    disabled={acting}
                    onClick={(event) => handleDecision('reject', event)}
                  >
                    {acting ? 'Please wait…' : 'Decline'}
                  </button>
                  <button type="submit" className="approval-approve" disabled={acting}>
                    {acting ? 'Please wait…' : 'Approve'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </AppShell>
  )
}
