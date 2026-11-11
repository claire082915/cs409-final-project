import { useState } from 'react'
import { Bell, Check, LockKeyhole, Save, UserRound } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import '../styles/pages/settings.css'

const DEFAULT_PREFERENCES = {
  borrowRequests: true,
  dueDateReminders: true,
  communityUpdates: false,
  showProfile: true,
}

function readPreferences() {
  try {
    return {
      ...DEFAULT_PREFERENCES,
      ...JSON.parse(localStorage.getItem('lendrPreferences') || '{}'),
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    displayName: localStorage.getItem('lendrDisplayName') || '',
    username: localStorage.getItem('lendrUsername') || '',
    email: localStorage.getItem('lendrEmail') || '',
  })
  const [preferences, setPreferences] = useState(readPreferences)
  const [saved, setSaved] = useState(false)

  const updateProfile = (event) => {
    const { name, value } = event.target
    setProfile((current) => ({ ...current, [name]: value }))
    setSaved(false)
  }

  const togglePreference = (key) => {
    setPreferences((current) => ({ ...current, [key]: !current[key] }))
    setSaved(false)
  }

  const saveSettings = (event) => {
    event.preventDefault()
    const displayName = profile.displayName.trim()
    const username = profile.username.trim().replace(/^@/, '')
    const email = profile.email.trim()
    if (displayName) localStorage.setItem('lendrDisplayName', displayName)
    else localStorage.removeItem('lendrDisplayName')
    if (username) localStorage.setItem('lendrUsername', username)
    else localStorage.removeItem('lendrUsername')
    if (email) localStorage.setItem('lendrEmail', email)
    else localStorage.removeItem('lendrEmail')
    localStorage.setItem('lendrPreferences', JSON.stringify(preferences))
    setProfile({ displayName, username, email })
    setSaved(true)
  }

  return (
    <AppShell>
      <main className="settings-page">
        <header className="settings-heading">
          <div>
            <p className="settings-eyebrow">YOUR ACCOUNT</p>
            <h1>Settings</h1>
            <p>Manage your profile and how Lendr keeps you updated.</p>
          </div>
        </header>
        <form className="settings-layout" onSubmit={saveSettings}>
          <div className="settings-sections">
            <section className="settings-card" aria-labelledby="profile-settings-heading">
              <div className="settings-card-heading">
                <span className="settings-icon">
                  <UserRound size={18} />
                </span>
                <div>
                  <h2 id="profile-settings-heading">Profile information</h2>
                  <p>These details help your community know who they’re lending to.</p>
                </div>
              </div>
              <div className="settings-fields">
                <label>
                  Display name
                  <input
                    name="displayName"
                    value={profile.displayName}
                    onChange={updateProfile}
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </label>
                <label>
                  Username
                  <div className="settings-username">
                    <span>@</span>
                    <input
                      name="username"
                      value={profile.username}
                      onChange={updateProfile}
                      placeholder="yourusername"
                      autoComplete="username"
                    />
                  </div>
                </label>
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    value={profile.email}
                    onChange={updateProfile}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </label>
              </div>
              <p className="settings-note">
                <LockKeyhole size={14} />
                Profile details are saved in this browser for now.
              </p>
            </section>
            <section className="settings-card" aria-labelledby="notifications-heading">
              <div className="settings-card-heading">
                <span className="settings-icon">
                  <Bell size={18} />
                </span>
                <div>
                  <h2 id="notifications-heading">Notifications and privacy</h2>
                  <p>Choose which updates you want to see.</p>
                </div>
              </div>
              <div className="settings-options">
                <SettingToggle
                  label="Borrow requests"
                  description="Get notified when someone requests one of your items."
                  checked={preferences.borrowRequests}
                  onChange={() => togglePreference('borrowRequests')}
                />
                <SettingToggle
                  label="Return reminders"
                  description="Get reminders when a borrowed item is due soon."
                  checked={preferences.dueDateReminders}
                  onChange={() => togglePreference('dueDateReminders')}
                />
                <SettingToggle
                  label="Community updates"
                  description="Hear about new features and community activity."
                  checked={preferences.communityUpdates}
                  onChange={() => togglePreference('communityUpdates')}
                />
                <SettingToggle
                  label="Show my profile in the community"
                  description="Let other members see your name and username on listings."
                  checked={preferences.showProfile}
                  onChange={() => togglePreference('showProfile')}
                />
              </div>
            </section>
          </div>
          <aside className="settings-save-panel">
            <div>
              <strong>Save your changes</strong>
              <p>Your profile and preferences stay on this device.</p>
            </div>
            <button type="submit">
              <Save size={16} />
              Save settings
            </button>
            {saved && (
              <span className="settings-saved" role="status">
                <Check size={15} />
                Settings saved
              </span>
            )}
          </aside>
        </form>
      </main>
    </AppShell>
  )
}

function SettingToggle({ label, description, checked, onChange }) {
  return (
    <label className="settings-toggle-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <i aria-hidden="true" />
    </label>
  )
}
