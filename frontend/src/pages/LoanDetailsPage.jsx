import { useEffect, useMemo, useRef, useState } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { fadeInCards } from '../lib/fadeInCards.js'
import { ArrowLeftRight, CalendarDays, PackageOpen, SearchX } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { countBy, orderBy } from 'lodash-es'
import { toast } from 'sonner'
import AppShell from '../components/AppShell.jsx'
import AppLoader from '../components/AppLoader.jsx'
import Avatar from '../components/Avatar.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import EmptyState from '../components/EmptyState.jsx'
import DueDateMenu from '../components/DueDateMenu.jsx'
import FilterMenu from '../components/FilterMenu.jsx'
import LoanStatus from '../components/LoanStatus.jsx'
import SearchField from '../components/SearchField.jsx'
import ViewSwitch from '../components/ViewSwitch.jsx'
import { apiFetch } from '../lib/api.js'
import { refreshPendingActions } from '../lib/pendingActions.js'
import { ANY_DUE_DATE, dueDateFromParam, dueDateParam, matchesDueDate } from '../lib/dueDate.js'
import { getStatus, isFinished } from '../lib/loanStatus.js'
import { useFiltersInUrl } from '../lib/useFiltersInUrl.js'
import { useHighlightedLoan } from '../lib/useHighlightedLoan.js'
import '../styles/pages/loan-details.css'

// Badge labels for the filter menu, open loans first with the ones needing action on top
const STATUS_LABELS = ['Overdue', 'Awaiting confirmation', 'Active', 'Completed']
// Requests that were never approved live on Borrow Requests instead
const LOAN_STATUSES = ['approved', 'returned', 'confirmed']

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

function isLoan(loan) {
  return LOAN_STATUSES.includes(loan.status)
}

function matchesStatuses(loan, selectedStatuses) {
  return selectedStatuses.size === 0 || selectedStatuses.has(getStatus(loan).label)
}

function loanTime(loan) {
  return new Date(loan.dueDate || loan.createdAt || 0).getTime()
}

const STATUS_ORDER = {
  lent: ['returned', 'overdue', 'active', 'completed'],
  borrowed: ['overdue', 'active', 'returned', 'completed'],
}

function sortLoans(loans, direction) {
  return orderBy(loans, [
    (loan) => STATUS_ORDER[direction].indexOf(getStatus(loan).id),
    (loan) => (isFinished(loan) ? -loanTime(loan) : loanTime(loan)),
  ])
}

function loanFilterParams({ direction, query, selectedStatuses, dueFilter }) {
  const params = new URLSearchParams()
  if (direction === 'lent') params.set('view', 'lent')
  if (query) params.set('q', query)
  for (const status of selectedStatuses) {
    params.append('status', status)
  }
  if (dueFilter.range !== 'any') params.set('due', dueDateParam(dueFilter))
  return params
}

function otherPerson(loan, direction) {
  return direction === 'borrowed' ? loan.owner : loan.borrower
}

function LoanCard({ loan, direction, isHighlighted, onAction }) {
  const person = otherPerson(loan, direction)
  const image = loan.item?.photos?.[0]
  const action =
    direction === 'borrowed'
      ? loan.status === 'approved' && { id: 'return', label: 'Return' }
      : loan.status === 'returned' && { id: 'confirm', label: 'Confirm' }

  return (
    <article id={`loan-${loan._id}`} className={`loan-card${isHighlighted ? ' highlighted' : ''}`}>
      <div className="loan-card-photo">
        {image ? (
          <img src={image} alt="" loading="lazy" />
        ) : (
          <PackageOpen size={26} aria-hidden="true" />
        )}
      </div>
      <div className="loan-card-main">
        <div className="loan-card-title-wrap">
          <h2>{loan.item?.name || 'Deleted item'}</h2>
          <LoanStatus loan={loan} />
        </div>
        <div className="loan-card-person">
          <Avatar
            photo={person?.photo}
            name={person?.displayName || 'Community member'}
            username={person?.username || 'community'}
            className="avatar-small"
          />
          <strong>{personName(person)}</strong>
        </div>
        <div className="loan-card-meta">
          <CalendarDays size={14} />
          Due {formatDate(loan.dueDate)}
        </div>
      </div>
      {action && (
        <div className="loan-card-actions">
          <button
            className="action-button action-button-teal-tint"
            type="button"
            onClick={() => onAction({ loan, action: action.id, direction })}
          >
            {action.label}
          </button>
        </div>
      )}
    </article>
  )
}

// Clear button when filters match nothing, like Browse
function LoansEmptyState({ direction, isFiltering, onClearFilters }) {
  if (isFiltering) {
    return (
      <EmptyState icon={SearchX} title="No matching loans">
        <button
          type="button"
          className="action-button action-button-neutral"
          onClick={onClearFilters}
        >
          Clear filters
        </button>
      </EmptyState>
    )
  }
  return (
    <EmptyState icon={ArrowLeftRight} title="No loans yet">
      <span>
        {direction === 'borrowed'
          ? 'Requests you send show up here once they’re approved.'
          : 'Requests you approve show up here.'}
      </span>
    </EmptyState>
  )
}

export default function LoanDetailsPage() {
  const [searchParams] = useSearchParams()
  const [direction, setDirection] = useState(searchParams.get('view') ?? 'borrowed')
  const [selectedStatuses, setSelectedStatuses] = useState(
    () => new Set(searchParams.getAll('status')),
  )
  const [dueFilter, setDueFilter] = useState(() => dueDateFromParam(searchParams.get('due')))
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [loans, setLoans] = useState({ borrowed: [], lent: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionTarget, setActionTarget] = useState(null)
  const [acting, setActing] = useState(false)
  const loadSequence = useRef(0)
  const [listRef] = useAutoAnimate(fadeInCards)
  const highlightId = useHighlightedLoan(!loading)
  const viewParam = searchParams.get('view') ?? 'borrowed'

  // A notification can switch the view while the page is already open
  useEffect(() => {
    setDirection(viewParam)
  }, [viewParam])

  const loadLoans = async () => {
    const sequence = ++loadSequence.current
    setError('')
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
    loadLoans()
  }, [])

  const borrowedLoans = loans.borrowed.filter(isLoan)
  const lentLoans = loans.lent.filter(isLoan)
  const allCurrent = direction === 'borrowed' ? borrowedLoans : lentLoans
  const visibleLoans = useMemo(() => {
    const matchingLoans = allCurrent
      .filter((loan) => matchesStatuses(loan, selectedStatuses))
      .filter((loan) => matchesDueDate(loan, dueFilter))
      .filter((loan) =>
        `${loan.item?.name || ''} ${personName(otherPerson(loan, direction))}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    return sortLoans(matchingLoans, direction)
  }, [allCurrent, selectedStatuses, dueFilter, query, direction])
  const statusCounts = useMemo(
    () => countBy(allCurrent, (loan) => getStatus(loan).label),
    [allCurrent],
  )
  // Skip statuses with no loans, but keep ticked ones so they can still be unticked
  const menuStatuses = STATUS_LABELS.filter(
    (label) => statusCounts[label] || selectedStatuses.has(label),
  )
  const isFiltering = query || selectedStatuses.size > 0 || dueFilter.range !== 'any'
  useFiltersInUrl(loanFilterParams({ direction, query, selectedStatuses, dueFilter }))

  const updateLoan = async () => {
    if (!actionTarget) return
    const { loan, action, direction: loanDirection } = actionTarget
    setActing(true)
    try {
      await apiFetch(`loans/${loan._id}/${action}`, { method: 'PATCH' })
      const nextStatus = action === 'return' ? 'returned' : 'confirmed'
      setLoans((current) => ({
        ...current,
        [loanDirection]: current[loanDirection].map((entry) =>
          entry._id === loan._id ? { ...entry, status: nextStatus } : entry,
        ),
      }))
      const messages = {
        return: 'Return marked. The lender will confirm it.',
        confirm: 'Return confirmed.',
      }
      refreshPendingActions()
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
    }[selectedAction] || []

  return (
    <AppShell>
      <main className="loans-page">
        <header className="page-heading">
          <div>
            <h1>My Loans</h1>
            <p>Keep track of items you’ve borrowed and shared.</p>
          </div>
        </header>

        <div className="loans-toolbar">
          <ViewSwitch
            label="Loans to show"
            options={[
              {
                id: 'borrowed',
                label: (
                  <>
                    Borrowed<small>{borrowedLoans.length}</small>
                  </>
                ),
              },
              {
                id: 'lent',
                label: (
                  <>
                    Lent<small>{lentLoans.length}</small>
                  </>
                ),
              },
            ]}
            selected={direction}
            onChange={setDirection}
          />
        </div>
        <SearchField value={query} onChange={setQuery} placeholder="Search loans">
          <FilterMenu
            options={menuStatuses}
            counts={statusCounts}
            selected={selectedStatuses}
            onChange={setSelectedStatuses}
            allLabel="All statuses"
            pluralLabel="statuses"
            label="status"
          />
          <DueDateMenu value={dueFilter} onChange={setDueFilter} />
        </SearchField>

        {error && (
          <p className="loans-error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <AppLoader inline label="Loading your loans…" />
        ) : visibleLoans.length ? (
          <section className="loans-list" aria-label={`${direction} loans`} ref={listRef}>
            {visibleLoans.map((loan) => (
              <LoanCard
                key={loan._id}
                loan={loan}
                direction={direction}
                isHighlighted={loan._id === highlightId}
                onAction={setActionTarget}
              />
            ))}
          </section>
        ) : (
          <LoansEmptyState
            direction={direction}
            isFiltering={isFiltering}
            onClearFilters={() => {
              setQuery('')
              setSelectedStatuses(new Set())
              setDueFilter(ANY_DUE_DATE)
            }}
          />
        )}

        <ConfirmDialog
          isOpen={actionTarget !== null}
          isPending={acting}
          title={actionCopy[0]}
          text={actionCopy[1]}
          cancelLabel="Keep loan"
          confirmLabel={actionCopy[2]}
          destructive={false}
          onCancel={() => setActionTarget(null)}
          onConfirm={updateLoan}
        />
      </main>
    </AppShell>
  )
}
