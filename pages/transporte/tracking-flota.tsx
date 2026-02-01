import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import FleetMap from '../../components/Maps/FleetMap';
import { TruckIcon, MapPinIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline';

interface UnidadTracking {
  id: string;
  nombre: string;
  codigo: string;
  chofer_id: string;
  chofer_nombre: string;
  chofer_apellido: string;
  chofer_telefono: string;
  camion_id: string;
  camion_patente: string;
  camion_marca: string;
  camion_modelo: string;
  acoplado_patente?: string;
  estado_actual?: string;
  horas_conducidas_hoy: number;
  viaje_actual?: {
    id: string;
    despacho_id: string;
    pedido_id: string;
    origen: string;
    destino: string;
    estado: string;
  };
  ubicacion_actual?: {
    latitud: number;
    longitud: number;
    timestamp: string;
  };
}

export default function TrackingFlota() {
  const { userEmpresas } = useUserRole();
  const [unidades, setUnidades] = useState<UnidadTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUnidad, setSelectedUnidad] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadUnidades();

    // Auto-refresh cada 30 segundos si está habilitado
    if (autoRefresh) {
      const interval = setInterval(loadUnidades, 30000);
      return () => clearInterval(interval);
    }
  }, [userEmpresas, autoRefresh]);

  const loadUnidades = async () => {
    try {
      setError('');

      const empresaTransporte = userEmpresas?.find(
        (rel: any) => rel.empresas?.tipo_empresa === 'transporte'
      );

      if (!empresaTransporte) {
        setError('No tienes una empresa de transporte asignada');
        setLoading(false);
        return;
      }

      // Cargar unidades activas con sus viajes actuales
      const { data: unidadesData, error: err } = await supabase
        .from('vista_disponibilidad_unidades')
        .select('*')
        .eq('empresa_id', empresaTransporte.empresa_id)
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (err) throw err;

      if (!unidadesData || unidadesData.length === 0) {
        setUnidades([]);
        setLoading(false);
        return;
      }

      // Para cada unidad, obtener ubicación actual y viaje activo
      const unidadesConTracking = await Promise.all(
        unidadesData.map(async (unidad: any) => {
          // Buscar viaje activo
          const { data: viajeActivo } = await supabase
            .from('viajes_despacho')
            .select(
              `
              id,
              despacho_id,
              estado,
              despachos:despacho_id (
                id,
                pedido_id,
                origen,
                destino
              )
            `
            )
            .or('chofer_id.eq.' + unidad.chofer_id + ',camion_id.eq.' + unidad.camion_id)
            .in('estado', [
              'transporte_asignado',
              'confirmado_chofer',
              'en_transito_origen',
              'arribo_origen',
              'carga_completada',
              'en_transito_destino',
              'arribo_destino'
            ])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Buscar última ubicación GPS registrada
          const { data: ubicacion } = await supabase
            .from('tracking_gps')
            .select('latitud, longitud, timestamp')
            .eq('chofer_id', unidad.chofer_id)
            .order('timestamp', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: unidad.id,
            nombre: unidad.nombre,
            codigo: unidad.codigo,
            chofer_id: unidad.chofer_id,
            chofer_nombre: unidad.chofer_nombre,
            chofer_apellido: unidad.chofer_apellido,
            chofer_telefono: unidad.chofer_telefono,
            camion_id: unidad.camion_id,
            camion_patente: unidad.camion_patente,
            camion_marca: unidad.camion_marca,
            camion_modelo: unidad.camion_modelo,
            acoplado_patente: unidad.acoplado_patente,
            horas_conducidas_hoy: unidad.horas_conducidas_hoy || 0,
            viaje_actual: viajeActivo
              ? {
                  id: viajeActivo.id,
                  despacho_id: viajeActivo.despacho_id,
                  pedido_id: (Array.isArray(viajeActivo.despachos) ? (viajeActivo.despachos[0] as any)?.pedido_id || '' : (viajeActivo.despachos as any)?.pedido_id || '') as string,
                  origen: (Array.isArray(viajeActivo.despachos) ? (viajeActivo.despachos[0] as any)?.origen || '' : (viajeActivo.despachos as any)?.origen || '') as string,
                  destino: (Array.isArray(viajeActivo.despachos) ? (viajeActivo.despachos[0] as any)?.destino || '' : (viajeActivo.despachos as any)?.destino || '') as string,
                  estado: viajeActivo.estado
                }
              : undefined,
            ubicacion_actual: ubicacion
              ? {
                  latitud: ubicacion.latitud,
                  longitud: ubicacion.longitud,
                  timestamp: ubicacion.timestamp
                }
              : undefined,
            estado_actual: viajeActivo?.estado
          };
        })
      );

      setUnidades(unidadesConTracking);
      setLoading(false);
    } catch (err: any) {
      console.error('Error al cargar tracking:', err);
      setError(err.message || 'Error al cargar tracking');
      setLoading(false);
    }
  };

  // Preparar datos para el mapa
  const unidadesParaMapa = unidades
    .filter((u) => u.ubicacion_actual)
    .map((u) => ({
      id: u.id,
      nombre: u.nombre,
      codigo: u.codigo,
      chofer_nombre: u.chofer_nombre,
      chofer_apellido: u.chofer_apellido,
      camion_patente: u.camion_patente,
      ubicacion: u.ubicacion_actual
        ? {
            lat: u.ubicacion_actual.latitud,
            lng: u.ubicacion_actual.longitud,
            timestamp: u.ubicacion_actual.timestamp
          }
        : undefined,
      estado: u.estado_actual,
      horas_conducidas_hoy: u.horas_conducidas_hoy
    }));

  const unidadSeleccionada = unidades.find((u) => u.id === selectedUnidad);

  const formatEstado = (estado: string) => {
    const estados: Record<string, string> = {
      transporte_asignado: 'Asignado',
      confirmado_chofer: 'Confirmado',
      en_transito_origen: 'En tránsito a origen',
      arribo_origen: 'Arribado a origen',
      carga_completada: 'Carga completada',
      en_transito_destino: 'En tránsito a destino',
      arribo_destino: 'Arribado a destino',
      descarga_completada: 'Descarga completada'
    };
    return estados[estado] || estado;
  };

  return (
    <AdminLayout pageTitle="Tracking de Flota">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Tracking de Flota en Tiempo Real</h1>
            <p className="text-gray-400 mt-1">Monitoreo de ubicación y estado de unidades operativas</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Toggle auto-refresh */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-300">Auto-actualizar (30s)</span>
            </label>

            {/* Botón refresh manual */}
            <button
              onClick={loadUnidades}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <TruckIcon className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{unidades.length}</p>
                <p className="text-sm text-gray-400">Unidades activas</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <MapPinIcon className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {unidades.filter((u) => u.ubicacion_actual).length}
                </p>
                <p className="text-sm text-gray-400">Con GPS activo</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <ClockIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {unidades.filter((u) => u.viaje_actual).length}
                </p>
                <p className="text-sm text-gray-400">En viaje activo</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <UserIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {new Set(unidades.map((u) => u.chofer_id)).size}
                </p>
                <p className="text-sm text-gray-400">Choferes activos</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Mapa */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <FleetMap
            unidades={unidadesParaMapa}
            height="600px"
            onUnidadClick={setSelectedUnidad}
          />
        </div>

        {/* Lista de unidades */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold text-white">Listado de Unidades</h2>
          </div>

          <div className="divide-y divide-gray-700">
            {loading && unidades.length === 0 ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                <p className="mt-4 text-gray-400">Cargando unidades...</p>
              </div>
            ) : unidades.length === 0 ? (
              <div className="p-8 text-center">
                <TruckIcon className="mx-auto h-12 w-12 text-gray-600" />
                <p className="mt-4 text-gray-400">No hay unidades activas</p>
              </div>
            ) : (
              unidades.map((unidad) => (
                <div
                  key={unidad.id}
                  className={`p-4 hover:bg-gray-700/50 transition-colors cursor-pointer ${
                    selectedUnidad === unidad.id ? 'bg-indigo-500/10 border-l-4 border-indigo-500' : ''
                  }`}
                  onClick={() => setSelectedUnidad(unidad.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-white">{unidad.nombre}</h3>
                        {unidad.codigo && (
                          <span className="text-sm text-gray-400 font-mono">{unidad.codigo}</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400">👤 Chofer</p>
                          <p className="text-white font-medium">
                            {unidad.chofer_nombre} {unidad.chofer_apellido}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-400">🚛 Vehículo</p>
                          <p className="text-white font-medium">{unidad.camion_patente}</p>
                          <p className="text-gray-500 text-xs">
                            {unidad.camion_marca} {unidad.camion_modelo}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-400">⏱️ Horas conducidas</p>
                          <p
                            className={`font-medium ${
                              unidad.horas_conducidas_hoy >= 8
                                ? 'text-red-400'
                                : unidad.horas_conducidas_hoy >= 6
                                ? 'text-yellow-400'
                                : 'text-green-400'
                            }`}
                          >
                            {unidad.horas_conducidas_hoy.toFixed(1)}h / 9h
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-400">📍 GPS</p>
                          <p className="text-white font-medium">
                            {unidad.ubicacion_actual ? (
                              <span className="text-green-400">✓ Activo</span>
                            ) : (
                              <span className="text-gray-500">Sin señal</span>
                            )}
                          </p>
                          {unidad.ubicacion_actual && (
                            <p className="text-gray-500 text-xs">
                              {new Date(unidad.ubicacion_actual.timestamp).toLocaleTimeString('es-AR')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Viaje actual */}
                      {unidad.viaje_actual && (
                        <div className="mt-3 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-xs font-bold text-indigo-400 uppercase">
                              Viaje Activo
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-gray-400 text-xs">Pedido</p>
                              <p className="text-white font-medium">{unidad.viaje_actual.pedido_id}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs">Ruta</p>
                              <p className="text-white text-xs">
                                {unidad.viaje_actual.origen} → {unidad.viaje_actual.destino}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs">Estado</p>
                              <p className="text-white font-medium text-xs">
                                {formatEstado(unidad.viaje_actual.estado)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
