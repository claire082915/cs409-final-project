import {
  Button,
  Dialog,
  DialogTrigger,
  Input,
  ListBox,
  ListBoxItem,
  NumberField,
  Popover,
  Separator,
} from 'react-aria-components'
import { Check, ChevronDown } from 'lucide-react'
import SelectMenu from './SelectMenu.jsx'
import '../styles/components/form-controls.css'

const PRESETS = [
  { id: 'any', label: 'Any due date' },
  { id: 'week', label: 'Due this week' },
  { id: 'month', label: 'Due this month' },
]
const UNITS = ['days', 'weeks', 'months']

function describeDueDate({ range, amount, unit }) {
  if (range === 'custom') {
    // Drop the plural s for a single day, week or month
    return `Due within ${amount} ${amount === 1 ? unit.slice(0, -1) : unit}`
  }
  return PRESETS.find((preset) => preset.id === range).label
}

function Tick({ isShown }) {
  return (
    <span className="filter-menu-check">{isShown && <Check size={14} aria-hidden="true" />}</span>
  )
}

// Presets close the menu, the custom row stays open so its number and unit can both be set
export default function DueDateMenu({ value, onChange, className = '' }) {
  const pickCustom = (change) => onChange({ ...value, ...change, range: 'custom' })

  return (
    <DialogTrigger>
      <Button className={`filter-menu-button ${className}`} aria-label="Filter by due date">
        <span className="filter-menu-label">{describeDueDate(value)}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </Button>
      <Popover className="field-popover filter-menu-popover" placement="bottom end">
        <Dialog className="due-date-dialog" aria-label="Due date">
          {({ close }) => (
            <>
              <ListBox
                className="field-list"
                aria-label="Due date presets"
                selectionMode="single"
                selectedKeys={value.range === 'custom' ? [] : [value.range]}
                onSelectionChange={(keys) => {
                  onChange({ ...value, range: [...keys][0] })
                  close()
                }}
              >
                {PRESETS.map((preset) => (
                  <ListBoxItem key={preset.id} id={preset.id} className="field-option">
                    {({ isSelected }) => (
                      <>
                        <Tick isShown={isSelected} />
                        {preset.label}
                      </>
                    )}
                  </ListBoxItem>
                ))}
              </ListBox>
              <Separator className="filter-menu-separator" />
              <div className="due-date-custom">
                <button
                  type="button"
                  className="due-date-custom-pick"
                  aria-pressed={value.range === 'custom'}
                  onClick={() => pickCustom({})}
                >
                  <Tick isShown={value.range === 'custom'} />
                  Due in the next
                </button>
                <NumberField
                  className="due-date-amount"
                  aria-label="How many"
                  value={value.amount}
                  minValue={1}
                  maxValue={99}
                  onChange={(amount) => {
                    // Clearing the box gives NaN, keep the last number instead
                    if (!Number.isNaN(amount)) pickCustom({ amount })
                  }}
                >
                  <Input />
                </NumberField>
                <SelectMenu
                  aria-label="Days, weeks or months"
                  options={UNITS}
                  value={value.unit}
                  onChange={(unit) => pickCustom({ unit })}
                />
              </div>
            </>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  )
}
