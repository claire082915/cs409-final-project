import { Button, Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import '../styles/components/confirm-dialog.css'

// Escape and clicking outside count as cancelling
export default function ConfirmDialog({
  isOpen,
  isPending,
  title,
  text,
  cancelLabel,
  confirmLabel,
  destructive = true,
  onCancel,
  onConfirm,
}) {
  const confirmColor = destructive ? 'action-button-danger' : 'action-button-teal'
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => !open && onCancel()}
      isDismissable={!isPending}
      className="confirm-backdrop"
    >
      <Modal className="confirm-wrap">
        <Dialog role="alertdialog" className="confirm-panel">
          <Heading slot="title" className="confirm-title">
            {title}
          </Heading>
          <p className="confirm-text">{text}</p>
          <div className="confirm-actions">
            {/* Focus the safe choice so pressing Enter cancels */}
            <Button
              className="action-button action-button-neutral"
              autoFocus
              isDisabled={isPending}
              onPress={onCancel}
            >
              {cancelLabel}
            </Button>
            <Button
              className={`action-button ${confirmColor}`}
              isDisabled={isPending}
              onPress={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
