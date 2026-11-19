import sharp from 'sharp'

// Gemini scales box coordinates to 0-1000 on each axis
const BOX_SCALE = 1000

// Formats auto-populate takes, GIFs are left out since they can be animated
const SUPPORTED_FORMATS = ['jpeg', 'png', 'webp']

// Sharp reports AVIF and HEIC both as heif, and this build only decodes the AVIF kind
export async function isSupportedPhoto(photo) {
  try {
    const { format, compression } = await sharp(photo).metadata()
    if (format === 'heif') {
      return compression === 'av1'
    }
    return SUPPORTED_FORMATS.includes(format)
  } catch {
    // Not an image at all, like a video renamed to .jpg
    return false
  }
}

// Apply the EXIF rotation so the model and the crops see the photo upright
export function uprightJpeg(photo) {
  return sharp(photo).rotate().jpeg().toBuffer()
}

// A box with no area would make sharp throw
export function hasArea([ymin, xmin, ymax, xmax]) {
  return ymax > ymin && xmax > xmin
}

function pixelRegion([ymin, xmin, ymax, xmax], imageWidth, imageHeight) {
  const left = Math.round((xmin / BOX_SCALE) * imageWidth)
  const top = Math.round((ymin / BOX_SCALE) * imageHeight)
  const right = Math.round((xmax / BOX_SCALE) * imageWidth)
  const bottom = Math.round((ymax / BOX_SCALE) * imageHeight)
  return { left, top, width: right - left, height: bottom - top }
}

export async function cropBox(image, box) {
  const { width, height } = await sharp(image).metadata()
  return sharp(image)
    .extract(pixelRegion(box, width, height))
    .jpeg()
    .toBuffer()
}
