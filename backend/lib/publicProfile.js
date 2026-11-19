// What other users see of an owner, a hidden profile keeps only the area and reputation
export function publicOwner(user, reputation) {
  const isHidden = user.preferences?.showProfile === false
  return {
    _id: user._id,
    username: isHidden ? null : user.username,
    displayName: isHidden ? null : user.displayName,
    photo: isHidden ? null : user.photo,
    campusArea: user.campusArea,
    reputation,
  }
}
