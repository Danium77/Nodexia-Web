import React from 'react';

interface CancelarDespachoModalProps {
  isOpen: boolean;
  dispatch: {
    pedido_id: string;
    origen: string;
    destino: string;
    fecha_despacho: string;
    hora_despacho?: string;
  } | null;
  motivoCancelacion: string;
  onMotivoCancelacionChange: (value: string) => void;
  onConfirmar: () => void;
  onClose: () => void;
  loading: boolean;
}

export default function CancelarDespachoModal({
  isOpen,
  dispatch,
  motivoCancelacion,
  onMotivoCancelacionChange,
  onConfirmar,
  onClose,
  loading,
}: CancelarDespachoModalProps) {
  if (!isOpen || !dispatch) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            ❌ Cancelar Despacho
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Info del despacho */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-semibold">Pedido:</span> {dispatch.pedido_id}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-semibold">Ruta:</span> {dispatch.origen} → {dispatch.destino}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-semibold">Fecha:</span> {new Date(dispatch.fecha_despacho).toLocaleDateString('es-AR')} {dispatch.hora_despacho}
          </p>
        </div>

        {/* Campo de motivo */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Motivo de cancelación <span className="text-red-500">*</span>
          </label>
          <textarea
            value={motivoCancelacion}
            onChange={(e) => onMotivoCancelacionChange(e.target.value)}
            placeholder="Ingrese el motivo por el cual se cancela este despacho..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {motivoCancelacion.length}/500 caracteres
          </p>
        </div>

        {/* Advertencia */}
        <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">
            ⚠️ <strong>Atención:</strong> Esta acción no se puede deshacer. El despacho será eliminado permanentemente.
          </p>
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 font-medium transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={!motivoCancelacion.trim() || loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Cancelando...
              </span>
            ) : (
              '✓ Confirmar Cancelación'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
