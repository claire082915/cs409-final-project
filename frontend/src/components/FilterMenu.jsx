import { Button, Menu, MenuItem, MenuTrigger, Popover, Separator } from 'react-aria-components'
import { Check, ChevronDown } from 'lucide-react'
import '../styles/components/form-controls.css'

// Nothing picked means every option is shown
export function describeSelection(selected, allLabel, pluralLabel) {
  if (selected.size === 0) {
    return allLabel
  }
  if (selected.size === 1) {
    return [...selected][0]
  }
  return `${selected.size} ${pluralLabel}`
}

// The button shows a count so long option names do not overflow it
function countSelection(selected, allLabel, singularLabel, pluralLabel) {
  if (selected.size === 0) {
    return allLabel
  }
  const noun = selected.size === 1 ? singularLabel : pluralLabel
  return `${selected.size} ${noun}`
}

function CheckOption({ id, label }) {
  return (
    <MenuItem id={id} className="field-option">
      {({ isSelected }) => (
        <>
          <span className="filter-menu-check">
            {isSelected && <Check size={14} aria-hidden="true" />}
          </span>
          {label}
        </>
      )}
    </MenuItem>
  )
}

// Multiple selection keeps the menu open so several options can be ticked in a row
export default function FilterMenu({ options, selected, onChange, allLabel, pluralLabel, label }) {
  // The all option is ticked only while no single option is
  const tickedKeys = selected.size === 0 ? new Set([allLabel]) : selected

  // Picking the all option clears the rest, picking an option unticks the all option
  const updateTicks = (keys) => {
    if (keys.has(allLabel) && selected.size > 0) {
      onChange(new Set())
      return
    }
    const picked = new Set(keys)
    picked.delete(allLabel)
    onChange(picked)
  }

  return (
    <MenuTrigger>
      <Button className="filter-menu-button" aria-label={`Filter by ${label}`}>
        <span className="filter-menu-label">
          {countSelection(selected, allLabel, label, pluralLabel)}
        </span>
        <ChevronDown size={14} aria-hidden="true" />
      </Button>
      <Popover className="field-popover filter-menu-popover" placement="bottom end">
        <Menu
          className="field-list"
          aria-label={allLabel}
          selectionMode="multiple"
          selectedKeys={tickedKeys}
          onSelectionChange={updateTicks}
        >
          <CheckOption id={allLabel} label={allLabel} />
          <Separator className="filter-menu-separator" />
          {options.map((option) => (
            <CheckOption key={option} id={option} label={option} />
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  )
}
