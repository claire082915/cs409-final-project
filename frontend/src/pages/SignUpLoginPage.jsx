import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  validatePassword,
} from 'firebase/auth'
import { auth } from '../lib/firebase.js'
import { apiFetch } from '../lib/api.js'
import { useAuth } from '../auth/AuthContext.jsx'
import Logo from '../components/Logo.jsx'
import '../styles/pages/sign-up-login.css'

const FIREBASE_ERRORS = {
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/invalid-email': 'Enter a valid email.',
  'auth/missing-email': 'Enter your email first.',
  'auth/missing-password': 'Enter your password.',
  'auth/weak-password': 'Password is too weak.',
  'auth/password-does-not-meet-requirements': 'Password does not meet the requirements.',
  'auth/popup-closed-by-user': 'Google sign in was closed before it finished.',
  'auth/popup-blocked': 'Allow pop-ups for this site to sign in with Google.',
  'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/network-request-failed': 'Could not reach the server. Check your connection.',
}
// Same rule as the backend's user model
const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/

function errorMessage(err) {
  if (FIREBASE_ERRORS[err.code]) {
    return FIREBASE_ERRORS[err.code]
  }
  if (err.code?.startsWith('auth/')) {
    return 'Something went wrong signing in. Try again.'
  }
  return err.message
}

function profileFieldsError({ username, displayName }) {
  if (!displayName.trim()) {
    return 'Enter your name.'
  }
  if (!USERNAME_PATTERN.test(username.trim().toLowerCase())) {
    return 'Username must be 3 to 20 characters, using only letters, digits, dots or underscores.'
  }
  return null
}

// Status fields are only false for rules the Firebase password policy turns on
function passwordPolicyError(status) {
  const { minPasswordLength, maxPasswordLength } = status.passwordPolicy.customStrengthOptions
  if (status.meetsMinPasswordLength === false) {
    return `Password must be at least ${minPasswordLength} characters.`
  }
  if (status.meetsMaxPasswordLength === false) {
    return `Password must be at most ${maxPasswordLength} characters.`
  }
  if (status.containsLowercaseLetter === false) {
    return 'Password needs a lowercase letter.'
  }
  if (status.containsUppercaseLetter === false) {
    return 'Password needs an uppercase letter.'
  }
  if (status.containsNumericCharacter === false) {
    return 'Password needs a number.'
  }
  if (status.containsNonAlphanumericCharacter === false) {
    return 'Password needs a symbol.'
  }
  return 'Password does not meet the requirements.'
}

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

function PasswordField({ id, ...inputProps }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="password-wrap">
      <input type={visible ? 'text' : 'password'} id={id} {...inputProps} />
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

function Field({ id, label, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  )
}

function ProfileFields({ form, update }) {
  return (
    <>
      <Field id="profile-name" label="Full Name">
        <input
          id="profile-name"
          name="displayName"
          placeholder="Enter your name"
          autoComplete="name"
          value={form.displayName}
          onChange={update}
        />
      </Field>
      <Field id="profile-username" label="Username">
        <input
          id="profile-username"
          name="username"
          placeholder="Pick a username"
          autoComplete="nickname"
          value={form.username}
          onChange={update}
        />
      </Field>
    </>
  )
}

function EmailPasswordFields({ form, update, passwordAutoComplete }) {
  return (
    <>
      <Field id="auth-email" label="Email">
        <input
          type="email"
          id="auth-email"
          name="email"
          placeholder="Enter your email"
          autoComplete="username"
          value={form.email}
          onChange={update}
        />
      </Field>
      <Field id="auth-password" label="Password">
        <PasswordField
          id="auth-password"
          name="password"
          placeholder={
            passwordAutoComplete === 'new-password' ? 'Create password' : 'Enter your password'
          }
          autoComplete={passwordAutoComplete}
          value={form.password}
          onChange={update}
        />
      </Field>
    </>
  )
}

function AuthTabs({ isSignUp, setMode }) {
  return (
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
  )
}

export default function SignUpLoginPage() {
  // Open on the tab that matches the route (/login or /signup)
  const { pathname } = useLocation()
  const [mode, setMode] = useState(pathname.includes('login') ? 'login' : 'signup')
  const [form, setForm] = useState({ displayName: '', username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [creatingAccount, setCreatingAccount] = useState(false)
  const { user, profile, setProfile, loading, error: profileError } = useAuth()

  if (user && profile) {
    return <Navigate to="/dashboard" replace />
  }
  const isSignUp = mode === 'signup'
  // Stay on the sign up form while its new account has no profile yet
  const needsProfile = user && !loading && !profileError && !creatingAccount

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value })

  const run = (action) => async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setSubmitting(true)
    try {
      await action()
    } catch (err) {
      setError(errorMessage(err))
    }
    setSubmitting(false)
  }

  const createProfile = async () => {
    const { username, displayName } = form
    setProfile(await apiFetch('users', { method: 'POST', body: { username, displayName } }))
  }

  // Validate first so a bad username can't leave an account with no profile
  const signUp = run(async () => {
    const fieldsError = profileFieldsError(form)
    if (fieldsError) {
      throw new Error(fieldsError)
    }
    const passwordStatus = await validatePassword(auth, form.password)
    if (!passwordStatus.isValid) {
      throw new Error(passwordPolicyError(passwordStatus))
    }
    setCreatingAccount(true)
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password,
      )
      await createProfileOrDeleteUser(newUser)
    } finally {
      setCreatingAccount(false)
    }
  })

  // Delete the new Firebase account when the profile is rejected, like a taken username
  const createProfileOrDeleteUser = async (newUser) => {
    try {
      await createProfile()
    } catch (err) {
      await deleteUser(newUser)
      throw err
    }
  }

  const logIn = run(() => signInWithEmailAndPassword(auth, form.email, form.password))

  const continueWithGoogle = run(async () => {
    const result = await signInWithPopup(auth, new GoogleAuthProvider())
    setForm((current) => ({
      ...current,
      displayName: current.displayName || result.user.displayName || '',
    }))
  })

  const resetPassword = run(async () => {
    await sendPasswordResetEmail(auth, form.email)
    setNotice(`Sent a password reset link to ${form.email}.`)
  })

  const messages = (
    <>
      {error && (
        <p className="auth-message auth-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="auth-message auth-notice">{notice}</p>}
    </>
  )

  const googleButton = (
    <button
      type="button"
      className="button button-light auth-google"
      onClick={continueWithGoogle}
      disabled={submitting}
    >
      Continue with Google
    </button>
  )

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
          {user && profileError ? (
            <div className="auth-panel">
              <p className="auth-message auth-error" role="alert">
                Could not load your profile: {profileError}
              </p>
              <button
                type="button"
                className="button button-primary"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          ) : needsProfile ? (
            <form className="auth-panel" onSubmit={run(createProfile)}>
              <h2 className="auth-heading">Finish your profile</h2>
              <p className="switch-prompt">Signed in as {user.email}</p>
              <ProfileFields form={form} update={update} />
              {messages}
              <button type="submit" className="button button-primary" disabled={submitting}>
                Continue
              </button>
              <p className="switch-prompt">
                <button type="button" className="switch-link" onClick={() => signOut(auth)}>
                  Use a different account
                </button>
              </p>
            </form>
          ) : (
            <>
              <AuthTabs isSignUp={isSignUp} setMode={setMode} />
              {isSignUp ? (
                <form
                  className="auth-panel"
                  role="tabpanel"
                  id="panel-signup"
                  aria-labelledby="tab-signup"
                  onSubmit={signUp}
                >
                  <ProfileFields form={form} update={update} />
                  <EmailPasswordFields
                    form={form}
                    update={update}
                    passwordAutoComplete="new-password"
                  />
                  {messages}
                  <button type="submit" className="button button-primary" disabled={submitting}>
                    Sign Up
                  </button>
                  {googleButton}
                  <p className="switch-prompt">
                    Already have an account?{' '}
                    <button type="button" className="switch-link" onClick={() => setMode('login')}>
                      Log in
                    </button>
                  </p>
                </form>
              ) : (
                <form
                  className="auth-panel"
                  role="tabpanel"
                  id="panel-login"
                  aria-labelledby="tab-login"
                  onSubmit={logIn}
                >
                  <EmailPasswordFields
                    form={form}
                    update={update}
                    passwordAutoComplete="current-password"
                  />
                  {messages}
                  <button type="submit" className="button button-primary" disabled={submitting}>
                    Log In
                  </button>
                  {googleButton}
                  <p className="switch-prompt">
                    <button type="button" className="switch-link" onClick={resetPassword}>
                      Forgot password?
                    </button>
                  </p>
                </form>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}
