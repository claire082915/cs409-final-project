import {
  ArrowLeftRight,
  CircleUserRound,
  Compass,
  Home,
  Inbox,
  LogOut,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import Avatar from './Avatar.jsx'
import DetectedItemsPanel from './DetectedItemsPanel.jsx'
import DetectionTaskButton from './DetectionTaskButton.jsx'
import NotificationsMenu from './NotificationsMenu.jsx'
import Logo from './Logo.jsx'
import { usePendingRequestCount } from '../lib/pendingRequestCount.js'
import Tooltip from './Tooltip.jsx'
import TopbarSearch from './TopbarSearch.jsx'
import '../styles/components/app-shell.css'

// Links with a mobile label also show in the phone bottom bar
const navigation = [
  { label: 'Home', mobileLabel: 'Home', to: '/dashboard', icon: Home },
  { label: 'Browse Items', mobileLabel: 'Browse', to: '/browse', icon: Compass },
  { label: 'My Items', mobileLabel: 'Items', to: '/inventory', icon: Package },
  { label: 'My Loans', to: '/loan-details', icon: ArrowLeftRight },
  {
    label: 'Borrow Requests',
    mobileLabel: 'Requests',
    to: '/borrow-request',
    icon: Inbox,
    showsRequestCount: true,
  },
  { label: 'Account', to: '/account', icon: CircleUserRound },
]
const mobileNavigation = navigation.filter((link) => link.mobileLabel)
const COLLAPSED_KEY = 'sidebarCollapsed'

// Collapsed links only show icons so the tooltip names them, the request badge says what it counts
function SidebarLink({ link, collapsed, requestCount }) {
  const { label, to, icon: Icon, showsRequestCount } = link
  const hasBadge = showsRequestCount && requestCount > 0
  // Only received requests count, since those are the ones waiting on this user
  const countLabel = `${requestCount} waiting for your reply`
  let tooltip = collapsed ? label : ''
  if (hasBadge) {
    tooltip = collapsed ? `${label}, ${countLabel}` : countLabel
  }
  return (
    <Tooltip text={tooltip} placement="right">
      <NavLink
        to={to}
        className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
        aria-label={hasBadge ? `${label}, ${countLabel}` : undefined}
      >
        <Icon size={17} strokeWidth={2.1} aria-hidden="true" />
        <span className="sidebar-label">{label}</span>
        {hasBadge && <span className="sidebar-badge">{requestCount}</span>}
      </NavLink>
    </Tooltip>
  )
}

function Sidebar({ collapsed, onToggle }) {
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose
  const toggleLabel = collapsed ? 'Expand sidebar' : 'Collapse sidebar'
  const pendingRequestCount = usePendingRequestCount()
  return (
    <aside className="app-sidebar" aria-label="Main sidebar">
      <div className="sidebar-brand">
        <Logo light />
        <Tooltip text={toggleLabel} placement="right">
          <button
            type="button"
            className="sidebar-toggle"
            onClick={onToggle}
            aria-label={toggleLabel}
            aria-expanded={!collapsed}
          >
            <ToggleIcon size={17} strokeWidth={2.1} aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navigation.map((link) => (
          <SidebarLink
            key={link.label}
            link={link}
            collapsed={collapsed}
            requestCount={pendingRequestCount}
          />
        ))}
      </nav>
    </aside>
  )
}

function Topbar({ withSearch }) {
  const { profile } = useAuth()
  return (
    <header className={`app-topbar${withSearch ? '' : ' app-topbar-no-search'}`}>
      {withSearch && <TopbarSearch />}
      <div className="topbar-actions">
        <DetectionTaskButton />
        <NotificationsMenu />
        <Link className="profile-button" to="/account" aria-label="Open account">
          <Avatar
            photo={profile.photo}
            name={profile.displayName}
            username={profile.username}
            className="profile-avatar"
          />
          <span className="profile-name">{profile.displayName}</span>
        </Link>
        <Link className="icon-button" to="/logout" aria-label="Log out">
          <LogOut size={18} />
        </Link>
      </div>
    </header>
  )
}

export default function AppShell({ children, withSidebar = true, withSearch = true }) {
  // Remember the choice since each page mounts its own shell
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === 'true')

  const toggleCollapsed = () => {
    localStorage.setItem(COLLAPSED_KEY, String(!collapsed))
    setCollapsed(!collapsed)
  }

  let shellClass = 'app-shell'
  if (!withSidebar) {
    shellClass += ' app-shell-no-sidebar'
  } else if (collapsed) {
    shellClass += ' is-sidebar-collapsed'
  }

  return (
    <div className={shellClass}>
      {withSidebar && <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />}
      <div className="app-main">
        <Topbar withSearch={withSearch} />
        <div className="app-content">{children}</div>
      </div>
      {/* In the shell so the review opens from any page */}
      <DetectedItemsPanel />
      {withSidebar && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {mobileNavigation.map(({ label, mobileLabel, to, icon: Icon }) => (
            <NavLink
              key={label}
              to={to}
              className={({ isActive }) => `mobile-nav-link${isActive ? ' is-active' : ''}`}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{mobileLabel}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
