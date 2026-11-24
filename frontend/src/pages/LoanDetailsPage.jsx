import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  PackageOpen,
  RefreshCw,
  RotateCcw,
  Search,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import AppShell from '../components/AppShell.jsx'
import AppLoader from '../components/AppLoader.jsx'
import Avatar from '../components/Avatar.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import EmptyState from '../components/EmptyState.jsx'
import SourceSwitch from '../components/SourceSwitch.jsx'
import ViewSwitch from '../components/ViewSwitch.jsx'
import { apiFetch } from '../lib/api.js'
import { MOCK_LOANS } from '../lib/mockLoans.js'
import '../styles/pages/loan-details.css'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'pending', label: 'Pending' },
  { id: 'history', label: 'History' },
]

function cloneMockLoans() {
  return {
    borrowed: MOCK_LOANS.borrowed.map((loan) => ({ ...loan })),
    lent: MOCK_LOANS.lent.map((loan) => ({ ...loan })),
  }
}

function personName(person) {
  return person?.displayName || (person?.username ? `@${person.username}` : 'Community member')
}

function formatDate(value) {
  if (!value) return 'Date unavailable'
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function getStatus(loan) {
  if (loan.status === 'requested') return { id: 'pending', label: 'Pending' }
  if (
    loan.status === 'approved' &&
    new Date(`${String(loan.dueDate).slice(0, 10)}T23:59:59`) < new Date()
  ) {
    return { id: 'overdue', label: 'Overdue' }
  }
  if (loan.status === 'approved') return { id: 'active', label: 'Active' }
  if (loan.status === 'returned') return { id: 'returned', label: 'Return pending confirmation' }
  if (loan.status === 'confirmed') return { id: 'completed', label: 'Completed' }
  if (loan.status === 'rejected') return { id: 'declined', label: 'Declined' }
  if (loan.status === 'cancelled') return { id: 'cancelled', label: 'Cancelled' }
  return { id: 'unknown', label: loan.status || 'Unknown' }
}

function matchesFilter(loan, filter) {
  if (filter === 'all') return true
  if (filter === 'in-progress') return ['approved', 'returned'].includes(loan.status)
  if (filter === 'pending') return loan.status === 'requested'
  return ['confirmed', 'rejected', 'cancelled'].includes(loan.status)
}

function otherPerson(loan, direction) {
  return direction === 'borrowed' ? loan.owner : loan.borrower
}

function LoanCard({ loan, direction, onAction }) {
  const status = getStatus(loan)
  const person = otherPerson(loan, direction)
  const image = loan.item?.photos?.[0]
  const action =
    direction === 'borrowed'
      ? loan.status === 'approved'
        ? { id: 'return', label: 'Mark as returned', icon: RotateCcw }
        : loan.status === 'requested'
          ? { id: 'cancel', label: 'Cancel request', icon: CircleAlert }
          : null
      : loan.status === 'returned'
        ? { id: 'confirm', label: 'Confirm return', icon: Check }
        : loan.status === 'requested'
          ? { id: 'review', label: 'Review request', icon: BookOpen }
          : null

  return (
    <article className="loan-card">
      <div className="loan-card-photo">
        {image ? (
          <img src={image} alt="" loading="lazy" />
        ) : (
          <PackageOpen size={26} aria-hidden="true" />
        )}
      </div>
      <div className="loan-card-main">
        <div className="loan-card-heading">
          <div className="loan-card-title-wrap">
            <h2>{loan.item?.name || 'Deleted item'}</h2>
            <span className={`loan-status status-${status.id}`}>
              {status.id === 'overdue' && <CircleAlert size={13} />}
              {status.label}
            </span>
          </div>
          <span className={`loan-direction direction-${direction}`}>
            {direction === 'borrowed' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
            {direction === 'borrowed' ? 'Borrowed' : 'Lent'}
          </span>
        </div>
        <div className="loan-card-person">
          <Avatar
            photo={person?.photo}
            name={person?.displayName || 'Community member'}
            username={person?.username || 'community'}
            className="avatar-small"
          />
          <span>
            {direction === 'borrowed' ? 'From' : 'To'} <strong>{personName(person)}</strong>
          </span>
        </div>
        <div className="loan-card-meta">
          <span>
            <CalendarDays size={14} />
            Due {formatDate(loan.dueDate)}
          </span>
          {loan.createdAt && (
            <span>
              <Clock3 size={14} />
              Started {formatDate(loan.createdAt)}
            </span>
          )}
        </div>
        {action &&
          (action.id === 'review' ? (
            <Link className="loan-action loan-action-secondary" to="/borrow-request">
              <BookOpen size={15} />
              {action.label}
            </Link>
          ) : (
            <button
              className={`loan-action${action.id === 'return' || action.id === 'confirm' ? ' loan-action-primary' : ' loan-action-secondary'}`}
              type="button"
              onClick={() => onAction({ loan, action: action.id, direction })}
            >
              <action.icon size={15} />
              {action.label}
            </button>
          ))}
      </div>
    </article>
  )
}

export default function LoanDetailsPage() {
  const [source, setSource] = useState(() => localStorage.getItem('lendrLoansSource') || 'mock')
  const [direction, setDirection] = useState('borrowed')
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [loans, setLoans] = useState(cloneMockLoans)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionTarget, setActionTarget] = useState(null)
  const [acting, setActing] = useState(false)
  const loadSequence = useRef(0)

  const loadLoans = async (dataSource = source) => {
    const sequence = ++loadSequence.current
    setError('')
    if (dataSource === 'mock') {
      setLoans(cloneMockLoans())
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [borrowed, lent] = await Promise.all([
        apiFetch('loans/borrowed'),
        apiFetch('loans/lent'),
      ])
      if (sequence === loadSequence.current)
        setLoans({ borrowed: borrowed || [], lent: lent || [] })
    } catch (err) {
      if (sequence === loadSequence.current) {
        setError(err.message || 'Could not load your loans.')
        setLoans({ borrowed: [], lent: [] })
      }
    } finally {
      if (sequence === loadSequence.current) setLoading(false)
    }
  }

  useEffect(() => {
    localStorage.setItem('lendrLoansSource', source)
    loadLoans(source)
  }, [source])

  const allCurrent = loans[direction] || []
  const visibleLoans = useMemo(
    () =>
      allCurrent
        .filter((loan) => matchesFilter(loan, filter))
        .filter((loan) =>
          `${loan.item?.name || ''} ${personName(otherPerson(loan, direction))}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .sort((a, b) => {
          const aDate = new Date(a.dueDate || a.createdAt || 0).getTime()
          const bDate = new Date(b.dueDate || b.createdAt || 0).getTime()
          return aDate - bDate
        }),
    [allCurrent, filter, query, direction],
  )

  const counts = useMemo(
    () =>
      Object.fromEntries(
        FILTERS.map(({ id }) => [id, allCurrent.filter((loan) => matchesFilter(loan, id)).length]),
      ),
    [allCurrent],
  )

  const updateLoan = async () => {
    if (!actionTarget) return
    const { loan, action, direction: loanDirection } = actionTarget
    setActing(true)
    try {
      if (source === 'backend') {
        const endpoint =
          action === 'return' ? 'return' : action === 'confirm' ? 'confirm' : 'cancel'
        await apiFetch(`loans/${loan._id}/${endpoint}`, { method: 'PATCH' })
      }
      const nextStatus =
        action === 'return' ? 'returned' : action === 'confirm' ? 'confirmed' : 'cancelled'
      setLoans((current) => ({
        ...current,
        [loanDirection]: current[loanDirection].map((entry) =>
          entry._id === loan._id ? { ...entry, status: nextStatus } : entry,
        ),
      }))
      const messages = {
        return: 'Return marked. The lender will confirm it.',
        confirm: 'Return confirmed.',
        cancel: 'Borrow request cancelled.',
      }
      toast.success(messages[action])
      setActionTarget(null)
    } catch (err) {
      toast.error(err.message || 'Could not update this loan.')
    } finally {
      setActing(false)
    }
  }

  const selectedAction = actionTarget?.action
  const actionCopy =
    {
      return: [
        'Mark this item as returned?',
        `This lets ${personName(actionTarget?.loan.owner)} know you’ve returned ${actionTarget?.loan.item?.name || 'the item'}. The lender still needs to confirm the return.`,
        'Mark returned',
      ],
      confirm: [
        'Confirm this return?',
        `This confirms that ${actionTarget?.loan.item?.name || 'the item'} has been returned.`,
        'Confirm return',
      ],
      cancel: [
        'Cancel this request?',
        `Your request to borrow ${actionTarget?.loan.item?.name || 'this item'} will be withdrawn.`,
        'Cancel request',
      ],
    }[selectedAction] || []

  return (
    <AppShell>
      <main className="loans-page">
        <header className="page-heading loans-heading">
          <div>
            <h1>My Loans</h1>
            <p>Keep track of items you’ve borrowed and shared.</p>
          </div>
          <div className="loans-heading-actions">
            <button
              className="loans-refresh"
              type="button"
              onClick={() => loadLoans()}
              disabled={loading}
              aria-label="Refresh loans"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <SourceSwitch source={source} onChange={setSource} label="Loans data source" />
          </div>
        </header>

        <section className="loans-summary" aria-label="Loan summary">
          <div>
            <span className="loans-summary-icon borrowed">
              <ArrowDownLeft size={18} />
            </span>
            <span>
              <small>Borrowed</small>
              <strong>{loans.borrowed.length}</strong>
            </span>
          </div>
          <div>
            <span className="loans-summary-icon lent">
              <ArrowUpRight size={18} />
            </span>
            <span>
              <small>Lent</small>
              <strong>{loans.lent.length}</strong>
            </span>
          </div>
          <div>
            <span className="loans-summary-icon pending">
              <Clock3 size={18} />
            </span>
            <span>
              <small>Needs attention</small>
              <strong>
                {
                  [...loans.borrowed, ...loans.lent].filter((loan) =>
                    ['requested', 'returned'].includes(loan.status),
                  ).length
                }
              </strong>
            </span>
          </div>
        </section>

        <div className="loans-toolbar">
          <ViewSwitch
            label="Loans to show"
            options={[
              {
                id: 'borrowed',
                label: (
                  <>
                    <ArrowDownLeft size={15} /> Borrowed <small>{loans.borrowed.length}</small>
                  </>
                ),
              },
              {
                id: 'lent',
                label: (
                  <>
                    <ArrowUpRight size={15} /> Lent <small>{loans.lent.length}</small>
                  </>
                ),
              },
            ]}
            selected={direction}
            onChange={setDirection}
          />
          <label className="loans-search">
            <Search size={16} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search loans"
              aria-label="Search loans"
            />
          </label>
        </div>

        <ViewSwitch
          className="loans-filters"
          label="Filter loans"
          options={FILTERS.map(({ id, label }) => ({
            id,
            label: (
              <>
                {label}
                <small>{counts[id]}</small>
              </>
            ),
          }))}
          selected={filter}
          onChange={setFilter}
        />

        {error && (
          <p className="loans-error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <AppLoader inline label="Loading your loans…" />
        ) : visibleLoans.length ? (
          <section className="loans-list" aria-label={`${direction} loans`}>
            {visibleLoans.map((loan) => (
              <LoanCard
                key={loan._id}
                loan={loan}
                direction={direction}
                onAction={setActionTarget}
              />
            ))}
          </section>
        ) : (
          <EmptyState
            icon={PackageOpen}
            title={
              query
                ? 'No matching loans'
                : filter === 'all'
                  ? `No ${direction} loans yet`
                  : `No ${filter === 'in-progress' ? 'in-progress' : filter} loans`
            }
          >
            <span>
              {query
                ? 'Try a different name or item.'
                : direction === 'borrowed'
                  ? 'Browse shared items to find something you need.'
                  : 'Your lending activity will show up here.'}
            </span>
            {direction === 'borrowed' && !query && filter === 'all' && (
              <Link to="/browse" className="loans-browse-link">
                Browse items
              </Link>
            )}
          </EmptyState>
        )}

        <ConfirmDialog
          isOpen={actionTarget !== null}
          isPending={acting}
          title={actionCopy[0]}
          text={actionCopy[1]}
          cancelLabel="Keep loan"
          confirmLabel={actionCopy[2]}
          onCancel={() => setActionTarget(null)}
          onConfirm={updateLoan}
        />
      </main>
    </AppShell>
  )
}
