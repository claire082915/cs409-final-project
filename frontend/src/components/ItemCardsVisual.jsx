import { Drill, Smartphone, Tent } from 'lucide-react'

const SAMPLE_ITEMS = [
  { icon: Drill, name: 'Cordless drill', status: 'Available now', onLoan: false },
  { icon: Tent, name: 'Camping tent', status: 'On loan, back Friday', onLoan: true },
  { icon: Smartphone, name: 'iClicker', status: 'Available now', onLoan: false },
]

export default function ItemCardsVisual() {
  return (
    <div className="visual-cards" aria-hidden="true">
      {SAMPLE_ITEMS.map(({ icon: Icon, name, status, onLoan }) => (
        <div className="visual-card" key={name}>
          <div className="visual-card-icon">
            <Icon size={22} />
          </div>
          <div>
            <p className="visual-card-name">{name}</p>
            <p className={`visual-card-status${onLoan ? ' is-on-loan' : ''}`}>{status}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
