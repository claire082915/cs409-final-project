import AppShell from './AppShell.jsx'

export default function PagePlaceholder({ title, description, withSidebar = true }) {
  return (
    <AppShell withSidebar={withSidebar}>
      <main className="screen-scaffold">
        <div className="screen-heading">
          <div>
            <span className="placeholder-kicker">YOUR LENDR SPACE</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </div>
        <section className="scaffold-panel">
          <div className="scaffold-panel-icon">
            <span>✦</span>
          </div>
          <h2>{title} is ready to take shape</h2>
          <p>
            This shared app layout is in place. Screen content and interactions can be added here.
          </p>
        </section>
      </main>
    </AppShell>
  )
}
