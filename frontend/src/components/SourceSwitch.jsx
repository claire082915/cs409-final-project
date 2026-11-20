import '../styles/components/source-switch.css'

const SOURCES = [
  { id: 'mock', label: 'Mock' },
  { id: 'backend', label: 'Backend' },
]

export default function SourceSwitch({ source, onChange, label }) {
  return (
    <div className="source-switch" aria-label={label}>
      <span>Data</span>
      {SOURCES.map((option) => (
        <button
          key={option.id}
          type="button"
          className={source === option.id ? 'active' : ''}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
