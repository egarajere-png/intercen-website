import React from 'react';

interface SimpleModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const SimpleModal: React.FC<SimpleModalProps> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button
          className="absolute top-2 right-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-2xl font-bold"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        {title && <h2 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-100">{title}</h2>}
        {children}
      </div>
    </div>
  );
};

export default SimpleModal;
