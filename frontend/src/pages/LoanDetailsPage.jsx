import { useEffect, useMemo, useRef, useState } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { fadeInCards } from '../lib/fadeInCards.js'
import { ArrowLeftRight, CalendarDays, CircleAlert, PackageOpen, SearchX } from 'lucide-react'
import { countBy, orderBy } from 'lodash-es'
import {
  endOfMonth,
  endOfWeek,
  getLocalTimeZone,
  parseDate,
  today as todayDate,
} from '@internationalized/date'
import { toast } from 'sonner'
import AppShell from '../components/AppShell.jsx'
import AppLoader from '../components/AppLoader.jsx'
import Avatar from '../components/Avatar.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import EmptyState from '../components/EmptyState.jsx'
import DueDateMenu from '../components/DueDateMenu.jsx'
import FilterMenu from '../components/FilterMenu.jsx'
import SearchField from '../components/SearchField.jsx'
import ViewSwitch from '../components/ViewSwitch.jsx'
import { apiFetch } from '../lib/api.js'
import '../styles/pages/loan-details.css'

// Badge labels for the filter menu, open loans first with the ones needing action on top
const STATUS_LABELS = ['Overdue', 'Awaiting confirmation', 'Active', 'Completed']
// Requests that were never approved live on Borrow Requests instead
const LOAN_STATUSES = ['approved', 'returned', 'confirmed']
// Custom row starts at two weeks, a common loan length
const ANY_DUE_DATE = { range: 'any', amount: 2, unit: 'weeks' }

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
  if (
    loan.status === 'approved' &&
    new Date(`${String(loan.dueDate).slice(0, 10)}T23:59:59`) < new Date()
  ) {
    return { id: 'overdue', label: 'Overdue' }
  }
  if (loan.status === 'approved') return { id: 'active', label: 'Active' }
  if (loan.status === 'returned') return { id: 'returned', label: 'Awaiting confirmation' }
  return { id: 'completed', label: 'Completed' }
}

function isLoan(loan) {
  return LOAN_STATUSES.includes(loan.status)
}

function matchesStatuses(loan, selectedStatuses) {
  return selectedStatuses.size === 0 || selectedStatuses.has(getStatus(loan).label)
}

function isFinished(loan) {
  return loan.status === 'confirmed'
}

// Last day a loan can be due and still match the due date filter
function dueCutoff({ range, amount, unit }, today) {
  if (range === 'week') return endOfWeek(today, navigator.language)
  if (range === 'month') return endOfMonth(today)
  return today.add({ [unit]: amount })
}

// Overdue loans fall out since their due date has passed
function matchesDueDate(loan, dueFilter) {
  if (dueFilter.range === 'any') return true
  if (isFinished(loan)) return false
  const today = todayDate(getLocalTimeZone())
  const dueDate = parseDate(String(loan.dueDate).slice(0, 10))
  return dueDate.compare(today) >= 0 && dueDate.compare(dueCutoff(dueFilter, today)) <= 0
}

function loanTime(loan) {
  return new Date(loan.dueDate || loan.createdAt || 0).getTime()
}

// Open loans first by soonest due date so overdue ones lead, then completed loans latest first
function sortLoans(loans) {
  return orderBy(loans, [
    isFinished,
    (loan) => (isFinished(loan) ? -loanTime(loan) : loanTime(loan)),
  ])
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
      ? loan.status === 'approved' && { id: 'return', label: 'Return' }
      : loan.status === 'returned' && { id: 'confirm', label: 'Confirm' }

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
        <div className="loan-card-title-wrap">
          <h2>{loan.item?.name || 'Deleted item'}</h2>
          <span className={`loan-status status-${status.id}`}>
            {status.id === 'overdue' && <CircleAlert size={13} />}
            {status.label}
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
  const [direction, setDirection] = useState('borrowed')
  const [selectedStatuses, setSelectedStatuses] = useState(new Set())
  const [dueFilter, setDueFilter] = useState(ANY_DUE_DATE)
  const [query, setQuery] = useState('')
  const [loans, setLoans] = useState({ borrowed: [], lent: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionTarget, setActionTarget] = useState(null)
  const [acting, setActing] = useState(false)
  const loadSequence = useRef(0)
  const [listRef] = useAutoAnimate(fadeInCards)

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
    return sortLoans(matchingLoans)
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
          onCancel={() => setActionTarget(null)}
          onConfirm={updateLoan}
        />
      </main>
    </AppShell>
  )
}
