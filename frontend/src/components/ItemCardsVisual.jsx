import { Drill, MapPin, Smartphone, Tent } from 'lucide-react'

const SAMPLE_ITEMS = [
  {
    icon: Drill,
    name: 'Cordless drill',
    status: 'Available now',
    onLoan: false,
    campusArea: 'Lincoln Avenue (LAR)',
  },
  {
    icon: Tent,
    name: 'Camping tent',
    status: 'On loan, back Friday',
    onLoan: true,
  },
  {
    icon: Smartphone,
    name: 'iClicker',
    status: 'Available now',
    onLoan: false,
    campusArea: 'Illinois Street (ISR)',
  },
]

export default function ItemCardsVisual() {
  return (
    <div className="visual-cards" aria-hidden="true">
      {SAMPLE_ITEMS.map(({ icon: Icon, name, status, onLoan, campusArea }) => (
        <div className="visual-card" key={name}>
          <div className="visual-card-icon">
            <Icon size={22} />
          </div>
          <div>
            <p className="visual-card-name">{name}</p>
            {/* Only items you can borrow now show where they are */}
            {campusArea && (
              <p className="visual-card-location">
                <MapPin size={12} />
                {campusArea}
              </p>
            )}
            <p className={`visual-card-status${onLoan ? ' is-on-loan' : ''}`}>{status}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
