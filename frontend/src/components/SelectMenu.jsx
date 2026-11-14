import { Button, ListBox, ListBoxItem, Popover, Select, SelectValue } from 'react-aria-components'
import { ChevronDown } from 'lucide-react'
import '../styles/components/form-controls.css'

// Options are plain strings and each one is its own key
export default function SelectMenu({ options, value, onChange, ...selectProps }) {
  return (
    <Select selectedKey={value} onSelectionChange={onChange} {...selectProps}>
      <Button className="select-menu-button">
        <SelectValue />
        <ChevronDown size={14} aria-hidden="true" />
      </Button>
      <Popover className="field-popover" placement="bottom end">
        <ListBox className="field-list">
          {options.map((option) => (
            <ListBoxItem key={option} id={option} className="field-option">
              {option}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  )
}
