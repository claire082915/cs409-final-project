import imageCompression from 'browser-image-compression'

// Picked by eye, sharp enough for the largest photo the app shows
const MAX_SIDE_PX = 1600
// A guess that keeps uploads quick on phone data
const MAX_SIZE_MB = 1

// The auto-populate room photo skips this so detection keeps every detail
export function compressPhoto(file) {
  return imageCompression(file, {
    maxWidthOrHeight: MAX_SIDE_PX,
    maxSizeMB: MAX_SIZE_MB,
    useWebWorker: true,
  })
}
