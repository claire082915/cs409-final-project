import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Logo from '../components/Logo.jsx'
import '../styles/pages/sign-up-login.css'

function EyeIcon({ off = false }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  )
}

function PasswordField({ id, name, placeholder, autoComplete }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="password-wrap">
      <input
        type={visible ? 'text' : 'password'}
        id={id}
        name={name}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        <EyeIcon off={visible} />
      </button>
    </div>
  )
}

export default function SignUpLoginPage() {
  // Open on the tab that matches the route (/login or /signup)
  const { pathname } = useLocation()
  const [mode, setMode] = useState(pathname.includes('login') ? 'login' : 'signup') // 'signup' | 'login'
  const isSignUp = mode === 'signup'

  return (
    <div className="site-outer">
      <header className="site-header">
        <div className="header-inner">
          <Logo />
        </div>
      </header>

      <main className="auth-main">
        <section className="welcome">
          <h1 className="welcome-title">
            Welcome to <span>Lendr</span>
          </h1>
          <p className="welcome-text">
            Create an account or log in to start borrowing and lending.
          </p>
          <div className="welcome-visual">
            <img
              className="welcome-image"
              src="https://images.unsplash.com/vector-1739803877798-2f7a52093586?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
              alt="A gift box"
            />
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Account options">
            <button
              type="button"
              role="tab"
              id="tab-signup"
              aria-selected={isSignUp}
              aria-controls="panel-signup"
              className={`auth-tab${isSignUp ? ' is-active' : ''}`}
              onClick={() => setMode('signup')}
            >
              Sign Up
            </button>
            <button
              type="button"
              role="tab"
              id="tab-login"
              aria-selected={!isSignUp}
              aria-controls="panel-login"
              className={`auth-tab${!isSignUp ? ' is-active' : ''}`}
              onClick={() => setMode('login')}
            >
              Log In
            </button>
          </div>

          {isSignUp ? (
            <div className="auth-panel" role="tabpanel" id="panel-signup" aria-labelledby="tab-signup">
              <div className="field">
                <label htmlFor="signup-name">Full Name</label>
                <input
                  type="text"
                  id="signup-name"
                  name="full-name"
                  placeholder="Enter your name"
                  autoComplete="name"
                />
              </div>
              <div className="field">
                <label htmlFor="signup-email">Email</label>
                <input
                  type="email"
                  id="signup-email"
                  name="email"
                  placeholder="Enter your email"
                  autoComplete="email"
                />
              </div>
              <div className="field">
                <label htmlFor="signup-password">Password</label>
                <PasswordField
                  id="signup-password"
                  name="password"
                  placeholder="Create password"
                  autoComplete="new-password"
                />
              </div>
              <Button to="/dashboard">Sign Up</Button>
              <p className="switch-prompt">
                Already have an account?{' '}
                <button type="button" className="switch-link" onClick={() => setMode('login')}>
                  Log in
                </button>
              </p>
            </div>
          ) : (
            <div className="auth-panel" role="tabpanel" id="panel-login" aria-labelledby="tab-login">
              <div className="field">
                <label htmlFor="login-email">Email</label>
                <input
                  type="email"
                  id="login-email"
                  name="email"
                  placeholder="Enter your email"
                  autoComplete="email"
                />
              </div>
              <div className="field">
                <label htmlFor="login-password">Password</label>
                <PasswordField
                  id="login-password"
                  name="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>
              <Button to="/dashboard">Log In</Button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
