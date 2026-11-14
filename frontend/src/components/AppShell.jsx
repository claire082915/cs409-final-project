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
import { useAuth } from '../auth/AuthContext.jsx'
import Logo from './Logo.jsx'
import TopbarSearch from './TopbarSearch.jsx'
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

function Topbar({ withSearch }) {
  const { profile } = useAuth()
  return (
    <header className={`app-topbar${withSearch ? '' : ' app-topbar-no-search'}`}>
      {withSearch && <TopbarSearch />}
      <div className="topbar-actions">
        <button className="icon-button notification-button" aria-label="Notifications">
          <Bell size={18} />
          <i />
        </button>
        <Link className="profile-button" to="/settings" aria-label="Open settings">
          <span className="profile-avatar">
            {profile.photo ? <img src={profile.photo} alt="" /> : <UserRound size={18} />}
          </span>
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
  return (
    <div className={`app-shell${withSidebar ? '' : ' app-shell-no-sidebar'}`}>
      {withSidebar && <Sidebar />}
      <div className="app-main">
        <Topbar withSearch={withSearch} />
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
