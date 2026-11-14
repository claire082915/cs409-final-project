import { useEffect, useState } from 'react'
import { ComboBox, Input, ListBox, ListBoxItem, Popover } from 'react-aria-components'
import { MapPin } from 'lucide-react'
import '../styles/components/form-controls.css'

const PHOTON_URL = 'https://photon.komoot.io/api/'
// Shorter queries match too many places to be useful
const MIN_QUERY_LENGTH = 3
// Wait for a pause in typing so each keystroke doesn't hit Photon's public server
const DEBOUNCE_MS = 300

// Photon returns the same city more than once, so keep each label once
async function searchCities(query, signal) {
  const params = new URLSearchParams({ q: query, layer: 'city', lang: 'en', limit: '5' })
  const response = await fetch(`${PHOTON_URL}?${params}`, { signal })
  const { features } = await response.json()
  const labels = new Set()
  for (const { properties } of features) {
    const parts = [properties.name, properties.state, properties.country]
    labels.add(parts.filter(Boolean).join(', '))
  }
  return [...labels]
}

// Typed text is kept as is, picking a suggestion replaces it with the full label
export default function CityInput({ value, onChange, 'aria-label': ariaLabel, ...inputProps }) {
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    if (value.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      searchCities(value.trim(), controller.signal)
        .then(setSuggestions)
        // Suggestions are optional, so a failed search leaves the field as plain text
        .catch(() => setSuggestions([]))
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [value])

  // Open while the list is still empty, since suggestions arrive after the typing that asked for them
  return (
    <ComboBox
      aria-label={ariaLabel}
      inputValue={value}
      onInputChange={onChange}
      allowsCustomValue
      allowsEmptyCollection
    >
      <Input {...inputProps} />
      <Popover className="field-popover" placement="bottom start">
        <ListBox className="field-list">
          {suggestions.map((label) => (
            <ListBoxItem key={label} id={label} textValue={label} className="field-option">
              <MapPin size={14} aria-hidden="true" />
              {label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </ComboBox>
  )
}
