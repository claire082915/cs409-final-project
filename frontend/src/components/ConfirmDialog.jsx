import { Button, Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import Tooltip from './Tooltip.jsx'
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
  confirmBlockedReason,
  onCancel,
  children,
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
          {children}
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
            {/* Blocked stays hoverable so the tooltip can say why, a disabled button gets no hover */}
            <Tooltip text={confirmBlockedReason} placement="top">
              <Button
                className={`action-button ${confirmColor}`}
                isDisabled={isPending}
                aria-disabled={Boolean(confirmBlockedReason)}
                onPress={confirmBlockedReason ? undefined : onConfirm}
              >
                {confirmLabel}
              </Button>
            </Tooltip>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
