import { useEffect, useState } from 'react'

export default function AppLoader() {
  const [waking, setWaking] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => setWaking(true), 3000)
    return () => window.clearTimeout(timeout)
  }, [])

  return (
    <main className="app-loader" role="status" aria-live="polite">
      <div className="app-loader-content">
        <span className="app-loader-mark" aria-hidden="true">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
        </span>
        <strong>{waking ? 'The server is waking up…' : 'Connecting…'}</strong>
        <small>
          {waking ? 'This can take a moment on the first visit.' : 'Getting Lendr ready.'}
        </small>
      </div>
    </main>
  )
}
