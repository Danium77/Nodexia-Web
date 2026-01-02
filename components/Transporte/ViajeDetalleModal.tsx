import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  XMarkIcon,
  TruckIcon,
  UserIcon,
  MapPinIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import UploadRemitoForm from './UploadRemitoForm';

interface ViajeDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  viajeId: string;
  onEstadoActualizado?: () => void;
}

interface ViajeDetalle {
  id: string;
  despacho_id: string;
  pedido_id: string;
  numero_viaje: number;
  origen: string;
  destino: string;
  estado: string;
  scheduled_date: string;
  scheduled_time: string;
  distancia_km?: number;
  tiempo_estimado_horas?: number;
  chofer?: {
    id: string;
    nombre: string;
    telefono?: string;
  };
  camion?: {
    id: string;
    patente: string;
    marca?: string;
    modelo?: string;
  };
  acoplado?: {
    patente: string;
  };
  transporte?: {
    nombre: string;
  };
  producto?: string;
  cantidad?: number;
  unidad?: string;
  observaciones?: string;
  created_at: string;
  updated_at: string;
}

interface Documento {
  id: string;
  tipo: string;
  nombre_archivo: string;
  file_url: string;
  uploaded_at: string;
}

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente', color: 'gray', emoji: '⏳' },
  { value: 'transporte_asignado', label: 'Asignado', color: 'blue', emoji: '📦' },
  { value: 'cargando', label: 'Cargando', color: 'yellow', emoji: '⬆️' },
  { value: 'en_camino', label: 'En Camino', color: 'cyan', emoji: '🚛' },
  { value: 'descargando', label: 'Descargando', color: 'orange', emoji: '⬇️' },
  { value: 'completado', label: 'Completado', color: 'green', emoji: '🏁' }
];

const ViajeDetalleModal: React.FC<ViajeDetalleModalProps> = ({
  isOpen,
  onClose,
  viajeId,
  onEstadoActualizado
}) => {
  const [viaje, setViaje] = useState<ViajeDetalle | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [actualizandoEstado, setActualizandoEstado] = useState(false);

  useEffect(() => {
    if (isOpen && viajeId) {
      loadViajeDetalle();
      loadDocumentos();
    }
  }, [isOpen, viajeId]);

  const loadViajeDetalle = async () => {
    try {
      setLoading(true);
      setError('');

      // Cargar viaje con datos relacionados
      const { data: viajeData, error: viajeError } = await supabase
        .from('viajes_despacho')
        .select(`
          id,
          despacho_id,
          numero_viaje,
          estado,
          chofer_id,
          camion_id,
          acoplado_id,
          id_transporte,
          created_at,
          updated_at,
          despachos!inner(
            pedido_id,
            origen,
            destino,
            scheduled_local_date,
            scheduled_local_time,
            distancia_km,
            tiempo_estimado_horas,
            producto,
            cantidad,
            unidad_carga,
            observaciones
          )
        `)
        .eq('id', viajeId)
        .single();

      if (viajeError) throw viajeError;

      // Cargar datos relacionados en paralelo
      const [choferRes, camionRes, acopladoRes, transporteRes] = await Promise.all([
        viajeData.chofer_id
          ? supabase.from('choferes').select('id, nombre, apellido, dni, telefono').eq('id', viajeData.chofer_id).single()
          : Promise.resolve({ data: null }),
        viajeData.camion_id
          ? supabase.from('camiones').select('id, patente, marca, modelo, anio').eq('id', viajeData.camion_id).single()
          : Promise.resolve({ data: null }),
        viajeData.acoplado_id
          ? supabase.from('acoplados').select('patente, marca, modelo, anio').eq('id', viajeData.acoplado_id).single()
          : Promise.resolve({ data: null }),
        viajeData.id_transporte
          ? supabase.from('empresas').select('nombre').eq('id', viajeData.id_transporte).single()
          : Promise.resolve({ data: null })
      ]);

      const despacho = Array.isArray(viajeData.despachos) ? viajeData.despachos[0] : viajeData.despachos;

      const viajeDetalle: any = {
        id: viajeData.id,
        despacho_id: viajeData.despacho_id,
        pedido_id: despacho?.pedido_id,
        numero_viaje: viajeData.numero_viaje,
        origen: despacho?.origen,
        destino: despacho?.destino,
        estado: viajeData.estado,
        scheduled_date: despacho?.scheduled_local_date,
        scheduled_time: despacho?.scheduled_local_time,
        distancia_km: despacho?.distancia_km,
        tiempo_estimado_horas: despacho?.tiempo_estimado_horas,
        producto: despacho?.producto,
        cantidad: despacho?.cantidad,
        unidad: despacho?.unidad_carga,
        observaciones: despacho?.observaciones,
        created_at: viajeData.created_at,
        updated_at: viajeData.updated_at
      };
      
      if (choferRes.data) viajeDetalle.chofer = choferRes.data;
      if (camionRes.data) viajeDetalle.camion = camionRes.data;
      if (acopladoRes.data) viajeDetalle.acoplado = acopladoRes.data;
      if (transporteRes.data) viajeDetalle.transporte = transporteRes.data;
      
      setViaje(viajeDetalle);

    } catch (err: any) {
      console.error('Error cargando detalle del viaje:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentos = async () => {
    try {
      const { data, error } = await supabase
        .from('documentos_viaje')
        .select('*')
        .eq('viaje_id', viajeId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocumentos(data || []);
    } catch (err: any) {
      console.error('Error cargando documentos:', err);
    }
  };

  const handleActualizarEstado = async (nuevoEstado: string) => {
    if (!viaje) return;

    // Validar transición de estado
    const estadoActualIndex = ESTADOS.findIndex(e => e.value === viaje.estado);
    const nuevoEstadoIndex = ESTADOS.findIndex(e => e.value === nuevoEstado);

    if (nuevoEstadoIndex < estadoActualIndex && nuevoEstado !== 'pendiente') {
      alert('No puedes retroceder a un estado anterior');
      return;
    }

    const estadoLabel = ESTADOS[nuevoEstadoIndex]?.label || nuevoEstado;
    if (!confirm(`¿Confirmas cambiar el estado a "${estadoLabel}"?`)) {
      return;
    }

    try {
      setActualizandoEstado(true);

      const { error } = await supabase
        .from('viajes_despacho')
        .update({ 
          estado: nuevoEstado,
          updated_at: new Date().toISOString()
        })
        .eq('id', viajeId);

      if (error) throw error;

      // Crear notificación (si la tabla existe)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('notificaciones').insert({
          viaje_id: viajeId,
          user_id: user?.id || '',
          tipo: 'cambio_estado',
          titulo: `Estado del viaje actualizado`,
          mensaje: `El viaje #${viaje.numero_viaje} cambió a: ${estadoLabel}`,
          leida: false
        });
      } catch (notifError) {
        console.log('Notificación no creada (tabla puede no existir aún)');
      }

      // Recargar datos
      await loadViajeDetalle();
      
      if (onEstadoActualizado) {
        onEstadoActualizado();
      }

      alert('✅ Estado actualizado exitosamente');

    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setActualizandoEstado(false);
    }
  };

  // const getEstadoInfo = (estado: string) => {
  //   return ESTADOS.find(e => e.value === estado) || ESTADOS[0];
  // };

  const getCurrentEstadoIndex = () => {
    if (!viaje) return 0;
    return ESTADOS.findIndex(e => e.value === viaje.estado);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4 overflow-y-auto">
      <div className="bg-[#1b273b] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-800">
        {/* Header */}
        <div className="sticky top-0 bg-[#1b273b] border-b border-gray-800 p-6 flex justify-between items-start z-10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              Detalle del Viaje #{viaje?.numero_viaje || '...'}
            </h2>
            <p className="text-gray-400 text-sm">
              Pedido: {viaje?.pedido_id || 'Cargando...'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
            <p className="text-gray-400 mt-4">Cargando detalles...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-400">
            Error: {error}
          </div>
        ) : !viaje ? (
          <div className="p-6 text-center text-gray-400">
            No se encontró el viaje
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Estado y Timeline */}
            <div className="bg-[#0a0e1a] rounded-lg p-4 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">Estado Actual</h3>
              <div className="flex items-center justify-between mb-4">
                {ESTADOS.map((estado, index) => {
                  const currentIndex = getCurrentEstadoIndex();
                  const isActive = index === currentIndex;
                  const isPast = index < currentIndex;

                  return (
                    <div key={estado.value} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
                            isActive
                              ? 'bg-cyan-500 border-cyan-400 scale-110'
                              : isPast
                              ? 'bg-green-500 border-green-400'
                              : 'bg-gray-700 border-gray-600'
                          }`}
                        >
                          {isPast ? <CheckCircleIcon className="h-6 w-6 text-white" /> : estado.emoji}
                        </div>
                        <span
                          className={`text-xs mt-2 text-center ${
                            isActive ? 'text-cyan-400 font-bold' : isPast ? 'text-green-400' : 'text-gray-500'
                          }`}
                        >
                          {estado.label}
                        </span>
                      </div>
                      {index < ESTADOS.length - 1 && (
                        <div
                          className={`h-0.5 w-12 mx-2 ${
                            index < currentIndex ? 'bg-green-500' : 'bg-gray-700'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Botones para actualizar estado */}
              {viaje.estado !== 'completado' && (
                <div className="flex gap-2 mt-4 flex-wrap">
                  {ESTADOS.slice(getCurrentEstadoIndex() + 1).map((estado) => (
                    <button
                      key={estado.value}
                      onClick={() => handleActualizarEstado(estado.value)}
                      disabled={actualizandoEstado}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                      Cambiar a: {estado.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Información del viaje */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Origen y Destino */}
              <div className="bg-[#0a0e1a] rounded-lg p-4 border border-gray-800">
                <div className="flex items-start gap-3">
                  <MapPinIcon className="h-5 w-5 text-green-400 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-gray-400 text-sm">Origen</p>
                    <p className="text-white font-medium">{viaje.origen}</p>
                  </div>
                </div>
                <div className="my-3 border-l-2 border-dashed border-gray-700 h-6 ml-2"></div>
                <div className="flex items-start gap-3">
                  <MapPinIcon className="h-5 w-5 text-orange-400 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-gray-400 text-sm">Destino</p>
                    <p className="text-white font-medium">{viaje.destino}</p>
                  </div>
                </div>
              </div>

              {/* Fecha y hora */}
              <div className="bg-[#0a0e1a] rounded-lg p-4 border border-gray-800">
                <div className="flex items-start gap-3 mb-3">
                  <ClockIcon className="h-5 w-5 text-cyan-400 mt-1" />
                  <div>
                    <p className="text-gray-400 text-sm">Fecha programada</p>
                    <p className="text-white font-medium">
                      {new Date(viaje.scheduled_date).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ClockIcon className="h-5 w-5 text-cyan-400 mt-1" />
                  <div>
                    <p className="text-gray-400 text-sm">Hora programada</p>
                    <p className="text-white font-medium">{viaje.scheduled_time}</p>
                  </div>
                </div>
                {viaje.distancia_km && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <p className="text-gray-400 text-sm">Distancia estimada</p>
                    <p className="text-white font-medium">{viaje.distancia_km} km</p>
                  </div>
                )}
              </div>

              {/* Chofer */}
              {viaje.chofer && (
                <div className="bg-[#0a0e1a] rounded-lg p-4 border border-gray-800">
                  <div className="flex items-start gap-3">
                    <UserIcon className="h-5 w-5 text-blue-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-gray-400 text-sm">Chofer</p>
                      <p className="text-white font-medium">{viaje.chofer.nombre}</p>
                      {viaje.chofer.telefono && (
                        <p className="text-gray-400 text-sm mt-1">{viaje.chofer.telefono}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Camión y Acoplado */}
              <div className="bg-[#0a0e1a] rounded-lg p-4 border border-gray-800">
                <div className="flex items-start gap-3 mb-3">
                  <TruckIcon className="h-5 w-5 text-purple-400 mt-1" />
                  <div className="flex-1">
                    <p className="text-gray-400 text-sm">Camión</p>
                    {viaje.camion ? (
                      <>
                        <p className="text-white font-medium">{viaje.camion.patente}</p>
                        {(viaje.camion.marca || viaje.camion.modelo) && (
                          <p className="text-gray-400 text-sm">
                            {viaje.camion.marca} {viaje.camion.modelo}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500 italic">No asignado</p>
                    )}
                  </div>
                </div>
                {viaje.acoplado && (
                  <div className="pt-3 border-t border-gray-800">
                    <p className="text-gray-400 text-sm">Acoplado</p>
                    <p className="text-white font-medium">{viaje.acoplado.patente}</p>
                  </div>
                )}
              </div>

              {/* Producto y cantidad */}
              {viaje.producto && (
                <div className="bg-[#0a0e1a] rounded-lg p-4 border border-gray-800">
                  <div className="flex items-start gap-3">
                    <DocumentTextIcon className="h-5 w-5 text-yellow-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-gray-400 text-sm">Producto</p>
                      <p className="text-white font-medium">{viaje.producto}</p>
                      {viaje.cantidad && (
                        <p className="text-gray-400 text-sm mt-1">
                          {viaje.cantidad} {viaje.unidad || 'unidades'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Transporte */}
              {viaje.transporte && (
                <div className="bg-[#0a0e1a] rounded-lg p-4 border border-gray-800">
                  <div className="flex items-start gap-3">
                    <BuildingOfficeIcon className="h-5 w-5 text-cyan-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-gray-400 text-sm">Empresa de transporte</p>
                      <p className="text-white font-medium">{viaje.transporte.nombre}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Observaciones */}
            {viaje.observaciones && (
              <div className="bg-[#0a0e1a] rounded-lg p-4 border border-gray-800">
                <h3 className="text-white font-semibold mb-2">Observaciones</h3>
                <p className="text-gray-300">{viaje.observaciones}</p>
              </div>
            )}

            {/* Documentos */}
            <div className="bg-[#0a0e1a] rounded-lg p-4 border border-gray-800">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-cyan-400" />
                Documentos ({documentos.length})
              </h3>
              
              {/* Formulario de upload */}
              <div className="mb-4 pb-4 border-b border-gray-800">
                <h4 className="text-gray-300 text-sm font-medium mb-3">Subir nuevo documento</h4>
                <UploadRemitoForm 
                  viajeId={viajeId} 
                  onSuccess={() => {
                    loadDocumentos();
                  }} 
                />
              </div>

              {/* Lista de documentos */}
              {documentos.length > 0 ? (
                <div className="space-y-2">
                  {documentos.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-[#1b273b] rounded border border-gray-800 hover:border-cyan-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-white text-sm font-medium">{doc.nombre_archivo}</p>
                          <p className="text-gray-400 text-xs">
                            {new Date(doc.uploaded_at).toLocaleDateString('es-AR')} -{' '}
                            {doc.tipo}
                          </p>
                        </div>
                      </div>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm"
                      >
                        Ver
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No hay documentos adjuntos</p>
              )}
            </div>

            {/* Metadatos */}
            <div className="text-xs text-gray-500 pt-4 border-t border-gray-800">
              <p>Creado: {new Date(viaje.created_at).toLocaleString('es-AR')}</p>
              <p>Actualizado: {new Date(viaje.updated_at).toLocaleString('es-AR')}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#1b273b] border-t border-gray-800 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViajeDetalleModal;
