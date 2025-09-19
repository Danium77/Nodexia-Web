import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onConfirm, onCancel }) => {
  const [loading, setLoading] = React.useState(false);
  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-[#1b273b] p-6 rounded-lg shadow-xl max-w-md w-full text-slate-100">
        <h3 className="text-lg font-semibold text-cyan-400 mb-2">{title || 'Confirmar acción'}</h3>
        <p className="text-sm text-slate-300 mb-4">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} disabled={loading} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700 text-white text-sm">{cancelLabel}</button>
          <button onClick={handleConfirm} disabled={loading} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm">{loading ? 'Procesando...' : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
