import { useEffect, useState } from 'react'
import { CalendarCheck, ChevronRight, CircleCheck, History, PackageOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { orderBy } from 'lodash-es'
import { useAuth } from '../auth/AuthContext.jsx'
import AppShell from '../components/AppShell.jsx'
import AppLoader from '../components/AppLoader.jsx'
import DueDateMenu from '../components/DueDateMenu.jsx'
import EmptyState from '../components/EmptyState.jsx'
import InfoTip from '../components/InfoTip.jsx'
import LoanStatus from '../components/LoanStatus.jsx'
import { apiFetch } from '../lib/api.js'
import { matchesDueDate } from '../lib/dueDate.js'
import { getStatus, isOverdue } from '../lib/loanStatus.js'
import { formatDueDate, formatTimestamp } from '../lib/campusDate.js'
import '../styles/pages/dashboard.css'

const ATTENTION_ORDER = ['overdue', 'returned', 'pending']
const DEFAULT_DUE_FILTER = { range: 'custom', amount: 7, unit: 'days' }
const DUE_FILTER_KEY = 'dashboardDueFilter'
// Picked by hand
const RECENT_ACTIVITY_COUNT = 10

function personName(person) {
  return person?.displayName || (person?.username ? `@${person.username}` : 'Community member')
}

const DATE_OPTIONS = { month: 'short', day: 'numeric' }

function otherPerson(loan) {
  return loan.direction === 'borrowed' ? loan.owner : loan.borrower
}

// Declined and cancelled requests aren't listed on any page
function loanPage(loan) {
  if (['rejected', 'cancelled'].includes(loan.status)) return null
  if (loan.status === 'requested') {
    return loan.direction === 'borrowed' ? '/borrow-request?view=sent' : '/borrow-request'
  }
  return `/loan-details?view=${loan.direction}`
}

function personLine(loan) {
  return (
    <>
      {loan.direction === 'borrowed' ? 'From' : 'To'}{' '}
      <strong>{personName(otherPerson(loan))}</strong>
    </>
  )
}

const LOAN_EVENTS = [
  { kind: 'requested', dateKey: 'createdAt' },
  { kind: 'approved', dateKey: 'approvedAt' },
  { kind: 'rejected', dateKey: 'updatedAt' },
  { kind: 'cancelled', dateKey: 'updatedAt' },
  { kind: 'returned', dateKey: 'returnedAt' },
  { kind: 'confirmed', dateKey: 'confirmedAt' },
]

function activityEvents(loans) {
  const events = []
  for (const loan of loans) {
    for (const { kind, dateKey } of LOAN_EVENTS) {
      // Every loan has an updatedAt, so declined and cancelled are told apart by status
      const happened = dateKey === 'updatedAt' ? loan.status === kind : Boolean(loan[dateKey])
      if (happened) {
        events.push({ loan, kind, date: loan[dateKey] })
      }
    }
  }
  return orderBy(events, (event) => event.date, 'desc').slice(0, RECENT_ACTIVITY_COUNT)
}

function activityText({ loan, kind }) {
  const person = <strong>{personName(otherPerson(loan))}</strong>
  if (loan.direction === 'lent') {
    const lentTexts = {
      requested: <>{person} asked to borrow it</>,
      approved: <>You approved {person}'s request</>,
      rejected: <>You declined {person}'s request</>,
      cancelled: <>{person} cancelled their request</>,
      returned: <>{person} returned it</>,
      confirmed: <>You confirmed {person}'s return</>,
    }
    return lentTexts[kind]
  }
  const borrowedTexts = {
    requested: <>You sent a request to {person}</>,
    approved: <>{person} approved your request</>,
    rejected: <>{person} declined your request</>,
    cancelled: <>You cancelled your request to {person}</>,
    returned: <>You returned it to {person}</>,
    confirmed: <>{person} confirmed your return</>,
  }
  return borrowedTexts[kind]
}

function attentionAction(loan) {
  if (loan.direction === 'lent' && loan.status === 'requested') {
    return {
      text: (
        <>
          <strong>{personName(loan.borrower)}</strong> wants to borrow it
        </>
      ),
      label: 'Review',
    }
  }
  if (loan.direction === 'lent' && loan.status === 'returned') {
    return {
      text: (
        <>
          <strong>{personName(loan.borrower)}</strong> returned it
        </>
      ),
      label: 'Confirm',
    }
  }
  if (loan.direction === 'borrowed' && isOverdue(loan)) {
    return {
      text: (
        <>
          You borrowed from <strong>{personName(loan.owner)}</strong>, was due{' '}
          {formatDueDate(loan.dueDate, DATE_OPTIONS)}
        </>
      ),
      label: 'Return',
    }
  }
  if (isOverdue(loan)) {
    return {
      text: (
        <>
          <strong>{personName(loan.borrower)}</strong> has it, was due{' '}
          {formatDueDate(loan.dueDate, DATE_OPTIONS)}
        </>
      ),
      label: 'View',
    }
  }
  return null
}

function attentionRows(loans) {
  const rows = []
  for (const loan of loans) {
    const action = attentionAction(loan)
    if (action) {
      rows.push({ loan, ...action })
    }
  }
  const isOverdueRow = (row) => getStatus(row.loan).id === 'overdue'
  return orderBy(rows, [
    (row) => ATTENTION_ORDER.indexOf(getStatus(row.loan).id),
    (row) => (isOverdueRow(row) && row.loan.direction === 'borrowed' ? 0 : 1),
    (row) => (isOverdueRow(row) ? new Date(row.loan.dueDate) : 0),
  ])
}

function DashboardRow({ loan, to, text, showStatus, children }) {
  const Row = to ? Link : 'div'
  const linkProps = to ? { to, state: { highlightId: loan._id } } : {}
  const image = loan.item?.photos?.[0]
  return (
    <Row {...linkProps} className="dashboard-row">
      <span className="photo-box dashboard-row-photo">
        {image ? (
          <img src={image} alt="" loading="lazy" />
        ) : (
          <PackageOpen size={20} aria-hidden="true" />
        )}
      </span>
      <span className="dashboard-row-main">
        <span className="dashboard-row-title">
          <strong className="truncate">{loan.item?.name || 'Deleted item'}</strong>
          {showStatus && <LoanStatus loan={loan} />}
        </span>
        <small className="truncate">{text}</small>
      </span>
      <span className="dashboard-row-end">{children}</span>
    </Row>
  )
}

function DashboardSection({ title, count, info, control, className = '', children }) {
  return (
    <section className={`dashboard-section ${className}`}>
      <div className="dashboard-section-heading">
        <h2 className="count-label">
          {title}
          {count > 0 && <small>{count}</small>}
          {info && <InfoTip text={info} label={`About ${title}`} />}
        </h2>
        {control}
      </div>
      {children}
    </section>
  )
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dueFilter, setDueFilter] = useState(
    () => JSON.parse(localStorage.getItem(DUE_FILTER_KEY)) ?? DEFAULT_DUE_FILTER,
  )

  useEffect(() => {
    Promise.all([apiFetch('loans/lent'), apiFetch('loans/borrowed')])
      .then(([lent, borrowed]) => {
        setLoans([
          ...lent.map((loan) => ({ ...loan, direction: 'lent' })),
          ...borrowed.map((loan) => ({ ...loan, direction: 'borrowed' })),
        ])
      })
      .catch((err) => setError(err.message || 'Could not load your dashboard.'))
      .finally(() => setLoading(false))
  }, [])

  const changeDueFilter = (next) => {
    setDueFilter(next)
    localStorage.setItem(DUE_FILTER_KEY, JSON.stringify(next))
  }

  const attention = attentionRows(loans)
  const upcomingLoans = loans.filter(
    (loan) => loan.status === 'approved' && !isOverdue(loan) && matchesDueDate(loan, dueFilter),
  )
  const upcoming = orderBy(upcomingLoans, (loan) => loan.dueDate)
  const recentActivity = activityEvents(loans)

  return (
    <AppShell>
      <main className="dashboard-page">
        <header className="page-heading">
          <div>
            <h1>Hi {profile.displayName.split(' ')[0]}!</h1>
            <p>Here’s what’s happening.</p>
          </div>
        </header>
        {error && (
          <p className="dashboard-error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <AppLoader inline label="Loading your dashboard…" />
        ) : (
          <div className="dashboard-sections">
            <DashboardSection title="Needs your attention" count={attention.length}>
              {attention.length ? (
                <div className="dashboard-list">
                  {attention.map(({ loan, text, label }) => (
                    <DashboardRow
                      key={loan._id}
                      loan={loan}
                      to={loanPage(loan)}
                      text={text}
                      showStatus
                    >
                      <span className="dashboard-row-action">
                        {label}
                        <ChevronRight size={15} aria-hidden="true" />
                      </span>
                    </DashboardRow>
                  ))}
                </div>
              ) : (
                <EmptyState icon={CircleCheck} title="All caught up" className="empty-state-green">
                  <span>Requests and returns waiting on you show up here.</span>
                </EmptyState>
              )}
            </DashboardSection>

            <DashboardSection
              title="Upcoming returns"
              count={upcoming.length}
              control={
                <DueDateMenu
                  value={dueFilter}
                  onChange={changeDueFilter}
                  className="action-button action-button-neutral"
                />
              }
            >
              {upcoming.length ? (
                <div className="dashboard-list">
                  {upcoming.map((loan) => (
                    <DashboardRow
                      key={loan._id}
                      loan={loan}
                      to={loanPage(loan)}
                      text={personLine(loan)}
                    >
                      Due{' '}
                      <span className="dashboard-row-due">
                        {formatDueDate(loan.dueDate, DATE_OPTIONS)}
                      </span>
                    </DashboardRow>
                  ))}
                </div>
              ) : (
                <EmptyState icon={CalendarCheck} title="Nothing due" className="empty-state-green">
                  <span>Loans due in this range show up here.</span>
                </EmptyState>
              )}
            </DashboardSection>

            <DashboardSection
              title="Recent activity"
              info={`Your last ${RECENT_ACTIVITY_COUNT} updates. See everything in My Loans and Borrow Requests.`}
              className="dashboard-section-wide"
            >
              {recentActivity.length ? (
                <div className="dashboard-list">
                  {recentActivity.map((event) => (
                    <DashboardRow
                      key={`${event.loan._id}-${event.kind}`}
                      loan={event.loan}
                      to={loanPage(event.loan)}
                      text={activityText(event)}
                    >
                      {formatTimestamp(event.date, DATE_OPTIONS)}
                    </DashboardRow>
                  ))}
                </div>
              ) : (
                <EmptyState icon={History} title="No activity yet" className="empty-state-orange">
                  <span>Requests and loans show up here.</span>
                </EmptyState>
              )}
            </DashboardSection>
          </div>
        )}
      </main>
    </AppShell>
  )
}
