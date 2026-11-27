import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom'
import '../styles/pages/error-page.css'

// A bad route throws a response with a status, a crash throws an Error
function errorText(error) {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`
  }
  return error?.message ?? String(error)
}

// Replaces React Router's default error screen with one in the app's style
export default function ErrorPage() {
  const error = useRouteError()
  return (
    <main className="app-loader" role="alert">
      <div className="app-loader-content error-page-content">
        <span className="app-loader-mark error-page-mark" aria-hidden="true">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
        </span>
        <strong>Something went wrong</strong>
        <small>Reload the page to try again.</small>
        <code className="error-page-detail">{errorText(error)}</code>
        <div className="error-page-actions">
          <button
            type="button"
            className="action-button action-button-orange-tint"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
          <Link className="action-button action-button-neutral" to="/">
            Go home
          </Link>
        </div>
      </div>
    </main>
  )
}
