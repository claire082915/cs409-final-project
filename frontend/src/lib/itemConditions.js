// Same list as the backend's item model
export const ITEM_CONDITIONS = ['New', 'Like new', 'Good', 'Fair']
// Shown for a null condition, which the backend stores when the owner didn't say
export const NO_CONDITION = 'Not specified'

// The pickers need a text option, the backend stores a missing condition as null
export function storedCondition(label) {
  return label === NO_CONDITION ? null : label
}
