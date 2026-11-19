// Same list as the backend, no GIFs or HEIC
export const SUPPORTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

// Browsers leave the type empty for some formats like HEIC, so fall back to the extension
function fileTypeName(file) {
  return (file.type.split('/')[1] || file.name.split('.').pop()).toUpperCase()
}

// Empty when the photo is fine
export function photoTypeError(file) {
  if (SUPPORTED_PHOTO_TYPES.includes(file.type)) {
    return ''
  }
  return `Can't read ${fileTypeName(file)} files. Use a JPEG or PNG photo instead.`
}
