import type { ReactNode } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useExitAnimation } from '../hooks/useExitAnimation';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  icon,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { shouldRender, phase } = useExitAnimation(isOpen, 180);
  if (!shouldRender) return null;

  const animClass = phase === 'enter' ? 'animate-popup-in' : 'animate-popup-out';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 pointer-events-auto" onClick={onClose} />
      <div className={`relative w-full max-w-xs mx-4 rounded-2xl glass-strong overflow-hidden pointer-events-auto ${animClass}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line-subtle bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="liquid-glass-icon w-7 h-7 flex items-center justify-center">
              {icon ?? <AlertTriangle className="w-3.5 h-3.5 text-secondary" />}
            </div>
            <span className="text-[13px] text-primary font-medium">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer text-muted hover:text-primary hover:bg-surface-hover transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="text-[13px] text-secondary leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-line-subtle bg-surface">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full glass-button text-[12px]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 rounded-full glass-button-primary text-[12px] font-medium"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
