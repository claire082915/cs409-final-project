import { useState } from 'react'
import { Bell, LockKeyhole, Save, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import AppShell from '../components/AppShell.jsx'
import CityInput from '../components/CityInput.jsx'
import ProfilePhotoPicker from '../components/ProfilePhotoPicker.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { apiFetch } from '../lib/api.js'
import { uploadPhoto } from '../lib/uploadPhoto.js'
import UnsavedChangesPrompt from '../components/UnsavedChangesPrompt.jsx'
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

// City and ZIP code are missing on profiles created before they existed
function formFromProfile(profile) {
  return {
    displayName: profile.displayName,
    username: profile.username,
    city: profile.city ?? '',
    zipCode: profile.zipCode ?? '',
    photo: profile.photo ?? '',
  }
}

function hasChanges(current, saved) {
  for (const key of Object.keys(current)) {
    if (current[key] !== saved[key]) {
      return true
    }
  }
  return false
}

export default function SettingsPage() {
  const { profile, setProfile } = useAuth()
  const [form, setForm] = useState(() => formFromProfile(profile))
  const [preferences, setPreferences] = useState(readPreferences)
  const [savedPreferences, setSavedPreferences] = useState(readPreferences)
  // A picked photo stays in the browser until Save uploads it
  const [pendingPhoto, setPendingPhoto] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const hasUnsavedChanges =
    hasChanges(form, formFromProfile(profile)) ||
    hasChanges(preferences, savedPreferences) ||
    pendingPhoto !== null

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }))

  const updateForm = (event) => setField(event.target.name, event.target.value)

  const togglePreference = (key) =>
    setPreferences((current) => ({ ...current, [key]: !current[key] }))

  const saveSettings = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    localStorage.setItem('lendrPreferences', JSON.stringify(preferences))
    setSavedPreferences(preferences)
    try {
      const photo = pendingPhoto ? await uploadPhoto(pendingPhoto) : form.photo
      const updated = await apiFetch('users/me', {
        method: 'PATCH',
        body: {
          displayName: form.displayName.trim(),
          username: form.username.trim().replace(/^@/, ''),
          city: form.city.trim(),
          zipCode: form.zipCode.trim(),
          photo,
        },
      })
      setProfile(updated)
      setForm(formFromProfile(updated))
      setPendingPhoto(null)
      toast.success('Settings saved')
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  return (
    <AppShell>
      <UnsavedChangesPrompt when={hasUnsavedChanges} />
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
              <ProfilePhotoPicker
                photo={form.photo}
                file={pendingPhoto}
                onSelect={setPendingPhoto}
                onRemove={() => {
                  setPendingPhoto(null)
                  setField('photo', '')
                }}
                isDisabled={saving}
              />
              <div className="settings-fields">
                <label>
                  Display name
                  <input
                    name="displayName"
                    value={form.displayName}
                    onChange={updateForm}
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
                      value={form.username}
                      onChange={updateForm}
                      placeholder="yourusername"
                      autoComplete="username"
                    />
                  </div>
                </label>
                <label>
                  City
                  <CityInput
                    aria-label="City"
                    name="city"
                    value={form.city}
                    onChange={(city) => setField('city', city)}
                    autoComplete="off"
                  />
                </label>
                <label>
                  ZIP code
                  <input
                    name="zipCode"
                    value={form.zipCode}
                    onChange={updateForm}
                    inputMode="numeric"
                    maxLength={5}
                    autoComplete="postal-code"
                  />
                </label>
                <label className="settings-field-wide">
                  Email address
                  <input name="email" type="email" value={profile.email} readOnly />
                </label>
              </div>
              <p className="settings-note">
                <LockKeyhole size={14} />
                Your email comes from your sign in account and can't be changed here.
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
              <p>Your profile is saved to your account, preferences stay on this device.</p>
            </div>
            <button type="submit" disabled={saving || !hasUnsavedChanges}>
              <Save size={16} />
              {saving ? 'Saving...' : 'Save settings'}
            </button>
            {error && (
              <span className="settings-error" role="alert">
                {error}
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
