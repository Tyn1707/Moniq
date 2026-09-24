import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';

/**
 * Confirmation prompt for destructive actions (brief §14).
 *
 * Always danger-styled, because that is the only reason this component exists.
 * Closing is blocked while the request is in flight so the user cannot dismiss the
 * dialog and be left unsure whether the delete happened.
 */
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => (
  <Modal
    isOpen={isOpen}
    onClose={isLoading ? () => undefined : onCancel}
    title={title}
    size="sm"
    footer={
      <>
        <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
          {confirmLabel}
        </Button>
      </>
    }
  >
    <div className="flex flex-col items-center gap-3 py-2 text-center sm:flex-row sm:items-start sm:text-left">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-expense-50 text-expense-600 ring-1 ring-inset ring-expense-100">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-[0.875rem] leading-relaxed text-ink-600 sm:pt-1.5">{message}</p>
    </div>
  </Modal>
);
