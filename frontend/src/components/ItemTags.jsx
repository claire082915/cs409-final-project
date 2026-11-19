import { NO_CONDITION } from '../lib/itemConditions.js'
import '../styles/components/item-tags.css'

// Mock items have no condition, so they show Not specified like old backend items
export default function ItemTags({ category, condition }) {
  return (
    <span className="item-tags">
      <span className="item-tag item-tag-category">{category}</span>
      <span className="item-tag item-tag-condition">{condition ?? NO_CONDITION}</span>
    </span>
  )
}
