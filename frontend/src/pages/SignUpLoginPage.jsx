import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  getAdditionalUserInfo,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signInWithPopup,
  signOut,
  validatePassword,
} from 'firebase/auth'
import { auth } from '../lib/firebase.js'
import { apiFetch, fetchDemoToken } from '../lib/api.js'
import { useAuth } from '../auth/AuthContext.jsx'
import {
  DEMO_EMAIL_DOMAIN,
  SCHOOL_DOMAIN,
  isAllowedEmail,
  netIdToEmail,
} from '../auth/schoolEmail.js'
import Logo from '../components/Logo.jsx'
import AppLoader from '../components/AppLoader.jsx'
import PendingLabel from '../components/PendingLabel.jsx'
import ItemCardsVisual from '../components/ItemCardsVisual.jsx'
import '../styles/pages/sign-up-login.css'

const FIREBASE_ERRORS = {
  'auth/email-already-in-use': 'An account with this NetID already exists.',
  'auth/invalid-credential': 'Wrong NetID or password.',
  'auth/invalid-email': 'Enter a valid NetID.',
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
const NETID_MIN_LENGTH = 3
const NETID_MAX_LENGTH = 8

function errorMessage(err) {
  if (FIREBASE_ERRORS[err.code]) {
    return FIREBASE_ERRORS[err.code]
  }
  if (err.code?.startsWith('auth/')) {
    return 'Something went wrong signing in. Try again.'
  }
  return err.message
}

// The input caps the length, so only a short NetID needs a message
function netIdError(netId) {
  if (netId.trim().length < NETID_MIN_LENGTH) {
    return `NetID must be ${NETID_MIN_LENGTH} to ${NETID_MAX_LENGTH} characters.`
  }
  return null
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

// Show only school accounts in the Google picker, the backend still checks since this is a hint
const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ hd: SCHOOL_DOMAIN })

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
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}

// Action sits at the right end of the label row, like Forgot password
function Field({ id, label, action, children }) {
  return (
    <div className="field">
      <div className="field-label-row">
        <label htmlFor={id}>{label}</label>
        {action}
      </div>
      {children}
    </div>
  )
}

function ProfileFields({ form, update }) {
  return (
    <>
      <Field id="profile-name" label="Display Name">
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

function EmailPasswordFields({ form, update, updateNetId, passwordAutoComplete, passwordAction }) {
  return (
    <>
      <Field id="auth-email" label="NetID">
        <div className="netid-wrap">
          <input
            id="auth-email"
            name="netId"
            placeholder="Enter your NetID"
            maxLength={NETID_MAX_LENGTH}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck="false"
            value={form.netId}
            onChange={updateNetId}
          />
          <span className="netid-suffix" aria-hidden="true">
            @{SCHOOL_DOMAIN}
          </span>
        </div>
      </Field>
      <Field id="auth-password" label="Password" action={passwordAction}>
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
        Sign up
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
        Log in
      </button>
    </div>
  )
}

export default function SignUpLoginPage() {
  // Open on the tab that matches the route (/login or /signup)
  const { pathname } = useLocation()
  const [mode, setMode] = useState(pathname.includes('login') ? 'login' : 'signup')
  const [form, setForm] = useState({ displayName: '', username: '', netId: '', password: '' })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [creatingAccount, setCreatingAccount] = useState(false)
  const { user, profile, setProfile, refreshUser, loading, error: profileError } = useAuth()

  if (user && profile && user.emailVerified) {
    return <Navigate to="/dashboard" replace />
  }
  // Show the loader while a new sign in loads its profile or sign up saves one
  if (user && (loading || creatingAccount)) {
    return <AppLoader />
  }
  const isSignUp = mode === 'signup'
  const needsProfile = user && !profileError

  const update = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
    setError('')
  }

  // Keep only the NetID when someone pastes a whole address
  const updateNetId = (event) => {
    setForm({ ...form, netId: event.target.value.split('@')[0] })
    setError('')
  }
  const email = netIdToEmail(form.netId)

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
    const fieldsError = profileFieldsError(form) ?? netIdError(form.netId)
    if (fieldsError) {
      throw new Error(fieldsError)
    }
    const passwordStatus = await validatePassword(auth, form.password)
    if (!passwordStatus.isValid) {
      throw new Error(passwordPolicyError(passwordStatus))
    }
    setCreatingAccount(true)
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, form.password)
      await createProfileOrDeleteUser(newUser)
      await sendEmailVerification(newUser)
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

  const logIn = run(async () => {
    const fieldsError = netIdError(form.netId)
    if (fieldsError) {
      throw new Error(fieldsError)
    }
    await signInWithEmailAndPassword(auth, email, form.password)
  })

  const continueWithGoogle = run(async () => {
    const result = await signInWithPopup(auth, googleProvider)
    if (!isAllowedEmail(result.user.email)) {
      await removeOutsideAccount(result)
      throw new Error(`Use your ${SCHOOL_DOMAIN} Google account.`)
    }
    setForm((current) => ({
      ...current,
      displayName: current.displayName || result.user.displayName || '',
    }))
  })

  // Demo only, the backend makes the demo account and its profile, so this lands on the dashboard
  const continueAsDemo = run(async () => {
    await signInWithCustomToken(auth, await fetchDemoToken())
  })

  // Delete accounts Firebase just made so outside sign ins don't pile up, older ones only sign out
  const removeOutsideAccount = async (result) => {
    if (getAdditionalUserInfo(result).isNewUser) {
      await deleteUser(result.user)
    } else {
      await signOut(auth)
    }
  }

  const checkVerified = run(async () => {
    await refreshUser()
    if (!auth.currentUser.emailVerified) {
      throw new Error('Your email is not verified yet. Open the link we sent, then try again.')
    }
  })

  const resendVerification = run(async () => {
    await sendEmailVerification(user)
    setNotice(`Sent a new link to ${user.email}.`)
  })

  const resetPassword = run(async () => {
    const fieldsError = netIdError(form.netId)
    if (fieldsError) {
      throw new Error(fieldsError)
    }
    await sendPasswordResetEmail(auth, email)
    setNotice(`Sent a password reset link to ${email}.`)
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
      className="button button-light"
      onClick={continueWithGoogle}
      disabled={submitting}
    >
      Continue with Google Apps @ Illinois
    </button>
  )

  // Demo only, hidden unless the demo domain is set
  const demoButton = DEMO_EMAIL_DOMAIN && (
    <button
      type="button"
      className="button button-light auth-demo-button"
      onClick={continueAsDemo}
      disabled={submitting}
    >
      Try the demo
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
            <ItemCardsVisual />
          </div>
        </section>

        <section className="auth-card">
          {user && !isAllowedEmail(user.email) ? (
            <div className="auth-panel">
              <p className="auth-message auth-error" role="alert">
                Lendr is only for {SCHOOL_DOMAIN} accounts, and you are signed in as {user.email}.
              </p>
              <button type="button" className="button button-primary" onClick={() => signOut(auth)}>
                Use a different account
              </button>
            </div>
          ) : user && !user.emailVerified ? (
            <div className="auth-panel">
              <h2 className="auth-heading">Verify your email</h2>
              <p className="auth-text">
                We sent a verification link to
                <strong className="auth-text-email">{user.email}</strong>
              </p>
              {messages}
              <button
                type="button"
                className="button button-primary"
                onClick={checkVerified}
                disabled={submitting}
              >
                <PendingLabel pending={submitting}>I've verified</PendingLabel>
              </button>
              <button
                type="button"
                className="button button-light"
                onClick={resendVerification}
                disabled={submitting}
              >
                Resend email
              </button>
              <p className="switch-prompt">
                <button type="button" className="switch-link" onClick={() => signOut(auth)}>
                  Use a different account
                </button>
              </p>
            </div>
          ) : user && profileError ? (
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
              <p className="auth-text">Signed in as {user.email}</p>
              <ProfileFields form={form} update={update} />
              {messages}
              <button type="submit" className="button button-primary" disabled={submitting}>
                <PendingLabel pending={submitting}>Continue</PendingLabel>
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
                    updateNetId={updateNetId}
                    passwordAutoComplete="new-password"
                  />
                  {messages}
                  {/* The demo sits beside the main button so it's as easy to find */}
                  <div className="auth-button-row">
                    <button type="submit" className="button button-primary" disabled={submitting}>
                      <PendingLabel pending={submitting}>Sign up</PendingLabel>
                    </button>
                    {demoButton}
                  </div>
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
                    updateNetId={updateNetId}
                    passwordAutoComplete="current-password"
                    passwordAction={
                      <button type="button" className="switch-link" onClick={resetPassword}>
                        Forgot password?
                      </button>
                    }
                  />
                  {messages}
                  <div className="auth-button-row">
                    <button type="submit" className="button button-primary" disabled={submitting}>
                      Log in
                    </button>
                    {demoButton}
                  </div>
                  {googleButton}
                  <p className="switch-prompt">
                    Don&apos;t have an account?{' '}
                    <button type="button" className="switch-link" onClick={() => setMode('signup')}>
                      Sign up
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
