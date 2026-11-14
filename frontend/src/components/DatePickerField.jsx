import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DatePicker,
  DateSegment,
  Dialog,
  Group,
  Heading,
  Label,
  Popover,
} from 'react-aria-components'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import '../styles/components/form-controls.css'

// The name renders a hidden YYYY-MM-DD input, so forms can still read it with FormData
export default function DatePickerField({ label, className, ...pickerProps }) {
  return (
    <DatePicker className={`date-picker ${className}`} {...pickerProps}>
      <Label>{label}</Label>
      <Group className="date-picker-group">
        <Button className="date-picker-button" aria-label="Open calendar">
          <CalendarDays size={16} />
        </Button>
        <DateInput className="date-picker-input">
          {(segment) => <DateSegment segment={segment} className="date-picker-segment" />}
        </DateInput>
      </Group>
      <Popover className="field-popover" placement="bottom start">
        <Dialog className="date-picker-dialog">
          <Calendar className="calendar">
            <header className="calendar-header">
              <Button slot="previous" className="calendar-nav" aria-label="Previous month">
                <ChevronLeft size={16} />
              </Button>
              <Heading className="calendar-heading" />
              <Button slot="next" className="calendar-nav" aria-label="Next month">
                <ChevronRight size={16} />
              </Button>
            </header>
            <CalendarGrid className="calendar-grid">
              {(date) => <CalendarCell date={date} className="calendar-cell" />}
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </DatePicker>
  )
}
