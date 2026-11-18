// Shallow compare of form values against the saved ones
export function hasChanges(current, saved) {
  for (const key of Object.keys(current)) {
    if (current[key] !== saved[key]) {
      return true
    }
  }
  return false
}
