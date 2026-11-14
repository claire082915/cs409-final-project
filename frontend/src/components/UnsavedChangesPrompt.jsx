import { Button, Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { useBeforeUnload, useBlocker } from 'react-router-dom'
import '../styles/components/unsaved-changes-prompt.css'

// Asks before leaving the page in the app, and before reloading or closing the tab
export default function UnsavedChangesPrompt({ when }) {
  const blocker = useBlocker(when)

  // Browsers show their own text here and ignore any custom message
  useBeforeUnload((event) => {
    if (when) {
      event.preventDefault()
    }
  })

  // Escape and clicking outside count as keeping the changes
  return (
    <ModalOverlay
      isOpen={blocker.state === 'blocked'}
      onOpenChange={(isOpen) => !isOpen && blocker.reset()}
      isDismissable
      className="unsaved-backdrop"
    >
      <Modal className="unsaved-wrap">
        <Dialog role="alertdialog" className="unsaved-panel">
          <Heading slot="title" className="unsaved-title">
            Leave without saving?
          </Heading>
          <p className="unsaved-text">
            You have unsaved changes on this page. If you leave now, they will be lost.
          </p>
          <div className="unsaved-actions">
            {/* Focus the safe choice so pressing Enter keeps the changes */}
            <Button className="unsaved-stay" autoFocus onPress={() => blocker.reset()}>
              Keep editing
            </Button>
            <Button className="unsaved-leave" onPress={() => blocker.proceed()}>
              Leave page
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
