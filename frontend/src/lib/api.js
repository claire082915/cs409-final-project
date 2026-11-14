import { auth } from './firebase.js'

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'https://lendr-api.onrender.com/api'
).replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

// Returns the response's data, Firebase refreshes the token when it is about to expire
export async function apiFetch(path, { method = 'GET', body } = {}) {
  if (!auth.currentUser) {
    throw new ApiError('Not signed in', 401)
  }
  const token = await auth.currentUser.getIdToken()
  const headers = { Authorization: `Bearer ${token}` }
  if (body) {
    headers['Content-Type'] = 'application/json'
  }
  const response = await fetch(`${API_BASE}/${path}`, {
    method,
    headers,
    body: body && JSON.stringify(body),
  })
  if (response.status === 204) {
    return null
  }
  // Default error pages and Render's wake-up pages are HTML, so fall back to an empty body
  const { message, data } = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(message || `Request failed with status ${response.status}`, response.status)
  }
  return data
}
