import React from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

function App() {
  return (
    <main className="check-page">
      <div className="check-card">
        <span className="check-mark" aria-hidden="true">✓</span>
        <h1>Lendr frontend is running</h1>
        <p>React rendered successfully.</p>
      </div>
    </main>
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
