import { v2 as cloudinary } from 'cloudinary'

// Each user uploads into their own folder so an item can only hold its owner's photos
function userFolder(userId) {
  return `lendr/${userId}`
}

// Sign the params the browser sends to Cloudinary
export function signUpload(userId) {
  const { cloud_name, api_key, api_secret } = cloudinary.config()
  const timestamp = Math.round(Date.now() / 1000)
  const folder = userFolder(userId)
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, api_secret)
  return { cloudName: cloud_name, apiKey: api_key, timestamp, folder, signature }
}

function uploadUrlPrefix() {
  const { cloud_name } = cloudinary.config()
  return `https://res.cloudinary.com/${cloud_name}/image/upload/`
}

// Upload URLs look like <prefix>v1761940000/lendr/<userId>/abc123.jpg, the public id is lendr/<userId>/abc123
function publicIdFromUrl(url) {
  return url
    .slice(uploadUrlPrefix().length)
    .replace(/^v\d+\//, '')
    .replace(/\.[^/.]+$/, '')
}

// Only accept images from our Cloudinary account that this user uploaded
export function isUserPhotoUrl(url, userId) {
  // Require the normalized form so ../ segments can't point into another user's folder
  if (!URL.canParse(url) || new URL(url).href !== url) {
    return false
  }
  if (!url.startsWith(uploadUrlPrefix())) {
    return false
  }
  return publicIdFromUrl(url).startsWith(`${userFolder(userId)}/`)
}

export async function deletePhotos(urls) {
  const publicIds = urls.map(publicIdFromUrl)
  await Promise.all(publicIds.map((publicId) => cloudinary.uploader.destroy(publicId)))
}
