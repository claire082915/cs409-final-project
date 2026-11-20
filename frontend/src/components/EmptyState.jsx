import '../styles/components/empty-state.css'

export default function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="empty-state">
      <Icon size={26} aria-hidden="true" />
      <strong>{title}</strong>
      {children}
    </div>
  )
}
