import {
  Bell,
  BookOpen,
  Boxes,
  Home,
  LogOut,
  Search,
  Settings,
  Star,
  UserRound,
  HandHelping,
} from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase.js'
import { useAuth } from '../auth/AuthContext.jsx'
import Logo from './Logo.jsx'
import '../styles/components/app-shell.css'

const navigation = [
  { label: 'Home', to: '/dashboard', icon: Home },
  { label: 'My Items', to: '/inventory', icon: Boxes },
  { label: 'Browse Items', to: '/browse', icon: Search },
  { label: 'Borrow Requests', to: '/borrow-request', icon: HandHelping, badge: '3' },
  { label: 'My Loans', to: '/loan-details', icon: BookOpen },
  { label: 'Reputation', to: '/reputation', icon: Star },
  { label: 'Settings', to: '/settings', icon: Settings },
]

function Sidebar() {
  return (
    <aside className="app-sidebar" aria-label="Main sidebar">
      <div className="sidebar-brand">
        <Logo light />
      </div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navigation.map(({ label, to, icon: Icon, badge }) => (
          <NavLink
            key={label}
            to={to}
            className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
          >
            <Icon size={17} strokeWidth={2.1} aria-hidden="true" />
            <span>{label}</span>
            {badge && <span className="sidebar-badge">{badge}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-help">
        <span className="help-icon">?</span>
        <span>
          <strong>Need a hand?</strong>
          <small>Visit our help center</small>
        </span>
      </div>
    </aside>
  )
}

function Topbar() {
  const { profile } = useAuth()
  return (
    <header className="app-topbar">
      <label className="app-search">
        <Search size={16} aria-hidden="true" />
        <input aria-label="Search items or people" placeholder="Search items or people..." />
        <kbd>⌘ K</kbd>
      </label>
      <div className="topbar-actions">
        <button className="icon-button notification-button" aria-label="Notifications">
          <Bell size={18} />
          <i />
        </button>
        <Link className="profile-button" to="/settings" aria-label="Open settings">
          <span className="profile-avatar">
            <UserRound size={18} />
          </span>
          <span className="profile-name">{profile.displayName}</span>
        </Link>
        <button className="icon-button" aria-label="Log out" onClick={() => signOut(auth)}>
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}

export default function AppShell({ children, withSidebar = true }) {
  return (
    <div className={`app-shell${withSidebar ? '' : ' app-shell-no-sidebar'}`}>
      {withSidebar && <Sidebar />}
      <div className="app-main">
        <Topbar />
        <div className="app-content">{children}</div>
      </div>
      {withSidebar && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navigation.slice(0, 4).map(({ label, to, icon: Icon }) => (
            <NavLink
              key={label}
              to={to}
              className={({ isActive }) => `mobile-nav-link${isActive ? ' is-active' : ''}`}
            >
              <Icon size={19} aria-hidden="true" />
              <span>
                {label === 'Browse Items'
                  ? 'Browse'
                  : label === 'My Items'
                    ? 'Items'
                    : label === 'Borrow Requests'
                      ? 'Requests'
                      : label}
              </span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
