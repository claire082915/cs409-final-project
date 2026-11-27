import { Link } from 'react-router-dom'
import Avatar from './Avatar.jsx'
import '../styles/components/person-link.css'

// A deleted account has no username, so it shows without a link
export default function PersonLink({ person }) {
  const name =
    person?.displayName || (person?.username ? `@${person.username}` : 'Community member')
  const content = (
    <>
      <Avatar
        photo={person?.photo}
        name={name}
        username={person?.username || 'community'}
        className="avatar-small"
      />
      <span className="person-link-name">{name}</span>
    </>
  )
  if (!person?.username) {
    return <span className="person-link">{content}</span>
  }
  return (
    <Link to={`/profile/${person.username}`} className="person-link">
      {content}
    </Link>
  )
}
