import { Search, X } from 'lucide-react'
import '../styles/components/search-field.css'

// Filter menus passed as children sit at the right end of the field
export default function SearchField({ value, onChange, placeholder, children }) {
  return (
    <label className="search-field">
      <Search size={17} aria-hidden="true" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search">
          <X size={15} />
        </button>
      )}
      {children}
    </label>
  )
}
