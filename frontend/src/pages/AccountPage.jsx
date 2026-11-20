import { useState } from 'react'
import { Bell, Save, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import AppShell from '../components/AppShell.jsx'
import PendingLabel from '../components/PendingLabel.jsx'
import Reputation from '../components/Reputation.jsx'
import SelectMenu from '../components/SelectMenu.jsx'
import ProfilePhotoPicker from '../components/ProfilePhotoPicker.jsx'
import Tooltip from '../components/Tooltip.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { isDemoEmail } from '../auth/schoolEmail.js'
import { apiFetch } from '../lib/api.js'
import { CAMPUS_AREAS } from '../lib/campusAreas.js'
import { uploadPhoto } from '../lib/uploadPhoto.js'
import { hasChanges } from '../lib/hasChanges.js'
import UnsavedChangesPrompt from '../components/UnsavedChangesPrompt.jsx'
import '../styles/pages/account.css'

const NO_CAMPUS_AREA = 'Not set'
const CAMPUS_AREA_OPTIONS = [NO_CAMPUS_AREA, ...CAMPUS_AREAS]

// Campus area is missing on profiles created before it existed
function formFromProfile(profile) {
  return {
    displayName: profile.displayName,
    username: profile.username,
    campusArea: profile.campusArea ?? '',
    photo: profile.photo ?? '',
  }
}

export default function AccountPage() {
  const { profile, setProfile } = useAuth()
  const [form, setForm] = useState(() => formFromProfile(profile))
  // Defaults for preferences come from the backend, so every profile has each one
  const [preferences, setPreferences] = useState(() => ({ ...profile.preferences }))
  // A picked photo stays in the browser until Save uploads it
  const [pendingPhoto, setPendingPhoto] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isDemo = isDemoEmail(profile.email)

  const hasUnsavedChanges =
    hasChanges(form, formFromProfile(profile)) ||
    hasChanges(preferences, profile.preferences) ||
    pendingPhoto !== null

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }))

  const updateForm = (event) => setField(event.target.name, event.target.value)

  // The menu fires no form change event, so clear the save error here too
  const updateCampusArea = (area) => {
    setField('campusArea', area === NO_CAMPUS_AREA ? '' : area)
    setError('')
  }

  const discardChanges = () => {
    setForm(formFromProfile(profile))
    setPreferences({ ...profile.preferences })
    setPendingPhoto(null)
    setError('')
  }

  const togglePreference = (key) =>
    setPreferences((current) => ({ ...current, [key]: !current[key] }))

  const saveChanges = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const photo = pendingPhoto ? await uploadPhoto(pendingPhoto) : form.photo
      const updated = await apiFetch('users/me', {
        method: 'PATCH',
        body: {
          displayName: form.displayName.trim(),
          username: form.username.trim().replace(/^@/, ''),
          campusArea: form.campusArea,
          photo,
          preferences,
        },
      })
      setProfile(updated)
      setForm(formFromProfile(updated))
      setPreferences({ ...updated.preferences })
      setPendingPhoto(null)
      toast.success('Changes saved')
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  return (
    <AppShell>
      <UnsavedChangesPrompt when={hasUnsavedChanges} />
      <main className="account-page">
        <header className="page-heading">
          <div>
            <h1>Account</h1>
            <p>Manage your profile and how we keep you updated.</p>
          </div>
        </header>
        {/* Clear the last save error once any field changes */}
        <form onSubmit={saveChanges} onChange={() => setError('')}>
          <div className="account-sections">
            <section className="account-card" aria-labelledby="profile-heading">
              <div className="account-card-heading">
                <span className="account-icon">
                  <UserRound size={18} />
                </span>
                <h2 id="profile-heading">Profile</h2>
              </div>
              <div className="account-profile">
                <ProfilePhotoPicker
                  photo={form.photo}
                  name={form.displayName || profile.displayName}
                  username={profile.username}
                  caption={<Reputation reputation={profile.reputation} />}
                  file={pendingPhoto}
                  onSelect={setPendingPhoto}
                  onRemove={() => {
                    setPendingPhoto(null)
                    setField('photo', '')
                  }}
                  isDisabled={saving}
                />
                <div className="account-fields">
                  <label className="form-field">
                    Display name
                    <input
                      name="displayName"
                      value={form.displayName}
                      onChange={updateForm}
                      placeholder="Your name"
                      autoComplete="name"
                    />
                  </label>
                  <label className="form-field">
                    Username
                    <span className="account-username">
                      <span aria-hidden="true">@</span>
                      {/* Demo only, read-only like Email so the tooltip still opens */}
                      <Tooltip text={isDemo ? "Demo accounts can't change their username" : ''}>
                        <input
                          name="username"
                          value={form.username}
                          onChange={updateForm}
                          placeholder="yourusername"
                          autoComplete="username"
                          readOnly={isDemo}
                        />
                      </Tooltip>
                    </span>
                  </label>
                  <label className="form-field">
                    Email
                    {/* Read-only rather than disabled so hover and focus still open the tooltip */}
                    <Tooltip text="Email can't be changed">
                      <input name="email" value={profile.email} readOnly />
                    </Tooltip>
                  </label>
                  <div className="form-field">
                    <span id="campus-area-label">Campus area</span>
                    <SelectMenu
                      className="select-field"
                      aria-labelledby="campus-area-label"
                      options={CAMPUS_AREA_OPTIONS}
                      value={form.campusArea || NO_CAMPUS_AREA}
                      onChange={updateCampusArea}
                    />
                  </div>
                </div>
              </div>
            </section>
            <section className="account-card" aria-labelledby="notifications-heading">
              <div className="account-card-heading">
                <span className="account-icon">
                  <Bell size={18} />
                </span>
                <h2 id="notifications-heading">Notifications and privacy</h2>
              </div>
              <div className="account-options">
                <SettingToggle
                  label="Borrow requests"
                  description="When someone asks to borrow your item"
                  checked={preferences.borrowRequests}
                  onChange={() => togglePreference('borrowRequests')}
                />
                <SettingToggle
                  label="Return reminders"
                  description="Before something you borrowed is due"
                  checked={preferences.dueDateReminders}
                  onChange={() => togglePreference('dueDateReminders')}
                />
                <SettingToggle
                  label="Show my profile in the community"
                  description="Let others find your profile and see your name on listings"
                  checked={preferences.showProfile}
                  onChange={() => togglePreference('showProfile')}
                />
              </div>
            </section>
          </div>
          <div className={`account-save-bar${hasUnsavedChanges ? ' is-visible' : ''}`}>
            <p
              className={`account-save-status${error ? ' is-error' : ''}`}
              role={error ? 'alert' : undefined}
            >
              {error || 'You have unsaved changes'}
            </p>
            <button
              type="button"
              className="action-button action-button-neutral"
              onClick={discardChanges}
              disabled={saving}
            >
              Discard
            </button>
            <button type="submit" className="action-button action-button-teal" disabled={saving}>
              <Save size={16} aria-hidden="true" />
              <PendingLabel pending={saving} pendingText="Saving...">
                Save changes
              </PendingLabel>
            </button>
          </div>
        </form>
      </main>
    </AppShell>
  )
}

// Read only, since ratings come from the people the user lent to or borrowed from
function SettingToggle({ label, description, checked, onChange }) {
  return (
    <label className="account-toggle-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <i aria-hidden="true" />
    </label>
  )
}
