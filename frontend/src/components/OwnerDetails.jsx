import { Link } from 'react-router-dom'
import { MapPin, UserRound } from 'lucide-react'
import Avatar from './Avatar.jsx'
import Reputation from './Reputation.jsx'

// Hidden profiles come without a name, username or photo, so they show as a plain community member
function OwnerName({ owner }) {
  if (!owner.username) {
    return (
      <span className="browse-owner-hidden">
        <span className="browse-owner-avatar browse-owner-placeholder" aria-hidden="true">
          <UserRound size={12} />
        </span>
        <span>Community member</span>
      </span>
    )
  }
  return (
    <Link to={`/profile/${owner.username}`} className="browse-owner-link">
      <Avatar
        photo={owner.photo}
        name={owner.displayName}
        username={owner.username}
        className="browse-owner-avatar"
      />
      <span>{owner.displayName}</span>
    </Link>
  )
}

export default function OwnerDetails({ owner, children }) {
  return (
    <div className="browse-owner-details">
      <p className="browse-owner">
        <OwnerName owner={owner} />
      </p>
      {owner.campusArea && (
        <p className="browse-location">
          <MapPin size={12} aria-hidden="true" />
          {/* A span so a long area name can end in an ellipsis inside the flex row */}
          <span>{owner.campusArea}</span>
        </p>
      )}
      {/* Loan owners on the requests pages come without one, null means unrated */}
      {owner.reputation !== undefined && (
        <p className="browse-location">
          <Reputation reputation={owner.reputation} />
        </p>
      )}
      {children}
    </div>
  )
}
