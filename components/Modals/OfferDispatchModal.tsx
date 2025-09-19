// components/Modals/OfferDispatchModal.tsx
import React from 'react';

interface OfferDispatchModalProps {
  isOpen: boolean; // Controla si el modal está abierto o cerrado
  onClose: () => void; // Función para cerrar el modal
  dispatchId: string | null; // ID del despacho que se está ofreciendo
  onConfirmOffer: (dispatchId: string, selectedTransportId: string, offerType: 'priority' | 'direct') => Promise<{ success: boolean; error?: string }>; // Función para confirmar la oferta

  // NUEVO: Props para la lista de transportes (para el selector)
  availableTransports: Array<{ id: string; nombre: string }>;
}

const OfferDispatchModal: React.FC<OfferDispatchModalProps> = ({
  isOpen,
  onClose,
  dispatchId,
  onConfirmOffer,
  availableTransports,
}) => {
  // Estado para el transporte seleccionado en el modal
  const [selectedTransport, setSelectedTransport] = React.useState<string>('');
  const [offerLoading, setOfferLoading] = React.useState(false);
  const [offerError, setOfferError] = React.useState<string | null>(null);

  // Si el modal no está abierto, no renderizar nada
  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!dispatchId || !selectedTransport) {
      setOfferError('Por favor, selecciona un transporte.');
      return;
    }
    setOfferLoading(true);
    setOfferError(null);
    const result = await onConfirmOffer(dispatchId, selectedTransport, 'direct');
    setOfferLoading(false);
    if (!result || !result.success) {
      setOfferError(result?.error || 'Error al confirmar la oferta.');
      return;
    }
    onClose(); // Cerrar el modal después de la confirmación
  };

  return (
    // Overlay para el fondo oscuro del modal
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-[#1b273b] p-6 rounded-lg shadow-xl max-w-lg w-full text-slate-100 relative">
        {/* Botón de cerrar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-white text-xl"
        >
          &times;
        </button>

        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Ofrecer Despacho</h2>
        {dispatchId && <p className="mb-4">Despacho ID: <span className="font-semibold text-white">{dispatchId}</span></p>}

        <p className="mb-2 text-slate-300">Selecciona un transporte para ofrecer este viaje:</p>
        <select
          value={selectedTransport}
          onChange={(e) => setSelectedTransport(e.target.value)}
          className="w-full bg-[#0e1a2d] border border-gray-600 rounded-md px-3 py-2 text-base focus:ring-cyan-500 focus:border-cyan-500 mb-4"
          disabled={offerLoading}
        >
          <option value="">-- Seleccionar Transporte --</option>
          {availableTransports.map(transport => (
            <option key={transport.id} value={transport.id}>
              {transport.nombre}
            </option>
          ))}
        </select>

        {offerError && <p className="text-red-400 text-sm mb-4">{offerError}</p>}

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-colors duration-200"
            disabled={offerLoading}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition-colors duration-200"
            disabled={offerLoading}
          >
            {offerLoading ? 'Confirmando...' : 'Confirmar Oferta'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfferDispatchModal;