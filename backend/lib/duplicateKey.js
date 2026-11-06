// MongoDB's error code for a write that breaks a unique index
const duplicateKeyCode = 11000

export function isDuplicateKeyError(err) {
  return err.code === duplicateKeyCode
}
