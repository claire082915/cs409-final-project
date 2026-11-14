// What other users see of an owner, null when they turned off Show my profile
export function publicOwner(user) {
  if (user.preferences?.showProfile === false) {
    return null
  }
  return {
    _id: user._id,
    username: user.username,
    displayName: user.displayName,
    photo: user.photo,
  }
}
