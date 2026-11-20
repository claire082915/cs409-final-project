import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Button,
  Dialog,
  Disclosure,
  DisclosurePanel,
  Heading,
  Modal,
  ModalOverlay,
} from 'react-aria-components'
import { CalendarDays, Check, ChevronRight, MapPin, PackageOpen, Send } from 'lucide-react'
import { toast } from 'sonner'
import { getLocalTimeZone, parseDate, today } from '@internationalized/date'
import AppShell from '../components/AppShell.jsx'
import SourceSwitch from '../components/SourceSwitch.jsx'
import EmptyState from '../components/EmptyState.jsx'
import AppLoader from '../components/AppLoader.jsx'
import Avatar from '../components/Avatar.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import ItemDialog from '../components/ItemDialog.jsx'
import DatePickerField from '../components/DatePickerField.jsx'
import PendingLabel from '../components/PendingLabel.jsx'
import Reputation from '../components/Reputation.jsx'
import Tooltip from '../components/Tooltip.jsx'
import ViewSwitch from '../components/ViewSwitch.jsx'
import { apiFetch } from '../lib/api.js'
import { MOCK_RECEIVED, MOCK_SENT } from '../lib/mockRequests.js'
import { setPendingRequestCount } from '../lib/pendingRequestCount.js'
import '../styles/components/confirm-dialog.css'
import '../styles/pages/borrow-request.css'

// Received lists requests for your items, sent lists the ones you made
const VIEWS = {
  received: { label: 'Received', endpoint: 'loans/lent?status=requested', mock: MOCK_RECEIVED },
  sent: { label: 'Sent', endpoint: 'loans/borrowed?status=requested', mock: MOCK_SENT },
}
const VIEW_OPTIONS = [
  { id: 'received', label: VIEWS.received.label },
  { id: 'sent', label: VIEWS.sent.label },
]

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

function dateLabel(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
    new Date(`${String(value).slice(0, 10)}T12:00:00`),
  )
}

function personName(person) {
  return person.displayName || `@${person.username}`
}

function ItemPhoto({ item }) {
  return (
    <div className="photo-box request-photo">
      {item.photos?.[0] ? <img src={item.photos[0]} alt="" /> : <PackageOpen size={24} />}
    </div>
  )
}

// Only spans, since callers put it inside headings and buttons
function ItemTitle({ item }) {
  return (
    <>
      <span className="request-item-name truncate">{item.name}</span>
      {item.available === false && <span className="request-on-loan">Lent</span>}
    </>
  )
}

// The person is the borrower on received requests and the owner on sent ones
function RequestDetails({ request, person, personDetail }) {
  return (
    <div className="request-details">
      <div className="request-person">
        <Link to={`/profile/${person.username}`} className="request-person-link">
          <Avatar
            photo={person.photo}
            name={person.displayName}
            username={person.username}
            className="avatar-small"
          />
          <span className="request-person-name">{personName(person)}</span>
        </Link>
        {personDetail}
      </div>
      {request.message && <p className="request-message">{request.message}</p>}
      <p className="request-meta">
        <span>
          <CalendarDays size={14} aria-hidden="true" />
          Return by {dateLabel(request.dueDate)}
        </span>
        <span aria-hidden="true">·</span>
        <span>Requested {dateLabel(request.createdAt)}</span>
      </p>
    </div>
  )
}

// Unrated borrowers sort below everyone with a rating
function averageRating(request) {
  return request.borrower.reputation?.average ?? 0
}

// Items come in the order of their oldest request, then each item's best rated borrower comes first
function groupByItem(requests) {
  const groups = new Map()
  for (const request of oldestFirst(requests)) {
    if (!groups.has(request.item._id)) {
      groups.set(request.item._id, { item: request.item, requests: [] })
    }
    groups.get(request.item._id).requests.push(request)
  }
  const sortedGroups = [...groups.values()]
  // The sort is stable, so equal ratings stay oldest first
  for (const group of sortedGroups) {
    group.requests.sort((a, b) => averageRating(b) - averageRating(a))
  }
  return sortedGroups
}

function ReceivedEntry({ request, onApprove, onDecline }) {
  const isOnLoan = request.item.available === false
  return (
    <div className="request-entry">
      <RequestDetails
        request={request}
        person={request.borrower}
        personDetail={<Reputation reputation={request.borrower.reputation} />}
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
function ItemRequests({ group, onApprove, onDecline }) {
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
            onApprove={onApprove}
            onDecline={onDecline}
          />
        ))}
      </DisclosurePanel>
    </Disclosure>
  )
}

function ReceivedRequests({ requests, onApprove, onDecline }) {
  return (
    <div className="request-list">
      {groupByItem(requests).map((group) => (
        <ItemRequests
          key={group.item._id}
          group={group}
          onApprove={onApprove}
          onDecline={onDecline}
        />
      ))}
    </div>
  )
}

// The photo opens the item too but is skipped by keyboard
function SentRequests({ requests, onOpenItem, onCancel }) {
  return (
    <div className="request-list">
      {requests.map((request) => (
        <article className="request-row" key={request._id}>
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
                defaultValue={parseDate(String(request.dueDate).slice(0, 10))}
                minValue={today(getLocalTimeZone()).add({ days: 1 })}
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
      <EmptyState icon={Send} title="No requests sent">
        <span>Requests you send from Browse show up here.</span>
      </EmptyState>
    )
  }
  return (
    <EmptyState icon={Check} title="You're all caught up">
      <span>New requests will show up here.</span>
    </EmptyState>
  )
}

export default function BorrowRequestPage() {
  const [source, setSource] = useState(() => localStorage.getItem('lendrRequestSource') || 'mock')
  const [view, setView] = useState('received')
  const [requests, setRequests] = useState([])
  const [approvingRequest, setApprovingRequest] = useState(null)
  const [decliningRequest, setDecliningRequest] = useState(null)
  const [cancelingRequest, setCancelingRequest] = useState(null)
  const [viewingRequest, setViewingRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    localStorage.setItem('lendrRequestSource', source)
    if (source === 'mock') {
      setRequests(VIEWS[view].mock)
      setError('')
      setLoading(false)
      return
    }
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
  }, [source, view])

  // Keeps the sidebar badge in step with the received list
  useEffect(() => {
    if (view === 'received' && !loading && !error) {
      setPendingRequestCount(requests.length)
    }
  }, [view, loading, error, requests])

  // Clear the old list first, its rows have a borrower where sent rows need an owner
  const showView = (name) => {
    setView(name)
    setRequests([])
    setLoading(true)
  }

  // Mock requests only leave the list, backend ones change status for real
  const updateRequest = async (request, action, body, doneMessage) => {
    setActing(true)
    try {
      if (source === 'backend') {
        await apiFetch(`loans/${request._id}/${action}`, { method: 'PATCH', body })
      }
      setRequests((current) => remainingRequests(current, request, action))
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
          <SourceSwitch source={source} onChange={setSource} label="Request data source" />
        </header>
        <ViewSwitch
          className="requests-views"
          label="Requests to show"
          options={VIEW_OPTIONS}
          selected={view}
          onChange={showView}
        />
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
                onApprove={setApprovingRequest}
                onDecline={setDecliningRequest}
              />
            ) : (
              <SentRequests
                requests={requests}
                onOpenItem={setViewingRequest}
                onCancel={setCancelingRequest}
              />
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
