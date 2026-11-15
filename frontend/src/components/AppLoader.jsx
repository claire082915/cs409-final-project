import { useWaking } from '../lib/useWaking.js'

export default function AppLoader({ inline = false, label = 'Loading…' }) {
  const waking = useWaking(true)
  // Pages already have a main element, so the inline loader is a plain div
  const Container = inline ? 'div' : 'main'

  return (
    <Container
      className={inline ? 'app-loader app-loader-inline' : 'app-loader'}
      role="status"
      aria-live="polite"
    >
      <div className="app-loader-content">
        <span className="app-loader-mark" aria-hidden="true">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
        </span>
        <strong>{waking ? 'The server is waking up…' : label}</strong>
        <small>{waking ? 'This can take up to a minute.' : 'Getting Lendr ready.'}</small>
      </div>
    </Container>
  )
}
