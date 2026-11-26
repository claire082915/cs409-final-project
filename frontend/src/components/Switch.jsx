import '../styles/components/switch.css'

// The checkbox sits invisibly over the drawn track so clicks and keyboard focus still reach it
export default function Switch({ checked, onChange, isDisabled, className = '', children }) {
  return (
    <label className={`switch ${className}`}>
      {children}
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={onChange}
        disabled={isDisabled}
      />
      <i aria-hidden="true" />
    </label>
  )
}
