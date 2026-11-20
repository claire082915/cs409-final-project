import { PackageOpen } from 'lucide-react'
import ItemNameButton from './ItemNameButton.jsx'
import ItemTags from './ItemTags.jsx'
import '../styles/components/item-card.css'

// One card for an item everywhere it's listed, cards without onOpen don't open
export default function ItemCard({ item, onOpen, children }) {
  return (
    <article className="item-card">
      <div className="item-card-photo">
        {item.photos?.[0] ? (
          <img src={item.photos[0]} alt="" loading="lazy" />
        ) : (
          <PackageOpen size={32} aria-hidden="true" />
        )}
      </div>
      <div className="item-card-body">
        <h3 className="item-card-title">
          {onOpen ? <ItemNameButton name={item.name} onClick={onOpen} /> : item.name}
        </h3>
        <ItemTags category={item.category} condition={item.condition} />
        {children}
      </div>
    </article>
  )
}
