import { Checkbox } from 'react-aria-components'
import { Check } from 'lucide-react'
import SelectMenu from './SelectMenu.jsx'
import { ITEM_CATEGORIES } from '../lib/itemCategories.js'
import { ITEM_CONDITIONS, NO_CONDITION } from '../lib/itemConditions.js'

// A detected item to edit before adding, unchecking fades it in place so the list doesn't shift
export default function DetectedItemCard({ draft, index, onChange }) {
  const setField = (name, value) => onChange({ ...draft, [name]: value })
  const labelId = `detected-${index}`

  return (
    <article className={`detected-card${draft.selected ? '' : ' unselected'}`}>
      {/* The whole photo toggles it, the box in its corner shows the state */}
      <Checkbox
        className="detected-card-select"
        isSelected={draft.selected}
        onChange={(selected) => setField('selected', selected)}
        aria-label={`Add ${draft.name}`}
      >
        <img className="detected-card-photo" src={draft.photos[0]} alt="" />
        <span className="detected-checkbox" aria-hidden="true">
          <Check size={14} strokeWidth={3} />
        </span>
      </Checkbox>
      {/* Unchecked fields can't be focused or sent */}
      <div className="detected-card-fields" inert={!draft.selected}>
        <label className="item-form-field">
          <span>Item name</span>
          <input
            value={draft.name}
            onChange={(event) => setField('name', event.target.value)}
            required={draft.selected}
            maxLength="80"
          />
        </label>
        <div className="detected-card-row">
          <div className="item-form-field">
            <span id={`${labelId}-category`}>Category</span>
            <SelectMenu
              className="item-select"
              aria-labelledby={`${labelId}-category`}
              options={ITEM_CATEGORIES}
              value={draft.category}
              onChange={(category) => setField('category', category)}
            />
          </div>
          <div className="item-form-field">
            <span id={`${labelId}-condition`}>Condition</span>
            <SelectMenu
              className="item-select"
              aria-labelledby={`${labelId}-condition`}
              options={[...ITEM_CONDITIONS, NO_CONDITION]}
              value={draft.condition}
              onChange={(condition) => setField('condition', condition)}
            />
          </div>
        </div>
        <label className="item-form-field">
          <span>
            Notes <span className="item-field-hint">(optional)</span>
          </span>
          <textarea
            value={draft.description}
            onChange={(event) => setField('description', event.target.value)}
            rows="2"
            maxLength="500"
          />
        </label>
      </div>
    </article>
  )
}
