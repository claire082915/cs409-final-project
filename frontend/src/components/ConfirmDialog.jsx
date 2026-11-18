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
  onCancel,
  onConfirm,
}) {
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
            <Button className="confirm-cancel" autoFocus isDisabled={isPending} onPress={onCancel}>
              {cancelLabel}
            </Button>
            <Button className="confirm-danger" isDisabled={isPending} onPress={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
