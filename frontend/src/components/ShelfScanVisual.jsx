import { Camera, ScanSearch } from 'lucide-react'

const SHELF_PHOTO =
  'https://images.unsplash.com/photo-1631891425050-d2a73f1855e7?auto=format&fit=crop&w=600&h=640&q=80'

// Boxes in percent of the 600 by 640 crop, measured from the photo
const DETECTED_ITEMS = [
  { name: 'Instant camera', left: 41, top: 5.6, width: 30, height: 26 },
  { name: 'Folding camera', left: 14.5, top: 21, width: 26.5, height: 28 },
  { name: 'Planter', left: 9.8, top: 73.6, width: 31.6, height: 26.4, labelOnLeft: true },
  { name: 'Film camera', left: 41.5, top: 84.4, width: 33.8, height: 15.6 },
]

// Keep these in sync with the .scan-line delay and scan-sweep keyframes.
const SCAN_START_SECONDS = 1
const SCAN_SECONDS = 2

function boxStyle({ left, top, width, height }) {
  const middle = (top + height / 2) / 100
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`,
    animationDelay: `${SCAN_START_SECONDS + middle * SCAN_SECONDS}s`,
  }
}

export default function ShelfScanVisual() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="visual-sun" />
      <div className="hero-photo">
        <img src={SHELF_PHOTO} alt="" />
        <div className="scan-line" />
        {DETECTED_ITEMS.map((item) => (
          <div className="scan-box" key={item.name} style={boxStyle(item)}>
            <span className={item.labelOnLeft ? 'scan-label-left' : undefined}>{item.name}</span>
          </div>
        ))}
      </div>
      <div className="photo-label label-top">
        <span className="label-icon">
          <ScanSearch size={15} />
        </span>
        <span>
          <b>{DETECTED_ITEMS.length} items found</b>
          <small>From one photo</small>
        </span>
      </div>
      <div className="photo-label label-bottom">
        <span className="label-icon label-icon-orange">
          <Camera size={15} />
        </span>
        <span>
          <b>Film camera</b>
          <small>Drafted, ready to add</small>
        </span>
      </div>
    </div>
  )
}
