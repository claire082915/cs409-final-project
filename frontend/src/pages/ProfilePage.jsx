import { Fragment, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CalendarDays, MapPin, UserRound } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import ItemCard from '../components/ItemCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import AppLoader from '../components/AppLoader.jsx'
import Avatar from '../components/Avatar.jsx'
import BorrowItemDialog from '../components/BorrowItemDialog.jsx'
import Reputation from '../components/Reputation.jsx'
import TrustBadge from '../components/TrustBadge.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { apiFetch } from '../lib/api.js'
import { MOCK_ITEMS } from '../lib/mockItems.js'
import { findMockProfile } from '../lib/mockProfiles.js'
import '../styles/pages/browse-borrow.css'
import '../styles/pages/profile.css'

function joinedLabel(joinedAt) {
  const month = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(
    new Date(joinedAt),
  )
  return `Joined ${month}`
}

function timesLabel(count) {
  return count === 1 ? '1 time' : `${count} times`
}

// Puts a dot between each fact
function FactLine({ facts }) {
  return (
    <p className="profile-facts">
      {facts.map((fact, index) => (
        <Fragment key={index}>
          {index > 0 && <span aria-hidden="true">·</span>}
          {fact}
        </Fragment>
      ))}
    </p>
  )
}

// Leaves a section out when it has no items
function ItemSection({ title, items, onOpenItem }) {
  if (items.length === 0) {
    return null
  }
  return (
    <section>
      <h2 className="count-label profile-section-label">
        <span>{title}</span>
        <small>{items.length}</small>
      </h2>
      <div className="item-grid">
        {items.map((item) => (
          <ItemCard key={item._id} item={item} onOpen={onOpenItem && (() => onOpenItem(item))} />
        ))}
      </div>
    </section>
  )
}

function ProfileDetails({ profile, onOpenItem }) {
  const availableItems = []
  const lentItems = []
  for (const item of profile.items) {
    if (item.available === false) {
      lentItems.push(item)
    } else {
      availableItems.push(item)
    }
  }
  return (
    <>
      <header className="profile-heading">
        <div className="profile-photo-column">
          <Avatar
            photo={profile.photo}
            name={profile.displayName}
            username={profile.username}
            className="profile-page-avatar"
          />
          <Reputation reputation={profile.reputation} />
          <TrustBadge trust={profile.trust} />
        </div>
        <div>
          <h1>{profile.displayName}</h1>
          <p className="profile-facts">@{profile.username}</p>
          {/* Matches the Not specified on listing cards */}
          <p className="profile-facts">
            <MapPin size={14} aria-hidden="true" />
            {profile.campusArea || 'Not specified'}
          </p>
          <p className="profile-facts">
            <CalendarDays size={14} aria-hidden="true" />
            {joinedLabel(profile.joinedAt)}
          </p>
          <FactLine
            facts={[
              `Lent ${timesLabel(profile.lentCount)}`,
              `Borrowed ${timesLabel(profile.borrowedCount)}`,
            ]}
          />
        </div>
      </header>
      {profile.items.length === 0 ? (
        <p className="profile-empty">No items listed yet.</p>
      ) : (
        <>
          <ItemSection title="Available" items={availableItems} onOpenItem={onOpenItem} />
          <ItemSection title="Lent" items={lentItems} onOpenItem={onOpenItem} />
        </>
      )}
    </>
  )
}

// People from the mock data open a mock profile, anyone else comes from the backend
export default function ProfilePage() {
  const { username } = useParams()
  const { profile: viewer } = useAuth()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const isOwnProfile = username === viewer.username

  useEffect(() => {
    setError('')
    const mockProfile = findMockProfile(username)
    if (mockProfile) {
      setProfile(mockProfile)
      return
    }
    let cancelled = false
    setProfile(null)
    apiFetch(`users/${encodeURIComponent(username)}`)
      .then((data) => {
        if (!cancelled) setProfile(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [username])

  return (
    <AppShell>
      <main className="profile-page">
        {error ? (
          <EmptyState icon={UserRound} title="Profile not available">
            <span>This person might have hidden their profile.</span>
          </EmptyState>
        ) : profile ? (
          <ProfileDetails profile={profile} onOpenItem={isOwnProfile ? null : setSelectedItem} />
        ) : (
          <AppLoader inline label="Loading profile..." />
        )}
        {selectedItem && (
          <BorrowItemDialog
            item={{ ...selectedItem, owner: profile }}
            isMock={MOCK_ITEMS.includes(selectedItem)}
            onClose={() => setSelectedItem(null)}
            onSent={(message) => {
              toast.success(message)
              setSelectedItem(null)
            }}
          />
        )}
      </main>
    </AppShell>
  )
}
