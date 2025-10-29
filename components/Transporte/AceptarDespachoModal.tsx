import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import {
  XMarkIcon,
  TruckIcon,
  UserIcon,
  PlusIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface AceptarDespachoModalProps {
  isOpen: boolean;
  onClose: () => void;
  despacho: {
    id: string;
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
  telefono?: string;
  disponible: boolean;
}

interface Camion {
  id: string;
  patente: string;
  marca?: string;
  modelo?: string;
  tipo_camion?: string;
  estado: string;
}

interface Acoplado {
  id: string;
  patente: string;
  tipo?: string;
  estado: string;
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
  const [cantidadViajes, setCantidadViajes] = useState(1);
  
  // Listas
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [acoplados, setAcoplados] = useState<Acoplado[]>([]);
  
  const [empresaId, setEmpresaId] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && user && userEmpresas) {
      loadData();
    }
  }, [isOpen, user, userEmpresas]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      setError('');

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
          .select('id, nombre, telefono, disponible')
          .eq('empresa_id', empId)
          .eq('activo', true)
          .order('nombre'),
        supabase
          .from('camiones')
          .select('id, patente, marca, modelo, tipo_camion, estado')
          .eq('empresa_id', empId)
          .eq('activo', true)
          .order('patente'),
        supabase
          .from('acoplados')
          .select('id, patente, tipo, estado')
          .eq('empresa_id', empId)
          .eq('activo', true)
          .order('patente')
      ]);

      if (choferesRes.error) throw choferesRes.error;
      if (camionesRes.error) throw camionesRes.error;
      if (acopladosRes.error) throw acopladosRes.error;

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
      alert('Debes seleccionar al menos un chofer y un camión');
      return;
    }

    if (cantidadViajes < 1 || cantidadViajes > 10) {
      alert('La cantidad de viajes debe estar entre 1 y 10');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Crear los viajes
      const viajesACrear = [];
      for (let i = 1; i <= cantidadViajes; i++) {
        viajesACrear.push({
          despacho_id: despacho.id,
          numero_viaje: i,
          id_transporte: empresaId,
          id_chofer: choferId,
          id_camion: camionId,
          id_acoplado: acopladoId || null,
          estado: 'transporte_asignado'
        });
      }

      // Insertar viajes
      const { error: viajesError } = await supabase
        .from('viajes_despacho')
        .insert(viajesACrear);

      if (viajesError) throw viajesError;

      // Actualizar estado del despacho
      const { error: despachoError } = await supabase
        .from('despachos')
        .update({ estado: 'transporte_asignado' })
        .eq('id', despacho.id);

      if (despachoError) throw despachoError;

      // Actualizar disponibilidad del chofer
      await supabase
        .from('choferes')
        .update({ disponible: false })
        .eq('id', choferId);

      // Actualizar estado del camión
      await supabase
        .from('camiones')
        .update({ estado: 'en_viaje' })
        .eq('id', camionId);

      // Actualizar estado del acoplado si existe
      if (acopladoId) {
        await supabase
          .from('acoplados')
          .update({ estado: 'en_viaje' })
          .eq('id', acopladoId);
      }

      // Crear notificación (si la tabla existe)
      try {
        await supabase.from('notificaciones').insert({
          user_id: user?.id,
          empresa_id: empresaId,
          tipo: 'asignacion_viaje',
          titulo: 'Despacho aceptado',
          mensaje: `Has aceptado el despacho ${despacho.pedido_id} con ${cantidadViajes} viaje(s)`,
          despacho_id: despacho.id,
          pedido_id: despacho.pedido_id
        });
      } catch (notifError) {
        console.log('Notificación no creada (tabla puede no existir aún)');
      }

      alert(`✅ Despacho aceptado exitosamente!\n${cantidadViajes} viaje(s) creado(s)`);
      onSuccess();

    } catch (err: any) {
      console.error('Error aceptando despacho:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
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
          <form onSubmit={handleSubmit}>
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
                  className="w-full px-4 py-3 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Seleccionar chofer...</option>
                  {choferes.map((chofer) => (
                    <option key={chofer.id} value={chofer.id} disabled={!chofer.disponible}>
                      {chofer.nombre} {chofer.telefono ? `- ${chofer.telefono}` : ''} 
                      {!chofer.disponible ? ' (No disponible)' : ''}
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
                  className="w-full px-4 py-3 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Seleccionar camión...</option>
                  {camiones.map((camion) => (
                    <option 
                      key={camion.id} 
                      value={camion.id}
                      disabled={camion.estado !== 'disponible'}
                    >
                      {camion.patente} 
                      {camion.marca && camion.modelo ? ` - ${camion.marca} ${camion.modelo}` : ''}
                      {camion.estado !== 'disponible' ? ` (${camion.estado})` : ''}
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
                  className="w-full px-4 py-3 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Sin acoplado</option>
                  {acoplados.map((acoplado) => (
                    <option 
                      key={acoplado.id} 
                      value={acoplado.id}
                      disabled={acoplado.estado !== 'disponible'}
                    >
                      {acoplado.patente}
                      {acoplado.tipo ? ` - ${acoplado.tipo}` : ''}
                      {acoplado.estado !== 'disponible' ? ` (${acoplado.estado})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cantidad de viajes */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Cantidad de viajes *
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={cantidadViajes}
                  onChange={(e) => setCantidadViajes(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 bg-[#0a0e1a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  required
                />
                <p className="text-gray-400 text-sm mt-1">
                  Si el despacho requiere múltiples viajes, especifica la cantidad (máximo 10)
                </p>
              </div>

              {/* Resumen */}
              <div className="bg-cyan-900/20 border border-cyan-700 rounded-lg p-4">
                <h4 className="text-cyan-400 font-semibold mb-2">Resumen</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Se crearán {cantidadViajes} viaje(s) para este despacho</li>
                  <li>• El chofer será marcado como no disponible</li>
                  <li>• El camión será marcado como en viaje</li>
                  {acopladoId && <li>• El acoplado será marcado como en viaje</li>}
                  <li>• El estado del despacho cambiará a "transporte_asignado"</li>
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
