import React, { useState } from 'react';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface RechazarViajeModalProps {
  isOpen: boolean;
  onClose: () => void;
  viaje: {
    id: string;
    pedido_id: string;
    viaje_numero?: number;
    origen: string;
    destino: string;
  };
  onConfirm: (motivo: string) => Promise<void>;
}

const RechazarViajeModal: React.FC<RechazarViajeModalProps> = ({
  isOpen,
  onClose,
  viaje,
  onConfirm
}) => {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!motivo.trim()) {
      setError('El motivo es obligatorio');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onConfirm(motivo.trim());
      
      // Cerrar modal después de éxito
      setMotivo('');
      onClose();
    } catch (err: any) {
      console.error('Error rechazando viaje:', err);
      setError(err.message || 'Error al rechazar el viaje');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1b273b] rounded-lg shadow-xl max-w-lg w-full border border-red-900/50">
        {/* Header */}
        <div className="bg-red-900/30 border-b border-red-800 p-6 flex justify-between items-start">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Rechazar Viaje</h2>
              <p className="text-gray-400 text-sm">Esta acción notificará al coordinador de planta</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="p-6 space-y-4">
            {/* Información del viaje */}
            <div className="bg-[#0a0e1a] rounded-lg p-4 border border-gray-800">
              <h3 className="text-white font-semibold mb-2">Viaje a rechazar:</h3>
              <div className="text-sm space-y-1">
                <p className="text-gray-400">
                  <span className="font-medium text-white">Pedido:</span> {viaje.pedido_id}
                </p>
                <p className="text-gray-400">
                  <span className="font-medium text-white">Ruta:</span> {viaje.origen} → {viaje.destino}
                </p>
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Motivo del rechazo *
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: No tenemos disponibilidad de camiones para esa fecha..."
                className="w-full px-4 py-3 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 min-h-[100px] resize-vertical"
                maxLength={500}
                autoComplete="off"
                required
              />
              <div className="flex justify-between mt-1">
                <p className="text-gray-500 text-xs">
                  Este motivo será visible para el coordinador de planta
                </p>
                <p className="text-gray-500 text-xs">
                  {motivo.length}/500
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 flex items-start gap-2">
                <XCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Advertencia */}
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
              <p className="text-sm text-yellow-300">
                ⚠️ Esta acción no se puede deshacer. El coordinador de planta deberá reasignar el viaje a otra empresa de transporte.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-[#0a0e1a] border-t border-gray-800 p-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !motivo.trim()}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Rechazando...
                </>
              ) : (
                <>
                  <XCircleIcon className="h-5 w-5" />
                  Confirmar Rechazo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RechazarViajeModal;
