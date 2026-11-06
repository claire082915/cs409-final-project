import { Bell, BookOpen, Boxes, Home, MessageCircle, Search, Settings, Star, UserRound, HandHelping } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import Logo from './Logo.jsx'

const navigation = [
  { label: 'Home', to: '/dashboard', icon: Home },
  { label: 'My Items', to: '/inventory', icon: Boxes },
  { label: 'Browse Items', to: '/browse', icon: Search },
  { label: 'Borrow Requests', to: '/borrow-request', icon: HandHelping, badge: '3' },
  { label: 'My Loans', to: '/loan-details', icon: BookOpen },
  { label: 'Messages', to: '/borrow-request', icon: MessageCircle },
  { label: 'Reputation', to: '/reputation', icon: Star },
  { label: 'Settings', to: '/signup', icon: Settings },
]

function Sidebar() {
  return (
    <aside className="app-sidebar" aria-label="Main sidebar">
      <div className="sidebar-brand"><Logo light /></div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navigation.map(({ label, to, icon: Icon, badge }) => (
          <NavLink key={label} to={to} className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}>
            <Icon size={17} strokeWidth={2.1} aria-hidden="true" />
            <span>{label}</span>
            {badge && <span className="sidebar-badge">{badge}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-help">
        <span className="help-icon">?</span>
        <span><strong>Need a hand?</strong><small>Visit our help center</small></span>
      </div>
    </aside>
  )
}

function Topbar() {
  return (
    <header className="app-topbar">
      <label className="app-search">
        <Search size={16} aria-hidden="true" />
        <input aria-label="Search items or people" placeholder="Search items or people..." />
        <kbd>⌘ K</kbd>
      </label>
      <div className="topbar-actions">
        <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button>
        <button className="profile-button" aria-label="Your profile"><span className="profile-avatar"><UserRound size={18} /></span><span className="profile-name">User Name</span></button>
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
      {withSidebar && <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.slice(0, 4).map(({ label, to, icon: Icon }) => (
          <NavLink key={label} to={to} className={({ isActive }) => `mobile-nav-link${isActive ? ' is-active' : ''}`}>
            <Icon size={19} aria-hidden="true" /><span>{label === 'Browse Items' ? 'Browse' : label === 'My Items' ? 'Items' : label === 'Borrow Requests' ? 'Requests' : label}</span>
          </NavLink>
        ))}
      </nav>}
    </div>
  )
}
