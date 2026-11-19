import '../styles/components/view-switch.css'

export default function ViewSwitch({ label, options, selected, onChange, className = '' }) {
  return (
    <div className={`view-switch ${className}`} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={selected === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
