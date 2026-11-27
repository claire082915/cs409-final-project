import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Button,
  Dialog,
  Disclosure,
  DisclosurePanel,
  Heading,
  Modal,
  ModalOverlay,
} from 'react-aria-components'
import { CalendarDays, ChevronRight, Inbox, MapPin, PackageOpen } from 'lucide-react'
import { toast } from 'sonner'
import { campusToday, dueDay, formatDueDate, formatTimestamp } from '../lib/campusDate.js'
import AppShell from '../components/AppShell.jsx'
import EmptyState from '../components/EmptyState.jsx'
import AppLoader from '../components/AppLoader.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import ItemDialog from '../components/ItemDialog.jsx'
import DatePickerField from '../components/DatePickerField.jsx'
import PendingLabel from '../components/PendingLabel.jsx'
import PersonLink from '../components/PersonLink.jsx'
import InfoTip from '../components/InfoTip.jsx'
import Reputation from '../components/Reputation.jsx'
import Switch from '../components/Switch.jsx'
import Tooltip from '../components/Tooltip.jsx'
import ViewSwitch from '../components/ViewSwitch.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { apiFetch } from '../lib/api.js'
import { useFiltersInUrl } from '../lib/useFiltersInUrl.js'
import { useHighlightedLoan } from '../lib/useHighlightedLoan.js'
import { refreshNotifications } from '../lib/notifications.js'
import { refreshPendingActions } from '../lib/pendingActions.js'
import '../styles/components/confirm-dialog.css'
import '../styles/components/loan-status.css'
import '../styles/pages/borrow-request.css'
import TrustBadge from '../components/TrustBadge.jsx'

// Received lists requests for your items, sent lists the ones you made
const VIEWS = {
  received: { label: 'Received', endpoint: 'loans/lent?status=requested' },
  sent: { label: 'Sent', endpoint: 'loans/borrowed?status=requested' },
}

// Received requests are a queue, so whoever asked first gets an answer first
// The backend sends newest first, which suits sent requests
function oldestFirst(requests) {
  return [...requests].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

// Approving lends the item out, so its other requests now wait for it
function remainingRequests(requests, handledRequest, action) {
  const remaining = []
  for (const other of requests) {
    if (other._id === handledRequest._id) {
      continue
    }
    if (action === 'approve' && other.item._id === handledRequest.item._id) {
      remaining.push({ ...other, item: { ...other.item, available: false } })
    } else {
      remaining.push(other)
    }
  }
  return remaining
}

const DATE_OPTIONS = { month: 'short', day: 'numeric' }

function personName(person) {
  return person.displayName || `@${person.username}`
}

function ItemPhoto({ item }) {
  return (
    <div className="photo-box request-photo">
      {item.photos?.[0] ? (
        <img src={item.photos[0]} alt="" />
      ) : (
        <PackageOpen size={32} aria-hidden="true" />
      )}
    </div>
  )
}

// Only spans, since callers put it inside headings and buttons
function ItemTitle({ item }) {
  return (
    <>
      <span className="request-item-name truncate">{item.name}</span>
      {item.available === false && <span className="loan-status status-pending">Lent</span>}
    </>
  )
}

// The person is the borrower on received requests and the owner on sent ones
function RequestDetails({ request, person, personDetail }) {
  return (
    <div className="request-details">
      <div className="request-person">
        <PersonLink person={person} />
        {personDetail}
      </div>
      {request.message && <p className="request-message">{request.message}</p>}
      <p className="request-meta">
        <span>
          <CalendarDays size={14} aria-hidden="true" />
          Return by {formatDueDate(request.dueDate, DATE_OPTIONS)}
        </span>
        <span aria-hidden="true">·</span>
        <span>Requested {formatTimestamp(request.createdAt, DATE_OPTIONS)}</span>
      </p>
    </div>
  )
}

// Unrated borrowers sort below everyone with a rating
function averageRating(request) {
  return request.borrower.reputation?.average ?? 0
}

// Trusted borrowers come first so their requests are reviewed first
function trustRank(request) {
  return request.borrower.trust === 'trusted' ? 1 : 0
}

function groupByItem(requests) {
  const groups = new Map()
  for (const request of oldestFirst(requests)) {
    if (!groups.has(request.item._id)) {
      groups.set(request.item._id, { item: request.item, requests: [] })
    }
    groups.get(request.item._id).requests.push(request)
  }
  const sortedGroups = [...groups.values()]
  // The sort is stable, so lent and available items each stay oldest first
  const isLent = (group) => Number(group.item.available === false)
  sortedGroups.sort((a, b) => isLent(a) - isLent(b))
  // The sort is stable, so equal ratings stay oldest first
  for (const group of sortedGroups) {
    group.requests.sort(
      (a, b) => trustRank(b) - trustRank(a) || averageRating(b) - averageRating(a),
    )
  }
  return sortedGroups
}

function ReceivedEntry({ request, isHighlighted, onApprove, onDecline }) {
  const isOnLoan = request.item.available === false
  return (
    <div
      id={`loan-${request._id}`}
      className={`request-entry${isHighlighted ? ' highlighted' : ''}`}
    >
      <RequestDetails
        request={request}
        person={request.borrower}
        personDetail={
          <>
            <Reputation reputation={request.borrower.reputation} />
            <TrustBadge trust={request.borrower.trust} />
          </>
        }
      />
      <div className="request-actions">
        <button
          type="button"
          className="action-button request-decline"
          onClick={() => onDecline(request)}
        >
          Decline
        </button>
        <Tooltip text={isOnLoan ? 'Already lent out' : ''} placement="top">
          <button
            type="button"
            className="action-button request-approve"
            aria-disabled={isOnLoan}
            onClick={isOnLoan ? undefined : () => onApprove(request)}
          >
            Approve
          </button>
        </Tooltip>
      </div>
    </div>
  )
}

// Waiting means the item is out, so these requests can't be approved yet
function requestCountLabel(group) {
  const count = group.requests.length
  if (group.item.available === false) {
    return `${count} waiting`
  }
  return `${count} ${count === 1 ? 'request' : 'requests'}`
}

// Every item starts open and can fold down to its count
function ItemRequests({ group, highlightId, onApprove, onDecline }) {
  return (
    <Disclosure className="request-group" defaultExpanded>
      <Heading level={2} className="request-group-heading">
        <Button slot="trigger" className="request-group-item request-group-toggle">
          <ItemPhoto item={group.item} />
          <span className="request-title">
            <ItemTitle item={group.item} />
          </span>
          <span className="request-group-count">{requestCountLabel(group)}</span>
          <ChevronRight size={16} className="request-group-chevron" aria-hidden="true" />
        </Button>
      </Heading>
      <DisclosurePanel>
        {group.requests.map((request) => (
          <ReceivedEntry
            key={request._id}
            request={request}
            isHighlighted={request._id === highlightId}
            onApprove={onApprove}
            onDecline={onDecline}
          />
        ))}
      </DisclosurePanel>
    </Disclosure>
  )
}

function ReceivedRequests({ requests, highlightId, onApprove, onDecline }) {
  return (
    <div className="request-list">
      {groupByItem(requests).map((group) => (
        <ItemRequests
          key={group.item._id}
          group={group}
          highlightId={highlightId}
          onApprove={onApprove}
          onDecline={onDecline}
        />
      ))}
    </div>
  )
}

// The photo opens the item too but is skipped by keyboard
function SentRequests({ requests, highlightId, onOpenItem, onCancel }) {
  return (
    <div className="request-list">
      {requests.map((request) => (
        <article
          key={request._id}
          id={`loan-${request._id}`}
          className={`request-row${request._id === highlightId ? ' highlighted' : ''}`}
        >
          <button
            type="button"
            className="request-item-open"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => onOpenItem(request)}
          >
            <ItemPhoto item={request.item} />
          </button>
          <div className="request-row-main">
            <h2 className="request-title">
              <button
                type="button"
                className="request-item-open request-title"
                aria-haspopup="dialog"
                onClick={() => onOpenItem(request)}
              >
                <ItemTitle item={request.item} />
              </button>
            </h2>
            <RequestDetails
              request={request}
              person={request.owner}
              personDetail={<OwnerArea campusArea={request.owner.campusArea} />}
            />
          </div>
          <div className="request-actions">
            <button
              type="button"
              className="action-button request-decline"
              onClick={() => onCancel(request)}
            >
              Cancel
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}

// The owner can move the borrower's return date before approving
function ApproveDialog({ request, isPending, onCancel, onConfirm }) {
  const submit = (event) => {
    event.preventDefault()
    onConfirm(String(new FormData(event.currentTarget).get('dueDate')))
  }

  return (
    <ModalOverlay
      isOpen={request !== null}
      onOpenChange={(open) => !open && onCancel()}
      isDismissable={!isPending}
      className="confirm-backdrop"
    >
      <Modal className="confirm-wrap">
        <Dialog className="confirm-panel">
          {request && (
            <form onSubmit={submit}>
              <Heading slot="title" className="confirm-title">
                Approve request?
              </Heading>
              <p className="confirm-text">
                {personName(request.borrower)} can borrow your {request.item.name}.
              </p>
              <DatePickerField
                label="Return by"
                className="form-field approve-date"
                name="dueDate"
                defaultValue={dueDay(request)}
                minValue={campusToday().add({ days: 1 })}
                isRequired
              />
              <div className="confirm-actions">
                <Button
                  className="action-button action-button-neutral"
                  isDisabled={isPending}
                  onPress={onCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="action-button action-button-teal"
                  isDisabled={isPending}
                >
                  <PendingLabel pending={isPending} pendingText="Approving...">
                    Approve
                  </PendingLabel>
                </Button>
              </div>
            </form>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}

function OwnerArea({ campusArea }) {
  if (!campusArea) {
    return null
  }
  return (
    <span className="request-area">
      <MapPin size={14} aria-hidden="true" />
      {campusArea}
    </span>
  )
}

function EmptyRequests({ view }) {
  if (view === 'sent') {
    return (
      <EmptyState icon={Inbox} title="No requests sent">
        <span>Requests you send from Browse show up here.</span>
      </EmptyState>
    )
  }
  return (
    <EmptyState icon={Inbox} title="You’re all caught up">
      <span>New requests show up here.</span>
    </EmptyState>
  )
}

// Same words as LOAN_MESSAGES in backend/lib/notify.js
function announceAutoApproved(approvedRequests) {
  for (const request of approvedRequests) {
    const text = `${request.item.name} lent to ${personName(request.borrower)}.`
    toast.success('Request auto-approved', { description: text })
  }
  refreshNotifications()
}

function AutoApproveToggle({ onTurnedOn }) {
  const { profile, setProfile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [waitingCount, setWaitingCount] = useState(0)

  const save = async (autoApprove) => {
    setSaving(true)
    try {
      const updated = await apiFetch('users/me', {
        method: 'PATCH',
        body: { preferences: { autoApprove } },
      })
      setProfile(updated)
      toast.success(autoApprove ? 'Auto-approve is on' : 'Auto-approve is off')
      // Turning it on approves trusted requests that were already waiting
      if (autoApprove) onTurnedOn()
    } catch (err) {
      toast.error(err.message)
    }
    setWaitingCount(0)
    setSaving(false)
  }

  // Lending out waiting requests is a side effect people might not expect, so that asks first
  const toggle = async () => {
    if (profile.preferences.autoApprove) {
      return save(false)
    }
    setSaving(true)
    try {
      const { count } = await apiFetch('loans/auto-approvable')
      if (count === 0) {
        return save(true)
      }
      setWaitingCount(count)
    } catch (err) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  return (
    <div className="auto-approve">
      <ConfirmDialog
        isOpen={waitingCount > 0}
        isPending={saving}
        title="Turn on auto-approve?"
        text={
          waitingCount === 1
            ? 'This also approves 1 waiting request from a trusted borrower.'
            : `This also approves ${waitingCount} waiting requests from trusted borrowers.`
        }
        cancelLabel="Cancel"
        confirmLabel="Turn on"
        destructive={false}
        onCancel={() => setWaitingCount(0)}
        onConfirm={() => save(true)}
      />
      <Switch
        className="auto-approve-switch"
        checked={profile.preferences.autoApprove}
        onChange={toggle}
        isDisabled={saving}
      >
        Auto-approve trusted
      </Switch>
      <InfoTip
        text="Approve requests from trusted borrowers right away."
        label="About auto-approve"
      />
    </div>
  )
}

export default function BorrowRequestPage() {
  const [searchParams] = useSearchParams()
  const [view, setView] = useState(searchParams.get('view') ?? 'received')
  const [requests, setRequests] = useState([])
  const [requestCounts, setRequestCounts] = useState(null)
  const [approvingRequest, setApprovingRequest] = useState(null)
  const [decliningRequest, setDecliningRequest] = useState(null)
  const [cancelingRequest, setCancelingRequest] = useState(null)
  const [viewingRequest, setViewingRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState('')
  const highlightId = useHighlightedLoan(!loading)
  const viewParam = searchParams.get('view') ?? 'received'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    apiFetch(VIEWS[view].endpoint)
      .then((data) => {
        if (!cancelled) setRequests(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setRequests([])
          setError(err.message)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [view])

  useFiltersInUrl(new URLSearchParams(view === 'sent' ? { view } : {}))

  // Both counts load up front so the switch can show them before either view is opened
  useEffect(() => {
    let cancelled = false
    Promise.all([apiFetch(VIEWS.received.endpoint), apiFetch(VIEWS.sent.endpoint)])
      .then(([received, sent]) => {
        if (!cancelled) setRequestCounts({ received: received.length, sent: sent.length })
      })
      // The counts show 0 if they can't load, the list shows its own error
      .catch(() => {
        if (!cancelled) setRequestCounts({ received: 0, sent: 0 })
      })
    return () => {
      cancelled = true
    }
  }, [])

  // The shown view's count follows its list as requests are answered
  useEffect(() => {
    if (!loading && !error) {
      setRequestCounts((counts) => counts && { ...counts, [view]: requests.length })
    }
  }, [view, loading, error, requests])

  // Clear the old list first, its rows have a borrower where sent rows need an owner
  const showView = (name) => {
    setView(name)
    setRequests([])
    setLoading(true)
  }

  // A notification can switch the view while the page is already open
  useEffect(() => {
    if (viewParam !== view) showView(viewParam)
  }, [viewParam])

  // Requests that left the received list were the ones auto-approve just approved
  const showAutoApproved = async () => {
    const remaining = await apiFetch(VIEWS.received.endpoint)
    const remainingIds = new Set(remaining.map((request) => request._id))
    announceAutoApproved(requests.filter((request) => !remainingIds.has(request._id)))
    setRequests(remaining)
    refreshPendingActions()
  }

  const updateRequest = async (request, action, body, doneMessage) => {
    setActing(true)
    try {
      await apiFetch(`loans/${request._id}/${action}`, { method: 'PATCH', body })
      setRequests((current) => remainingRequests(current, request, action))
      refreshPendingActions()
      toast.success(doneMessage)
      setApprovingRequest(null)
      setDecliningRequest(null)
      setCancelingRequest(null)
    } catch (err) {
      toast.error(err.message)
    }
    setActing(false)
  }

  return (
    <AppShell>
      <main className="requests-page">
        <header className="page-heading">
          <div>
            <h1>Borrow Requests</h1>
            <p>Requests for your items and ones you've sent.</p>
          </div>
        </header>
        {/* The tab counts wait for both lists so they never show a wrong 0 */}
        {requestCounts === null ? (
          <AppLoader inline label="Loading requests..." />
        ) : (
          <>
            <div className="requests-views">
              <ViewSwitch
                label="Requests to show"
                options={Object.entries(VIEWS).map(([id, { label }]) => ({
                  id,
                  label: (
                    <>
                      {label}
                      <small>{requestCounts[id]}</small>
                    </>
                  ),
                }))}
                selected={view}
                onChange={showView}
              />
              {view === 'received' && <AutoApproveToggle onTurnedOn={showAutoApproved} />}
            </div>
            {error && (
              <p className="requests-error" role="alert">
                {error}
              </p>
            )}
            {loading ? (
              <AppLoader inline label="Loading requests..." />
            ) : requests.length === 0 ? (
              <EmptyRequests view={view} />
            ) : (
              <>
                <p className="count-label">
                  Pending
                  <small>
                    {requests.length} {requests.length === 1 ? 'request' : 'requests'}
                  </small>
                </p>
                {view === 'received' ? (
                  <ReceivedRequests
                    requests={requests}
                    highlightId={highlightId}
                    onApprove={setApprovingRequest}
                    onDecline={setDecliningRequest}
                  />
                ) : (
                  <SentRequests
                    requests={requests}
                    highlightId={highlightId}
                    onOpenItem={setViewingRequest}
                    onCancel={setCancelingRequest}
                  />
                )}
              </>
            )}
          </>
        )}
        {/* Sent items open read only, the request already exists */}
        {viewingRequest && (
          <ItemDialog
            item={{ ...viewingRequest.item, owner: viewingRequest.owner }}
            onClose={() => setViewingRequest(null)}
          />
        )}
        <ApproveDialog
          request={approvingRequest}
          isPending={acting}
          onCancel={() => setApprovingRequest(null)}
          onConfirm={(dueDate) =>
            updateRequest(
              approvingRequest,
              'approve',
              { dueDate },
              `Request from ${personName(approvingRequest.borrower)} approved`,
            )
          }
        />
        <ConfirmDialog
          isOpen={decliningRequest !== null}
          isPending={acting}
          title="Decline request?"
          text={
            decliningRequest &&
            `${personName(decliningRequest.borrower)} won't be able to borrow your ${decliningRequest.item.name}.`
          }
          cancelLabel="Cancel"
          confirmLabel="Decline"
          onCancel={() => setDecliningRequest(null)}
          onConfirm={() =>
            updateRequest(
              decliningRequest,
              'reject',
              undefined,
              `Request from ${personName(decliningRequest.borrower)} declined`,
            )
          }
        />
        <ConfirmDialog
          isOpen={cancelingRequest !== null}
          isPending={acting}
          title="Cancel request?"
          text={
            cancelingRequest &&
            `${personName(cancelingRequest.owner)} won't see your request for the ${cancelingRequest.item.name} anymore.`
          }
          cancelLabel="Keep request"
          confirmLabel="Cancel request"
          onCancel={() => setCancelingRequest(null)}
          onConfirm={() =>
            updateRequest(
              cancelingRequest,
              'cancel',
              undefined,
              `Request for ${cancelingRequest.item.name} cancelled`,
            )
          }
        />
      </main>
    </AppShell>
  )
}
