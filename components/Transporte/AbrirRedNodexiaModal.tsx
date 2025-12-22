// ============================================================================
// MODAL: Abrir Viaje a Red Nodexia
// Para que las plantas publiquen viajes en la red
// ============================================================================

import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  XMarkIcon,
  TruckIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useRedNodexia } from '@/lib/hooks/useRedNodexia';
import { CrearViajeRedDTO } from '@/types/red-nodexia';
import { NodexiaLogo } from '@/components/ui/NodexiaLogo';

interface AbrirRedNodexiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  viajeId: string;
  numeroViaje: string;
  origen: string;
  destino: string;
  empresaId: string;
  usuarioId: string;
  onSuccess?: () => void;
}

export default function AbrirRedNodexiaModal({
  isOpen,
  onClose,
  viajeId,
  numeroViaje,
  origen,
  destino,
  empresaId,
  usuarioId,
  onSuccess
}: AbrirRedNodexiaModalProps) {
  const { publicarViajeEnRed, loading } = useRedNodexia();

  // Formulario
  const [tarifa, setTarifa] = useState('');
  const [descripcionCarga, setDescripcionCarga] = useState('');
  const [tipoCamion, setTipoCamion] = useState('');
  const [tipoAcoplado, setTipoAcoplado] = useState('');
  const [tipoCarga, setTipoCarga] = useState('');
  const [pesoMaximo, setPesoMaximo] = useState('');
  const [requiereCargaPeligrosa, setRequiereCargaPeligrosa] = useState(false);
  const [requiereGPS, setRequiereGPS] = useState(true);
  const [observaciones, setObservaciones] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const tiposCamion = [
    'Semirremolque',
    'Chasis',
    'Portacontenedor',
    'Balancín',
    'Playo',
    'Otro'
  ];

  const tiposAcoplado = [
    'Sider',
    'Caja seca',
    'Tolva',
    'Tanque',
    'Plataforma',
    'Jaula',
    'Otro'
  ];

  const tiposCarga = [
    'Granos',
    'Contenedor',
    'General',
    'Líquidos',
    'Refrigerada',
    'Peligrosa',
    'Otra'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tarifa || parseFloat(tarifa) <= 0) {
      setError('Debes ingresar una tarifa válida');
      return;
    }

    if (!tipoCamion || !tipoCarga) {
      setError('Debes completar tipo de camión y tipo de carga');
      return;
    }

    try {
      setError('');
      
      console.log('📤 Datos para publicar en Red:', {
        viajeId,
        empresaId,
        usuarioId,
        tarifa,
        tipoCamion,
        tipoCarga
      });
      
      const dto: CrearViajeRedDTO = {
        viaje_id: viajeId,
        tarifa_ofrecida: parseFloat(tarifa),
        descripcion_carga: descripcionCarga,
        requisitos: {
          tipo_camion: tipoCamion,
          ...(tipoAcoplado && { tipo_acoplado: tipoAcoplado }),
          tipo_carga: tipoCarga,
          ...(pesoMaximo && { peso_maximo_kg: parseFloat(pesoMaximo) }),
          requiere_carga_peligrosa: requiereCargaPeligrosa,
          requiere_gps: requiereGPS,
          ...(observaciones && { observaciones })
        }
      };

      console.log('📦 DTO completo:', dto);

      await publicarViajeEnRed(dto, empresaId, usuarioId);
      
      console.log('✅ Viaje publicado exitosamente en Red Nodexia');
      setSuccess(true);
      
      setTimeout(() => {
        onSuccess?.();
        onClose();
        resetForm();
      }, 2000);
      
    } catch (err: any) {
      console.error('❌ Error al publicar en Red Nodexia:', err);
      setError(err.message || 'Error al publicar en Red Nodexia');
    }
  };

  const resetForm = () => {
    setTarifa('');
    setDescripcionCarga('');
    setTipoCamion('');
    setTipoAcoplado('');
    setTipoCarga('');
    setPesoMaximo('');
    setRequiereCargaPeligrosa(false);
    setRequiereGPS(true);
    setObservaciones('');
    setError('');
    setSuccess(false);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-[#0a0e1a] border border-cyan-500/30 shadow-xl transition-all">
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 px-6 py-4 border-b border-cyan-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-500/30">
                        <NodexiaLogo className="h-8 w-8" animated />
                      </div>
                      <div>
                        <Dialog.Title className="text-xl font-bold text-white">
                          Abrir a Red Nodexia
                        </Dialog.Title>
                        <p className="text-sm text-gray-400 mt-1">
                          Viaje #{numeroViaje} • {origen} → {destino}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {/* Contenido */}
                <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
                  {success ? (
                    <div className="text-center py-8">
                      <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">
                        ¡Viaje publicado en Red Nodexia!
                      </h3>
                      <p className="text-gray-400">
                        Los transportes podrán ver y ofertar para este viaje
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Información importante */}
                      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                        <div className="flex gap-3">
                          <NodexiaLogo className="h-8 w-8 text-cyan-400 flex-shrink-0" />
                          <div>
                            <h4 className="text-sm font-semibold text-cyan-400 mb-1">
                              Red Colaborativa Nodexia
                            </h4>
                            <p className="text-xs text-gray-400">
                              Este viaje será visible para todos los transportes de la red. 
                              Ellos podrán aceptar y tú elegirás el mejor según calificación, 
                              ubicación y disponibilidad.
                            </p>
                          </div>
                        </div>
                      </div>

                      {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-400">{error}</p>
                        </div>
                      )}

                      {/* Tarifa Ofrecida */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          <CurrencyDollarIcon className="h-4 w-4 inline mr-1" />
                          Tarifa Ofrecida <span className="text-red-400">*</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={tarifa}
                            onChange={(e) => setTarifa(e.target.value)}
                            placeholder="150000"
                            className="flex-1 px-4 py-2 bg-[#1b273b] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                            required
                            min="0"
                            step="0.01"
                          />
                          <select
                            className="px-4 py-2 bg-[#1b273b] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                            defaultValue="ARS"
                          >
                            <option value="ARS">ARS</option>
                            <option value="USD">USD</option>
                          </select>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Tarifa que ofreces pagar por este viaje
                        </p>
                      </div>

                      {/* Descripción de la carga */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Descripción de la Carga
                        </label>
                        <textarea
                          value={descripcionCarga}
                          onChange={(e) => setDescripcionCarga(e.target.value)}
                          placeholder="Ej: 28 toneladas de soja, carga completa..."
                          rows={3}
                          className="w-full px-4 py-2 bg-[#1b273b] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      {/* Requisitos de Unidad */}
                      <div className="border-t border-gray-800 pt-6">
                        <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                          <TruckIcon className="h-5 w-5 text-cyan-400" />
                          Requisitos de Unidad
                        </h4>

                        <div className="grid grid-cols-2 gap-4">
                          {/* Tipo de Camión */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Tipo de Camión <span className="text-red-400">*</span>
                            </label>
                            <select
                              value={tipoCamion}
                              onChange={(e) => setTipoCamion(e.target.value)}
                              className="w-full px-4 py-2 bg-[#1b273b] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                              required
                            >
                              <option value="">Seleccionar...</option>
                              {tiposCamion.map(tipo => (
                                <option key={tipo} value={tipo}>{tipo}</option>
                              ))}
                            </select>
                          </div>

                          {/* Tipo de Acoplado */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Tipo de Acoplado
                            </label>
                            <select
                              value={tipoAcoplado}
                              onChange={(e) => setTipoAcoplado(e.target.value)}
                              className="w-full px-4 py-2 bg-[#1b273b] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                            >
                              <option value="">No requerido</option>
                              {tiposAcoplado.map(tipo => (
                                <option key={tipo} value={tipo}>{tipo}</option>
                              ))}
                            </select>
                          </div>

                          {/* Tipo de Carga */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Tipo de Carga <span className="text-red-400">*</span>
                            </label>
                            <select
                              value={tipoCarga}
                              onChange={(e) => setTipoCarga(e.target.value)}
                              className="w-full px-4 py-2 bg-[#1b273b] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                              required
                            >
                              <option value="">Seleccionar...</option>
                              {tiposCarga.map(tipo => (
                                <option key={tipo} value={tipo}>{tipo}</option>
                              ))}
                            </select>
                          </div>

                          {/* Peso Máximo */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Peso Máximo (kg)
                            </label>
                            <input
                              type="number"
                              value={pesoMaximo}
                              onChange={(e) => setPesoMaximo(e.target.value)}
                              placeholder="28000"
                              className="w-full px-4 py-2 bg-[#1b273b] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                              min="0"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Certificaciones */}
                      <div className="border-t border-gray-800 pt-6">
                        <h4 className="text-sm font-semibold text-white mb-4">
                          Certificaciones Requeridas
                        </h4>
                        
                        <div className="space-y-3">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={requiereCargaPeligrosa}
                              onChange={(e) => setRequiereCargaPeligrosa(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-600 text-cyan-600 focus:ring-cyan-500 bg-[#1b273b]"
                            />
                            <span className="text-sm text-gray-300">
                              Habilitación para cargas peligrosas
                            </span>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={requiereGPS}
                              onChange={(e) => setRequiereGPS(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-600 text-cyan-600 focus:ring-cyan-500 bg-[#1b273b]"
                            />
                            <span className="text-sm text-gray-300">
                              Sistema GPS activo (recomendado)
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Observaciones */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Observaciones Adicionales
                        </label>
                        <textarea
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          placeholder="Instrucciones especiales, horarios de carga, contactos, etc."
                          rows={3}
                          className="w-full px-4 py-2 bg-[#1b273b] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </form>
                  )}
                </div>

                {/* Footer */}
                {!success && (
                  <div className="bg-[#0f1419] px-6 py-4 border-t border-gray-800 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      disabled={loading}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={(e: any) => {
                        const form = e.target.closest('.fixed').querySelector('form');
                        if (form) {
                          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                        }
                      }}
                      disabled={loading}
                      className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      <NodexiaLogo className="h-5 w-5" />
                      {loading ? 'Publicando...' : 'Publicar en Red Nodexia'}
                    </button>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
