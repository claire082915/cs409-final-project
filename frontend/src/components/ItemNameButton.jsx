import { useCallback, useRef, useState } from 'react'
import Tooltip from './Tooltip.jsx'

// Watches the card body below the photo to tell whether the name is cut off
function useCardNameFit() {
  const [fit, setFit] = useState({ isTruncated: false, cardWidth: 0 })
  const cardBodyRef = useRef(null)
  const observer = useRef(null)
  const nameRef = useCallback((name) => {
    observer.current?.disconnect()
    if (!name) {
      return
    }
    cardBodyRef.current = name.closest('.browse-card-body, .inventory-card-copy')
    // The name's width follows the card body, so watching the body covers both
    observer.current = new ResizeObserver(() =>
      setFit({
        isTruncated: name.scrollWidth > name.clientWidth,
        // Inside the card's light border, so the dark tooltip lines up with the photo's edges
        cardWidth: cardBodyRef.current.clientWidth,
      }),
    )
    observer.current.observe(cardBodyRef.current)
  }, [])
  return { nameRef, cardBodyRef, ...fit }
}

// The card's name button, its click area covers the whole card and it shows the full name above when cut off
export default function ItemNameButton({ name, className, onClick }) {
  const { nameRef, cardBodyRef, isTruncated, cardWidth } = useCardNameFit()
  return (
    <Tooltip
      text={isTruncated ? name : ''}
      placement="top"
      className="tooltip-flush"
      anchorRef={cardBodyRef}
      width={cardWidth}
    >
      <button
        ref={nameRef}
        className={className}
        type="button"
        aria-haspopup="dialog"
        onClick={onClick}
      >
        {name}
      </button>
    </Tooltip>
  )
}
