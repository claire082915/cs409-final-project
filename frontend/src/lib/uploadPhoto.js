import { apiFetch } from './api.js'

// Signs the upload with our API, sends the file straight to Cloudinary and returns its URL
export async function uploadPhoto(file) {
  const { cloudName, apiKey, timestamp, folder, signature } = await apiFetch('uploads/signature', {
    method: 'POST',
  })
  const form = new FormData()
  form.append('file', file)
  form.append('api_key', apiKey)
  form.append('timestamp', timestamp)
  form.append('folder', folder)
  form.append('signature', signature)
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  })
  const body = await response.json()
  if (!response.ok) {
    throw new Error(body.error.message)
  }
  return body.secure_url
}
