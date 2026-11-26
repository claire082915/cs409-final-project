import { Button, Dialog, DialogTrigger, Heading, Popover } from 'react-aria-components'
import { Bell, CalendarClock, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { openPanel, useDetectionTask } from '../lib/detectionTask.js'
import {
  clearNotifications,
  dismissNotification,
  markAllRead,
  refreshNotifications,
  useNotifications,
} from '../lib/notifications.js'
import '../styles/components/count-badge.css'
import '../styles/components/notifications-menu.css'

const ICON_BY_KIND = {
  'auto-approved': ShieldCheck,
  'due-soon': CalendarClock,
  found: Sparkles,
  empty: Sparkles,
  error: Sparkles,
}

const LINK_BY_KIND = {
  'auto-approved': '/loan-details?view=lent',
  'due-soon': '/loan-details',
}

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

function timeAgo(createdAt) {
  const minutes = Math.round((Date.now() - new Date(createdAt)) / 60000)
  if (minutes === 0) {
    return 'Just now'
  }
  if (minutes < 60) {
    return relativeTime.format(-minutes, 'minute')
  }
  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return relativeTime.format(-hours, 'hour')
  }
  return relativeTime.format(-Math.round(hours / 24), 'day')
}

function NotificationRow({ notification, onOpen }) {
  const Icon = ICON_BY_KIND[notification.kind]
  return (
    <li>
      <button
        type="button"
        className={`notification-row notification-${notification.kind}`}
        onClick={onOpen}
      >
        <span className="notification-icon">
          <Icon size={16} aria-hidden="true" />
        </span>
        <span className="notification-copy">
          <strong>{notification.title}</strong>
          <span>{notification.text}</span>
          <small>{timeAgo(notification.createdAt)}</small>
        </span>
        {!notification.read && (
          <span className="notification-unread" role="img" aria-label="Unread" />
        )}
      </button>
      {/* A sibling of the row since a button can't hold another button */}
      <button
        type="button"
        className="notification-dismiss"
        onClick={() => dismissNotification(notification._id)}
        aria-label={`Dismiss ${notification.title}`}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </li>
  )
}

// Read state updates on close so new ones keep their dot while the list is open
export default function NotificationsMenu() {
  const notifications = useNotifications()
  const task = useDetectionTask()
  const navigate = useNavigate()
  const unreadCount = notifications.filter((notification) => !notification.read).length

  // An auto-populate result reopens its review while that search is still open, otherwise My Items
  const openNotification = (notification, close) => {
    close()
    const link = LINK_BY_KIND[notification.kind]
    if (link) {
      navigate(link, { state: { highlightId: notification.loan } })
      return
    }
    if (notification.taskId === task.id && task.status !== 'idle') {
      openPanel()
      return
    }
    navigate('/inventory')
  }

  return (
    <DialogTrigger onOpenChange={(isOpen) => (isOpen ? refreshNotifications() : markAllRead())}>
      <Button
        className="icon-button notification-button"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && <span className="count-badge">{unreadCount}</span>}
      </Button>
      <Popover className="notifications-popover" placement="bottom end" offset={10}>
        <Dialog className="notifications-dialog">
          {({ close }) => (
            <>
              <header className="notifications-header">
                <Heading slot="title">Notifications</Heading>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    className="notifications-clear"
                    onClick={clearNotifications}
                  >
                    Clear all
                  </button>
                )}
              </header>
              {notifications.length === 0 ? (
                <p className="notifications-empty">All caught up!</p>
              ) : (
                <ul className="notifications-list">
                  {notifications.map((notification) => (
                    <NotificationRow
                      key={notification._id}
                      notification={notification}
                      onOpen={() => openNotification(notification, close)}
                    />
                  ))}
                </ul>
              )}
            </>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  )
}
