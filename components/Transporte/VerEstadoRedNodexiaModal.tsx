// ============================================================================
// MODAL: Ver Estado de Viaje en Red Nodexia
// Muestra transportes que aceptaron el viaje con su info y calificación
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useRedNodexia } from '@/lib/hooks/useRedNodexia';
import { OfertaRedCompleta } from '@/types/red-nodexia';
import {
  XMarkIcon,
  StarIcon,
  TruckIcon,
  MapPinIcon,
  CheckCircleIcon
} from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';

interface VerEstadoRedNodexiaModalProps {
  viajeRedId: string;
  viajeNumero: string;
  onClose: () => void;
  onAceptarOferta?: (ofertaId: string, transporteId: string) => Promise<void>;
}

export default function VerEstadoRedNodexiaModal({
  viajeRedId,
  viajeNumero,
  onClose,
  onAceptarOferta
}: VerEstadoRedNodexiaModalProps) {
  const { obtenerOfertasViaje, loading } = useRedNodexia();
  const [ofertas, setOfertas] = useState<OfertaRedCompleta[]>([]);
  const [error, setError] = useState('');
  const [ofertaSeleccionada, setOfertaSeleccionada] = useState<OfertaRedCompleta | null>(null);
  const [showConfirmacion, setShowConfirmacion] = useState(false);
  const [procesandoAsignacion, setProcesandoAsignacion] = useState(false);

  useEffect(() => {
    cargarOfertas();
  }, [viajeRedId]);

  const cargarOfertas = async () => {
    try {
      setError('');
      console.log('📡 Cargando ofertas para viaje_red_id:', viajeRedId);
      const data = await obtenerOfertasViaje(viajeRedId);
      console.log('✅ Ofertas recibidas:', data);
      console.log('📊 Total ofertas:', data?.length || 0);
      setOfertas(data || []);
    } catch (err: any) {
      const errorMsg = err.message || 'Error al cargar ofertas';
      setError(errorMsg);
      console.error('❌ Error cargando ofertas:', err);
      console.error('❌ Detalles del error:', JSON.stringify(err, null, 2));
    }
  };

  const handleSeleccionarTransporte = (oferta: OfertaRedCompleta) => {
    console.log('👆 [Modal] Usuario hizo clic en "Seleccionar este transporte":', oferta);
    setOfertaSeleccionada(oferta);
    setShowConfirmacion(true);
  };

  const handleConfirmarSeleccion = async () => {
    console.log('✅ [Modal] Usuario hizo clic en CONFIRMAR selección');
    console.log('📋 [Modal] Oferta seleccionada:', ofertaSeleccionada);
    console.log('📋 [Modal] onAceptarOferta existe?', !!onAceptarOferta);
    console.log('📋 [Modal] procesandoAsignacion?', procesandoAsignacion);
    
    if (ofertaSeleccionada && onAceptarOferta && !procesandoAsignacion) {
      try {
        setProcesandoAsignacion(true);
        console.log('🚀 [Modal] Llamando a onAceptarOferta...');
        await onAceptarOferta(ofertaSeleccionada.id, ofertaSeleccionada.transporte_id);
        console.log('✅ [Modal] onAceptarOferta completado');
        // El modal padre se cerrará desde handleAceptarOfertaDesdeModal
      } catch (error) {
        console.error('❌ [Modal] Error en confirmación:', error);
        setProcesandoAsignacion(false);
        setShowConfirmacion(false);
        setOfertaSeleccionada(null);
      }
    } else {
      console.warn('⚠️ [Modal] No se puede confirmar:', {
        tieneOfertaSeleccionada: !!ofertaSeleccionada,
        tieneCallback: !!onAceptarOferta,
        estaProcesando: procesandoAsignacion
      });
    }
  };

  const handleCancelarSeleccion = () => {
    if (!procesandoAsignacion) {
      setShowConfirmacion(false);
      setOfertaSeleccionada(null);
    }
  };

  const renderStars = (calificacion: number = 0) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= calificacion) {
        stars.push(
          <StarIcon key={i} className="w-5 h-5 text-yellow-400" />
        );
      } else {
        stars.push(
          <StarOutlineIcon key={i} className="w-5 h-5 text-gray-600" />
        );
      }
    }
    return stars;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-cyan-500/30">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Estado en Red Nodexia</h2>
            <p className="text-cyan-100 text-sm">Viaje #{viajeNumero}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-400 border-t-transparent"></div>
              <p className="text-gray-400 mt-2">Cargando ofertas...</p>
            </div>
          )}

          {!loading && ofertas.length === 0 && (
            <div className="text-center py-12">
              <TruckIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Aún no hay transportes interesados en este viaje</p>
              <p className="text-gray-500 text-sm mt-2">Las ofertas aparecerán aquí cuando los transportes acepten</p>
            </div>
          )}

          {!loading && ofertas.length > 0 && (
            <>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Transportes Interesados ({ofertas.filter(o => o.estado_oferta === 'pendiente').length})
                </h3>
                <p className="text-gray-400 text-sm">
                  Selecciona el transporte que deseas asignar para este viaje
                </p>
              </div>

              <div className="space-y-3">
                {ofertas.map((oferta) => (
                  <div
                    key={oferta.id}
                    className={`bg-gray-800 rounded-lg p-4 border-2 transition-all ${
                      oferta.estado_oferta === 'aceptada'
                        ? 'border-green-500 shadow-lg shadow-green-500/20'
                        : oferta.estado_oferta === 'rechazada'
                        ? 'border-red-500 opacity-50'
                        : 'border-gray-700 hover:border-cyan-500 cursor-pointer'
                    }`}
                    onClick={() => {
                      if (oferta.estado_oferta === 'pendiente') {
                        handleSeleccionarTransporte(oferta);
                      }
                    }}
                  >
                    {/* Layout horizontal */}
                    <div className="flex items-start gap-4">
                      {/* Columna izquierda: Info principal */}
                      <div className="flex-1">
                        {/* Header con nombre y estado */}
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-lg font-bold text-white">
                            {oferta.transporte?.nombre || 'Transporte sin nombre'}
                          </h4>
                          {oferta.estado_oferta === 'aceptada' && (
                            <div className="flex items-center space-x-1 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                              <CheckCircleIcon className="w-4 h-4" />
                              <span>Asignado</span>
                            </div>
                          )}
                        </div>

                        {/* Calificación y viajes en línea */}
                        <div className="flex items-center gap-6 mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="flex">
                              {renderStars(oferta.transporte?.calificacion || 0)}
                            </div>
                            <span className="text-gray-400 text-sm">
                              ({oferta.transporte?.calificacion?.toFixed(1) || '0.0'})
                            </span>
                          </div>
                          <div className="flex items-center text-gray-300 text-sm">
                        <TruckIcon className="w-4 h-4 mr-2 text-cyan-400" />
                        <span>
                          {oferta.transporte?.viajes_realizados || 0} viajes realizados en Nodexia
                        </span>
                      </div>
                    </div>

                    {/* CUIT y Localidad */}
                    <div className="space-y-2 text-sm">
                      <div className="text-gray-400">
                        <span className="font-semibold text-gray-300">CUIT:</span>{' '}
                        {oferta.transporte?.cuit || 'No disponible'}
                      </div>
                      <div className="flex items-start text-gray-400">
                        <MapPinIcon className="w-4 h-4 mr-2 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>
                          {oferta.transporte?.localidad && oferta.transporte?.provincia
                            ? `${oferta.transporte.localidad}, ${oferta.transporte.provincia}`
                            : oferta.transporte?.localidad || oferta.transporte?.provincia || 'Ubicación no disponible'}
                        </span>
                      </div>
                    </div>

                    {/* Mensaje del transporte */}
                    {oferta.mensaje && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-xs text-gray-400 mb-1">Mensaje:</p>
                        <p className="text-sm text-gray-300 italic">"{oferta.mensaje}"</p>
                      </div>
                    )}

                    {/* Fecha de oferta */}
                    <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500">
                      Oferta recibida: {new Date(oferta.fecha_oferta).toLocaleString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>

                    {/* Call to action */}
                    {oferta.estado_oferta === 'pendiente' && onAceptarOferta && (
                      <div className="mt-4">
                        <button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded font-semibold transition-colors">
                          Seleccionar este transporte
                        </button>
                      </div>
                    )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-800 px-6 py-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal de Confirmación */}
      {showConfirmacion && ofertaSeleccionada && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full mx-4 border border-cyan-500/50">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <CheckCircleIcon className="w-6 h-6" />
                Confirmar Asignación
              </h3>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-gray-300 mb-4">
                ¿Estás seguro de asignar este transporte al viaje?
              </p>
              
              <div className="bg-gray-900/50 rounded-lg p-4 border border-cyan-500/30">
                <div className="flex items-center gap-3 mb-2">
                  <TruckIcon className="w-6 h-6 text-cyan-400" />
                  <span className="font-semibold text-white text-lg">
                    {ofertaSeleccionada.transporte?.nombre || 'Sin nombre'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <MapPinIcon className="w-4 h-4" />
                  <span>{ofertaSeleccionada.transporte?.localidad || 'Sin localidad'}</span>
                </div>

                <div className="flex items-center gap-1">
                  {renderStars(ofertaSeleccionada.transporte?.calificacion || 0)}
                  <span className="text-gray-400 text-sm ml-2">
                    ({ofertaSeleccionada.transporte?.viajes_realizados || 0} viajes)
                  </span>
                </div>
              </div>

              <div className="mt-4 bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3">
                <p className="text-yellow-200 text-sm">
                  ⚠️ Esta acción cerrará el viaje en la Red Nodexia y rechazará las demás ofertas.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-900 px-6 py-4 flex gap-3 justify-end">
              <button
                onClick={handleCancelarSeleccion}
                disabled={procesandoAsignacion}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarSeleccion}
                disabled={procesandoAsignacion}
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {procesandoAsignacion ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    Confirmar Asignación
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
