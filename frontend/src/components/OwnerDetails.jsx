import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import Avatar from './Avatar.jsx'

// Owner is null when they hid their profile
export default function OwnerDetails({ owner }) {
  return (
    <div className="browse-owner-details">
      <p className="browse-owner">
        {owner ? (
          <Link to={`/profile/${owner.username}`} className="browse-owner-link">
            <Avatar
              photo={owner.photo}
              name={owner.displayName}
              username={owner.username}
              className="browse-owner-avatar"
            />
            <span>{owner.displayName}</span>
          </Link>
        ) : (
          <span>Community member</span>
        )}
      </p>
      {owner?.campusArea && (
        <p className="browse-location">
          <MapPin size={12} aria-hidden="true" />
          {/* A span so a long area name can end in an ellipsis inside the flex row */}
          <span>{owner.campusArea}</span>
        </p>
      )}
    </div>
  )
}
