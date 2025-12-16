// pages/admin/asignar-viaje.tsx
// Herramienta de administración para crear y asignar viajes de prueba

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import {
  TruckIcon,
  UserIcon,
  MapPinIcon,
  PlusIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Chofer {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  email: string | null;
  user_id: string | null;
  id_transporte: string;
  empresas?: {
    nombre: string;
  };
}

interface Camion {
  id: string;
  patente: string;
  marca: string;
  modelo: string;
  id_transporte: string;
  estado: string;
  empresas?: {
    nombre: string;
  };
}

interface Viaje {
  id: string;
  numero_viaje: string;
  estado: string;
  estado_unidad: string;
  created_at: string;
  choferes: {
    nombre: string;
    apellido: string;
  };
  camiones: {
    patente: string;
  };
  despachos: {
    pedido_id: string;
    origen: string;
    destino: string;
    scheduled_local_date: string;
  };
}

export default function AsignarViaje() {
  const router = useRouter();
  const { user, primaryRole } = useUserRole();

  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Formulario
  const [selectedChofer, setSelectedChofer] = useState('');
  const [selectedCamion, setSelectedCamion] = useState('');
  const [pedidoId, setPedidoId] = useState('');
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('14:00');
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (user && primaryRole !== 'admin' && primaryRole !== 'super_admin') {
      router.push('/dashboard');
    }
  }, [user, primaryRole, router]);

  useEffect(() => {
    if (user) {
      cargarDatos();
    }
  }, [user]);

  useEffect(() => {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    setFecha(today);
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Cargar choferes
      const { data: choferesData, error: errorChoferes } = await supabase
        .from('choferes')
        .select(`
          id,
          nombre,
          apellido,
          dni,
          email,
          user_id,
          id_transporte,
          empresas:id_transporte (
            nombre
          )
        `)
        .order('nombre');

      if (errorChoferes) throw errorChoferes;
      setChoferes(choferesData || []);

      // Cargar camiones
      const { data: camionesData, error: errorCamiones } = await supabase
        .from('camiones')
        .select(`
          id,
          patente,
          marca,
          modelo,
          id_transporte,
          estado,
          empresas:id_transporte (
            nombre
          )
        `)
        .order('patente');

      if (errorCamiones) throw errorCamiones;
      setCamiones(camionesData || []);

      // Cargar viajes recientes
      await cargarViajes();

    } catch (error: any) {
      console.error('Error cargando datos:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarViajes = async () => {
    const { data: viajesData, error: errorViajes } = await supabase
      .from('viajes_despacho')
      .select(`
        id,
        numero_viaje,
        estado,
        estado_unidad,
        created_at,
        choferes (
          nombre,
          apellido
        ),
        camiones (
          patente
        ),
        despachos (
          pedido_id,
          origen,
          destino,
          scheduled_local_date
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (errorViajes) throw errorViajes;
    setViajes(viajesData || []);
  };

  const handleCrearViaje = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedChofer || !selectedCamion) {
      setError('Debes seleccionar un chofer y un camión');
      return;
    }

    if (!origen || !destino) {
      setError('Debes completar origen y destino');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Obtener empresa del chofer
      const chofer = choferes.find(c => c.id === selectedChofer);
      if (!chofer) throw new Error('Chofer no encontrado');

      // 1. Crear despacho
      const pedido = pedidoId || `PED-${Date.now().toString().slice(-8)}`;
      
      const { data: despacho, error: errorDespacho } = await supabase
        .from('despachos')
        .insert({
          pedido_id: pedido,
          origen: origen,
          destino: destino,
          scheduled_local_date: fecha,
          scheduled_local_time: hora,
          type: 'contenedor',
          estado: 'confirmado',
          empresa_id: chofer.id_transporte
        })
        .select()
        .single();

      if (errorDespacho) throw errorDespacho;

      // 2. Crear viaje
      const numeroViaje = `VJ-${Date.now().toString().slice(-6)}`;
      
      const { data: viaje, error: errorViaje } = await supabase
        .from('viajes_despacho')
        .insert({
          numero_viaje: numeroViaje,
          despacho_id: despacho.id,
          chofer_id: selectedChofer,
          camion_id: selectedCamion,
          estado: 'asignado',
          estado_unidad: 'asignado',
          observaciones: observaciones || 'Viaje creado desde panel de administración',
          empresa_id: chofer.id_transporte
        })
        .select()
        .single();

      if (errorViaje) throw errorViaje;

      setMessage(`✅ Viaje ${numeroViaje} creado y asignado exitosamente`);
      
      // Limpiar formulario
      setSelectedChofer('');
      setSelectedCamion('');
      setPedidoId('');
      setOrigen('');
      setDestino('');
      setObservaciones('');
      
      // Recargar datos
      await cargarViajes();

    } catch (error: any) {
      console.error('Error creando viaje:', error);
      setError('Error al crear viaje: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarViaje = async (viajeId: string) => {
    if (!confirm('¿Estás seguro de eliminar este viaje?')) return;

    try {
      setLoading(true);
      
      // Primero obtener el despacho_id
      const { data: viaje } = await supabase
        .from('viajes_despacho')
        .select('despacho_id')
        .eq('id', viajeId)
        .single();

      if (!viaje) throw new Error('Viaje no encontrado');

      // Eliminar viaje
      const { error: errorViaje } = await supabase
        .from('viajes_despacho')
        .delete()
        .eq('id', viajeId);

      if (errorViaje) throw errorViaje;

      // Eliminar despacho asociado
      const { error: errorDespacho } = await supabase
        .from('despachos')
        .delete()
        .eq('id', viaje.despacho_id);

      if (errorDespacho) console.warn('No se pudo eliminar despacho:', errorDespacho);

      setMessage('✅ Viaje eliminado');
      await cargarViajes();

    } catch (error: any) {
      setError('Error al eliminar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && choferes.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                🚛 Asignar Viajes
              </h1>
              <p className="text-slate-400">
                Crea y asigna viajes de prueba a choferes
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Volver
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulario de creación */}
          <div>
            <div className="bg-slate-800 rounded-xl shadow-xl p-6 border border-slate-700">
              <h2 className="text-sm font-bold text-white mb-2 flex items-center">
                <PlusIcon className="h-6 w-6 mr-2 text-cyan-400" />
                Crear Nuevo Viaje
              </h2>

              {message && (
                <div className="mb-4 p-4 bg-green-900/30 border border-green-600 rounded-lg text-green-400">
                  {message}
                </div>
              )}

              {error && (
                <div className="mb-4 p-4 bg-red-900/30 border border-red-600 rounded-lg text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleCrearViaje} className="space-y-6">
                {/* Seleccionar Chofer */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <UserIcon className="h-5 w-5 inline mr-2 text-cyan-400" />
                    Chofer *
                  </label>
                  <select
                    value={selectedChofer}
                    onChange={(e) => setSelectedChofer(e.target.value)}
                    required
                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  >
                    <option value="">Seleccionar chofer...</option>
                    {choferes.map(chofer => (
                      <option key={chofer.id} value={chofer.id}>
                        {chofer.nombre} {chofer.apellido} ({chofer.dni})
                        {chofer.user_id && ' ✓ Con usuario'}
                        {chofer.empresas && ` - ${chofer.empresas.nombre}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Seleccionar Camión */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <TruckIcon className="h-5 w-5 inline mr-2 text-cyan-400" />
                    Camión *
                  </label>
                  <select
                    value={selectedCamion}
                    onChange={(e) => setSelectedCamion(e.target.value)}
                    required
                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  >
                    <option value="">Seleccionar camión...</option>
                    {camiones.map(camion => (
                      <option key={camion.id} value={camion.id}>
                        {camion.patente} - {camion.marca} {camion.modelo}
                        {camion.empresas && ` - ${camion.empresas.nombre}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pedido ID */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Pedido ID (opcional)
                  </label>
                  <input
                    type="text"
                    value={pedidoId}
                    onChange={(e) => setPedidoId(e.target.value)}
                    placeholder="Se generará automáticamente"
                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Origen */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <MapPinIcon className="h-5 w-5 inline mr-2 text-green-400" />
                    Origen *
                  </label>
                  <input
                    type="text"
                    value={origen}
                    onChange={(e) => setOrigen(e.target.value)}
                    placeholder="Ej: Puerto de Buenos Aires - Terminal 4"
                    required
                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Destino */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <MapPinIcon className="h-5 w-5 inline mr-2 text-red-400" />
                    Destino *
                  </label>
                  <input
                    type="text"
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    placeholder="Ej: Depósito Central Rosario - Av. Circunvalación 2500"
                    required
                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Fecha y Hora */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Fecha *
                    </label>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      required
                      className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Hora *
                    </label>
                    <input
                      type="time"
                      value={hora}
                      onChange={(e) => setHora(e.target.value)}
                      required
                      className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Información adicional sobre el viaje..."
                    rows={3}
                    className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Botón Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-4 rounded-lg font-bold text-lg shadow-lg hover:from-cyan-700 hover:to-blue-700 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <CheckCircleIcon className="h-6 w-6" />
                  <span>{loading ? 'Creando...' : 'Crear y Asignar Viaje'}</span>
                </button>
              </form>
            </div>

            {/* Resumen de recursos */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="text-slate-400 text-sm mb-1">Choferes</div>
                <div className="text-3xl font-bold text-white">{choferes.length}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {choferes.filter(c => c.user_id).length} con usuario
                </div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="text-slate-400 text-sm mb-1">Camiones</div>
                <div className="text-3xl font-bold text-white">{camiones.length}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {camiones.filter(c => c.estado === 'disponible').length} disponibles
                </div>
              </div>
            </div>
          </div>

          {/* Lista de viajes recientes */}
          <div>
            <div className="bg-slate-800 rounded-xl shadow-xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-6">
                📋 Viajes Recientes
              </h2>

              <div className="space-y-4">
                {viajes.length === 0 ? (
                  <div className="text-center py-12">
                    <TruckIcon className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No hay viajes creados aún</p>
                  </div>
                ) : (
                  viajes.map(viaje => (
                    <div
                      key={viaje.id}
                      className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-cyan-500 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-white mb-1">
                            {viaje.numero_viaje}
                          </h3>
                          <p className="text-sm text-slate-400">
                            {viaje.despachos.pedido_id}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            viaje.estado_unidad === 'asignado' ? 'bg-yellow-900/50 text-yellow-400' :
                            viaje.estado_unidad === 'confirmado_chofer' ? 'bg-blue-900/50 text-blue-400' :
                            viaje.estado_unidad === 'en_transito_origen' ? 'bg-blue-600 text-white' :
                            'bg-slate-600 text-slate-300'
                          }`}>
                            {viaje.estado_unidad}
                          </span>
                          <button
                            onClick={() => handleEliminarViaje(viaje.id)}
                            className="p-1 hover:bg-red-600 rounded transition-colors"
                            title="Eliminar viaje"
                          >
                            <XMarkIcon className="h-5 w-5 text-red-400 hover:text-white" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-slate-300">
                          <UserIcon className="h-4 w-4 mr-2 text-cyan-400" />
                          {viaje.choferes.nombre} {viaje.choferes.apellido}
                        </div>
                        <div className="flex items-center text-slate-300">
                          <TruckIcon className="h-4 w-4 mr-2 text-cyan-400" />
                          {viaje.camiones.patente}
                        </div>
                        <div className="flex items-start text-slate-300">
                          <MapPinIcon className="h-4 w-4 mr-2 mt-0.5 text-green-400" />
                          <div className="flex-1">
                            <div className="text-xs text-slate-500">Origen</div>
                            {viaje.despachos.origen}
                          </div>
                        </div>
                        <div className="flex items-start text-slate-300">
                          <MapPinIcon className="h-4 w-4 mr-2 mt-0.5 text-red-400" />
                          <div className="flex-1">
                            <div className="text-xs text-slate-500">Destino</div>
                            {viaje.despachos.destino}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 pt-2 border-t border-slate-600">
                          Fecha: {new Date(viaje.despachos.scheduled_local_date).toLocaleDateString('es-AR')}
                          {' • '}
                          Creado: {new Date(viaje.created_at).toLocaleString('es-AR')}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
