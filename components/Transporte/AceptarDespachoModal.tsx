import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import {
  XMarkIcon,
  TruckIcon,
  UserIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface AceptarDespachoModalProps {
  isOpen: boolean;
  onClose: () => void;
  despacho: {
    id: string;
    despacho_id?: string;
    pedido_id: string;
    origen: string;
    destino: string;
    scheduled_local_date: string;
    scheduled_local_time: string;
    producto?: string;
    cantidad?: number;
    unidad_carga?: string;
  };
  onSuccess: () => void;
}

interface Chofer {
  id: string;
  nombre: string;
  apellido?: string;
  telefono?: string;
  email?: string;
}

interface Camion {
  id: string;
  patente: string;
  marca?: string;
  modelo?: string;
  anio?: number;
}

interface Acoplado {
  id: string;
  patente: string;
  marca?: string;
  modelo?: string;
  anio?: number;
}

const AceptarDespachoModal: React.FC<AceptarDespachoModalProps> = ({
  isOpen,
  onClose,
  despacho,
  onSuccess
}) => {
  const { user, userEmpresas } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  // Datos del formulario
  const [choferId, setChoferId] = useState('');
  const [camionId, setCamionId] = useState('');
  const [acopladoId, setAcopladoId] = useState('');
  
  // Listas
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [acoplados, setAcoplados] = useState<Acoplado[]>([]);

  // const [empresaId, setEmpresaId] = useState<string>('');
  const [, setEmpresaId] = useState<string>('');
  const [error, setError] = useState('');  useEffect(() => {
    if (isOpen && user && userEmpresas) {
      loadData();
    }
  }, [isOpen, user, userEmpresas]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      setError('');

      if (!user) {
        setError('Usuario no autenticado');
        return;
      }

      // Obtener empresa de transporte del usuario
      const empresaTransporte = userEmpresas?.find(
        (rel: any) => rel.empresas?.tipo_empresa === 'transporte'
      );

      if (!empresaTransporte) {
        setError('No tienes una empresa de transporte asignada');
        return;
      }

      const empId = empresaTransporte.empresa_id;
      setEmpresaId(empId);

      // Cargar choferes, camiones y acoplados en paralelo
      const [choferesRes, camionesRes, acopladosRes] = await Promise.all([
        supabase
          .from('choferes')
          .select('*')
          .eq('id_transporte', empId),
        supabase
          .from('camiones')
          .select('*')
          .eq('id_transporte', empId),
        supabase
          .from('acoplados')
          .select('*')
          .eq('id_transporte', empId)
      ]);

      if (choferesRes.error) throw choferesRes.error;
      if (camionesRes.error) throw camionesRes.error;
      if (acopladosRes.error) throw acopladosRes.error;

      console.log('🚗 Choferes cargados:', choferesRes.data);
      console.log('🚛 Camiones cargados:', camionesRes.data);
      console.log('🚚 Acoplados cargados:', acopladosRes.data);

      setChoferes(choferesRes.data || []);
      setCamiones(camionesRes.data || []);
      setAcoplados(acopladosRes.data || []);

    } catch (err: any) {
      console.error('Error cargando datos:', err);
      setError(err.message);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!choferId || !camionId) {
      setError('Debes seleccionar al menos un chofer y un camión');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // 🔍 VALIDACIÓN: Verificar que el chofer no tenga otro viaje en la misma fecha
      const { data: viajesChofer, error: errorChofer } = await supabase
        .from('viajes_despacho')
        .select(`
          id,
          despachos!inner (scheduled_local_date)
        `)
        .eq('id_chofer', choferId)
        .eq('despachos.scheduled_local_date', despacho.scheduled_local_date)
        .in('estado', ['camion_asignado', 'confirmado', 'en_transito', 'en_planta', 'esperando_carga', 'cargando', 'carga_completa', 'en_ruta'])
        .neq('id', despacho.id); // Excluir el viaje actual

      if (errorChofer) throw errorChofer;
      
      if (viajesChofer && viajesChofer.length > 0) {
        setError(`El chofer seleccionado ya tiene un viaje asignado para la fecha ${new Date(despacho.scheduled_local_date).toLocaleDateString('es-AR')}. Por favor selecciona otro chofer.`);
        setLoading(false);
        return;
      }

      // 🔍 VALIDACIÓN: Verificar que el camión no tenga otro viaje en la misma fecha
      const { data: viajesCamion, error: errorCamion } = await supabase
        .from('viajes_despacho')
        .select(`
          id,
          despachos!inner (scheduled_local_date)
        `)
        .eq('id_camion', camionId)
        .eq('despachos.scheduled_local_date', despacho.scheduled_local_date)
        .in('estado', ['camion_asignado', 'confirmado', 'en_transito', 'en_planta', 'esperando_carga', 'cargando', 'carga_completa', 'en_ruta'])
        .neq('id', despacho.id);

      if (errorCamion) throw errorCamion;
      
      if (viajesCamion && viajesCamion.length > 0) {
        setError(`El camión seleccionado ya tiene un viaje asignado para la fecha ${new Date(despacho.scheduled_local_date).toLocaleDateString('es-AR')}. Por favor selecciona otro camión.`);
        setLoading(false);
        return;
      }

      // 🔍 VALIDACIÓN: Verificar que el acoplado (si fue seleccionado) no tenga otro viaje en la misma fecha
      if (acopladoId) {
        const { data: viajesAcoplado, error: errorAcoplado } = await supabase
          .from('viajes_despacho')
          .select(`
            id,
            despachos!inner (scheduled_local_date)
          `)
          .eq('id_acoplado', acopladoId)
          .eq('despachos.scheduled_local_date', despacho.scheduled_local_date)
          .in('estado', ['camion_asignado', 'confirmado', 'en_transito', 'en_planta', 'esperando_carga', 'cargando', 'carga_completa', 'en_ruta'])
          .neq('id', despacho.id);

        if (errorAcoplado) throw errorAcoplado;
        
        if (viajesAcoplado && viajesAcoplado.length > 0) {
          setError(`El acoplado seleccionado ya tiene un viaje asignado para la fecha ${new Date(despacho.scheduled_local_date).toLocaleDateString('es-AR')}. Por favor selecciona otro acoplado o continúa sin acoplado.`);
          setLoading(false);
          return;
        }
      }

      // ✅ Todos los recursos están disponibles, proceder con la asignación
      const { error: viajeError } = await supabase
        .from('viajes_despacho')
        .update({
          chofer_id: choferId,
          camion_id: camionId,
          acoplado_id: acopladoId || null,
          estado: 'camion_asignado'
        })
        .eq('id', despacho.id);

      if (viajeError) throw viajeError;

      // 🔥 CRÍTICO: Actualizar despacho padre con chofer/camión asignados
      if (despacho.despacho_id) {
        const { error: despachoError } = await supabase
          .from('despachos')
          .update({ 
            estado: 'camion_asignado',
            driver_id: choferId,      // ← NUEVO: Sincronizar chofer
            truck_id: camionId         // ← NUEVO: Sincronizar camión
          })
          .eq('id', despacho.despacho_id);

        if (despachoError) {
          console.error('⚠️ Error actualizando despacho padre:', despachoError);
          // No lanzar error para no bloquear, pero registrar
        } else {
          console.log('✅ Despacho padre actualizado con driver_id y truck_id');
        }
      }

      // ✅ Éxito - Solo llamar onSuccess, que manejará el cierre y la recarga
      onSuccess();

    } catch (err: any) {
      console.error('Error asignando recursos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1b273b] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-800">
        {/* Header */}
        <div className="sticky top-0 bg-[#1b273b] border-b border-gray-800 p-6 flex justify-between items-start z-10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Aceptar Despacho</h2>
            <p className="text-gray-400 text-sm">Pedido: {despacho.pedido_id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {loadingData ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
            <p className="text-gray-400 mt-4">Cargando datos...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-400">
            Error: {error}
          </div>
        ) : (
          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="p-6 space-y-6">
              {/* Información del despacho */}
              <div className="bg-[#0a0e1a] rounded-lg p-4 border border-gray-800">
                <h3 className="text-white font-semibold mb-3">Información del Despacho</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Origen</p>
                    <p className="text-white font-medium">{despacho.origen}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Destino</p>
                    <p className="text-white font-medium">{despacho.destino}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Fecha</p>
                    <p className="text-white font-medium">
                      {new Date(despacho.scheduled_local_date).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Hora</p>
                    <p className="text-white font-medium">{despacho.scheduled_local_time}</p>
                  </div>
                  {despacho.producto && (
                    <div className="col-span-2">
                      <p className="text-gray-400">Producto</p>
                      <p className="text-white font-medium">
                        {despacho.producto}
                        {despacho.cantidad && ` - ${despacho.cantidad} ${despacho.unidad_carga || ''}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Selección de chofer */}
              <div>
                <label className="block text-white font-semibold mb-2 flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-cyan-400" />
                  Chofer *
                </label>
                <select
                  value={choferId}
                  onChange={(e) => setChoferId(e.target.value)}
                  required
                  autoComplete="off"
                  className="w-full px-4 py-3 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Seleccionar chofer...</option>
                  {choferes.map((chofer) => (
                    <option key={chofer.id} value={chofer.id}>
                      {chofer.nombre} {chofer.apellido || ''} {chofer.telefono ? `- ${chofer.telefono}` : ''}
                    </option>
                  ))}
                </select>
                {choferes.length === 0 && (
                  <p className="text-yellow-400 text-sm mt-2">
                    No tienes choferes registrados. Agrégalos en la sección de Choferes.
                  </p>
                )}
              </div>

              {/* Selección de camión */}
              <div>
                <label className="block text-white font-semibold mb-2 flex items-center gap-2">
                  <TruckIcon className="h-5 w-5 text-cyan-400" />
                  Camión *
                </label>
                <select
                  value={camionId}
                  onChange={(e) => setCamionId(e.target.value)}
                  required
                  autoComplete="off"
                  className="w-full px-4 py-3 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Seleccionar camión...</option>
                  {camiones.map((camion) => (
                    <option 
                      key={camion.id} 
                      value={camion.id}
                    >
                      {camion.patente} 
                      {camion.marca && camion.modelo ? ` - ${camion.marca} ${camion.modelo}` : ''}
                    </option>
                  ))}
                </select>
                {camiones.length === 0 && (
                  <p className="text-yellow-400 text-sm mt-2">
                    No tienes camiones registrados. Agrégalos en la sección de Flota.
                  </p>
                )}
              </div>

              {/* Selección de acoplado (opcional) */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Acoplado (opcional)
                </label>
                <select
                  value={acopladoId}
                  onChange={(e) => setAcopladoId(e.target.value)}
                  autoComplete="off"
                  className="w-full px-4 py-3 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Sin acoplado</option>
                  {acoplados.map((acoplado) => (
                    <option 
                      key={acoplado.id} 
                      value={acoplado.id}
                    >
                      {acoplado.patente}
                      {acoplado.marca && acoplado.modelo ? ` - ${acoplado.marca} ${acoplado.modelo}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Error de validación */}
              {error && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                  <h4 className="text-red-400 font-semibold mb-2">⚠️ Error</h4>
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              {/* Resumen */}
              <div className="bg-cyan-900/20 border border-cyan-700 rounded-lg p-4">
                <h4 className="text-cyan-400 font-semibold mb-2">Resumen</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Se asignarán chofer y camión a los viajes existentes</li>
                  <li>• El estado cambiará a "Camión Asignado"</li>
                  <li>• Los recursos quedarán vinculados a este despacho</li>
                  <li>• Se verificará que los recursos no tengan viajes en la misma fecha</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-[#1b273b] border-t border-gray-800 p-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !choferId || !camionId}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Aceptando...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5" />
                    Aceptar Despacho
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AceptarDespachoModal;
