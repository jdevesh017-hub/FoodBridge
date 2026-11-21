import React from 'react';
import { useModalA11y } from '../../hooks/useModalA11y';

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  role?: string;
  'aria-modal'?: boolean | 'true' | 'false';
  'aria-labelledby'?: string;
  className?: string;
  children: React.ReactNode;
}

export const AccessibleModal: React.FC<AccessibleModalProps> = ({
  isOpen,
  onClose,
  role = 'dialog',
  'aria-modal': ariaModal = 'true',
  'aria-labelledby': ariaLabelledBy,
  className = 'fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs',
  children,
}) => {
  const containerRef = useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      role={role}
      aria-modal={ariaModal}
      aria-labelledby={ariaLabelledBy}
      className={className}
      tabIndex={-1}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {children}
    </div>
  );
};
