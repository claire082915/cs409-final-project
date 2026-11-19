import { useBeforeUnload, useBlocker } from 'react-router-dom'
import ConfirmDialog from './ConfirmDialog.jsx'

// Asks before leaving the page in the app, and before reloading or closing the tab
export default function UnsavedChangesPrompt({ when }) {
  const blocker = useBlocker(when)

  // Browsers show their own text here and ignore any custom message
  useBeforeUnload((event) => {
    if (when) {
      event.preventDefault()
    }
  })

  return (
    <ConfirmDialog
      isOpen={blocker.state === 'blocked'}
      title="Leave without saving?"
      text="Your changes will be lost."
      cancelLabel="Keep editing"
      confirmLabel="Leave"
      onCancel={() => blocker.reset()}
      onConfirm={() => blocker.proceed()}
    />
  )
}
