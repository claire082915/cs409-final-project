import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PackageOpen, X } from 'lucide-react'
import OwnerDetails from './OwnerDetails.jsx'
import '../styles/pages/browse-borrow.css'

// Shows an item with its owner, children go under the details
export default function ItemDialog({ item, onClose, children }) {
  // A date picker inside handles its own Escape first and stops it, so its calendar closes before the popup
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  // Rendered on the body so the sticky top bar's stacking doesn't put the sidebar over it
  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="modal browse-request-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="borrow-modal-title"
      >
        <button
          className="close-button browse-modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={19} />
        </button>
        <div className="borrow-item-summary">
          <div className="photo-box borrow-item-photo">
            {item.photos?.[0] ? (
              <img src={item.photos[0]} alt={item.name} />
            ) : (
              <PackageOpen size={48} aria-hidden="true" />
            )}
          </div>
          <div className="borrow-item-details">
            <h2 id="borrow-modal-title">{item.name}</h2>
            <OwnerDetails owner={item.owner} />
            {item.category && <p className="borrow-item-tag">{item.category}</p>}
            {item.description && <p className="borrow-item-description">{item.description}</p>}
          </div>
        </div>
        {children}
      </section>
    </div>,
    document.body,
  )
}
