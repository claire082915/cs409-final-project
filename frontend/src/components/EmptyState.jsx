import '../styles/components/empty-state.css'

export default function EmptyState({ icon: Icon, title, className = '', children }) {
  return (
    <div className={`empty-state ${className}`}>
      <Icon size={26} aria-hidden="true" />
      <strong>{title}</strong>
      {children}
    </div>
  )
}
