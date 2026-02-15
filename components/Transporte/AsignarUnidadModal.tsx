import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { fetchWithAuth } from '../../lib/api/fetchWithAuth';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import { TruckIcon, XMarkIcon, MapPinIcon, ClockIcon, CheckCircleIcon, DocumentCheckIcon } from '@heroicons/react/24/outline';
import RouteMap from '../Maps/RouteMap';

interface DocStatus {
  total_requeridos: number;
  total_subidos: number;
  vigentes: number;
  por_vencer: number;
  vencidos: number;
  faltantes: string[];
  estado: 'ok' | 'warning' | 'danger' | 'missing';
}

interface UnidadDisponible {
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
  acoplado_id?: string;
  acoplado_patente?: string;
  horas_conducidas_hoy: number;
  necesita_descanso_obligatorio: boolean;
  proxima_hora_disponible: string;
  ultimo_viaje?: {
    destino: string;
    destino_id: string;
  };
  // Scoring
  distancia_km?: number;
  score?: number;
  categoria?: 'ÓPTIMA' | 'BUENA' | 'POSIBLE';
  estrellas?: number;
}

interface Despacho {
  id: string; // ID del despacho real
  viaje_id?: string; // ID del viaje si ya existe
  pedido_id: string;
  origen: string;
  origen_id?: string;
  origen_ciudad?: string;
  origen_provincia?: string;
  destino: string;
  destino_id?: string;
  destino_ciudad?: string;
  destino_provincia?: string;
  scheduled_local_date: string;
  scheduled_local_time: string;
}

interface AsignarUnidadModalProps {
  isOpen: boolean;
  onClose: () => void;
  despacho: Despacho;
  onSuccess: () => void;
}

export default function AsignarUnidadModal({
  isOpen,
  onClose,
  despacho,
  onSuccess
}: AsignarUnidadModalProps) {
  const { userEmpresas } = useUserRole();
  const [unidades, setUnidades] = useState<UnidadDisponible[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUnidad, setSelectedUnidad] = useState<string | null>(null);
  const [asignando, setAsignando] = useState(false);
  const [distanciaViaje, setDistanciaViaje] = useState<number | null>(null);
  const [origenCoords, setOrigenCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destinoCoords, setDestinoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [docStatusMap, setDocStatusMap] = useState<Record<string, DocStatus>>({});

  useEffect(() => {
    if (isOpen && userEmpresas) {
      loadUnidadesConScoring();
    }
  }, [isOpen, userEmpresas, despacho.origen_id]);

  // Calcular distancia usando fórmula de Haversine
  const calcularDistancia = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Calcular score de asignación (0-100)
  const calcularScore = (
    distanciaKm: number,
    horasConducidas: number,
    necesitaDescanso: boolean
  ): { score: number; categoria: 'ÓPTIMA' | 'BUENA' | 'POSIBLE'; estrellas: number } => {
    let score = 100;

    // Factor 1: Distancia (peso 40%)
    // 0-50km = 40 puntos
    // 51-150km = 30 puntos
    // 151-300km = 20 puntos
    // >300km = 10 puntos
    if (distanciaKm <= 50) {
      score -= 0;
    } else if (distanciaKm <= 150) {
      score -= 10;
    } else if (distanciaKm <= 300) {
      score -= 20;
    } else {
      score -= 30;
    }

    // Factor 2: Horas conducidas (peso 30%)
    // 0-3h = 0 descuento
    // 3-6h = -10 puntos
    // 6-8h = -20 puntos
    // 8-9h = -30 puntos
    if (horasConducidas <= 3) {
      score -= 0;
    } else if (horasConducidas <= 6) {
      score -= 10;
    } else if (horasConducidas <= 8) {
      score -= 20;
    } else {
      score -= 30;
    }

    // Factor 3: Necesita descanso (peso 30%)
    if (necesitaDescanso) {
      score = 0; // No viable
    }

    // Determinar categoría
    let categoria: 'ÓPTIMA' | 'BUENA' | 'POSIBLE';
    let estrellas: number;

    if (score >= 80) {
      categoria = 'ÓPTIMA';
      estrellas = 3;
    } else if (score >= 50) {
      categoria = 'BUENA';
      estrellas = 2;
    } else if (score > 0) {
      categoria = 'POSIBLE';
      estrellas = 1;
    } else {
      categoria = 'POSIBLE';
      estrellas = 0;
    }

    return { score, categoria, estrellas };
  };

  const loadUnidadesConScoring = async () => {
    try {
      setLoading(true);
      setError('');

      const empresaTransporte = userEmpresas?.find(
        (rel: any) => rel.empresas?.tipo_empresa === 'transporte'
      );

      if (!empresaTransporte) {
        setError('No tienes una empresa de transporte asignada');
        return;
      }

      // 1. Obtener coordenadas del origen del despacho y calcular distancia del viaje
      let origenLat: number | null = null;
      let origenLon: number | null = null;
      let destinoLat: number | null = null;
      let destinoLon: number | null = null;

      if (despacho.origen_id) {
        const { data: ubicacionOrigen } = await supabase
          .from('ubicaciones')
          .select('latitud, longitud')
          .eq('id', despacho.origen_id)
          .single();

        if (ubicacionOrigen?.latitud && ubicacionOrigen?.longitud) {
          setOrigenCoords({ lat: origenLat, lng: origenLon });
        }
      }

      if (despacho.destino_id) {
        const { data: ubicacionDestino } = await supabase
          .from('ubicaciones')
          .select('latitud, longitud')
          .eq('id', despacho.destino_id)
          .single();

        if (ubicacionDestino?.latitud && ubicacionDestino?.longitud) {
          destinoLat = ubicacionDestino.latitud;
          destinoLon = ubicacionDestino.longitud;
          setDestinoCoords({ lat: destinoLat, lng: destinoLon });
        }
      }

      // Calcular distancia del viaje si tenemos ambas coordenadas
      if (origenLat && origenLon && destinoLat && destinoLon) {
        const distancia = calcularDistancia(origenLat, origenLon, destinoLat, destinoLon);
        setDistanciaViaje(distancia);
      }

      // 2. Cargar unidades activas
      const { data: unidadesData, error: err } = await supabase
        .from('vista_disponibilidad_unidades')
        .select('*')
        .eq('empresa_id', empresaTransporte.empresa_id)
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (err) throw err;

      if (!unidadesData || unidadesData.length === 0) {
        setError('No hay unidades operativas activas. Crea una en la sección Flota > Unidades Operativas.');
        setUnidades([]);
        return;
      }

      // 3. Calcular scoring para cada unidad
      const unidadesConScore = await Promise.all(
        unidadesData.map(async (unidad: any) => {
          let distanciaKm = 0;

          // Intentar obtener ubicación actual de la unidad
          if (origenLat && origenLon) {
            // Si tiene último viaje, usar su destino como ubicación actual
            if (unidad.ultimo_viaje?.destino_id) {
              const { data: ubicacionActual } = await supabase
                .from('ubicaciones')
                .select('latitud, longitud')
                .eq('id', unidad.ultimo_viaje.destino_id)
                .single();

              if (ubicacionActual?.latitud && ubicacionActual?.longitud) {
                distanciaKm = calcularDistancia(
                  ubicacionActual.latitud,
                  ubicacionActual.longitud,
                  origenLat,
                  origenLon
                );
              }
            }
          }

          // Calcular score
          const { score, categoria, estrellas } = calcularScore(
            distanciaKm,
            unidad.horas_conducidas_hoy || 0,
            unidad.necesita_descanso_obligatorio || false
          );

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
            acoplado_id: unidad.acoplado_id,
            acoplado_patente: unidad.acoplado_patente,
            horas_conducidas_hoy: unidad.horas_conducidas_hoy || 0,
            necesita_descanso_obligatorio: unidad.necesita_descanso_obligatorio || false,
            proxima_hora_disponible: unidad.proxima_hora_disponible,
            ultimo_viaje: unidad.ultimo_viaje,
            distancia_km: distanciaKm > 0 ? distanciaKm : undefined,
            score,
            categoria,
            estrellas
          };
        })
      );

      // Ordenar por score descendente
      unidadesConScore.sort((a, b) => (b.score || 0) - (a.score || 0));

      setUnidades(unidadesConScore);

      // Cargar estado de documentación para todas las entidades
      try {
        const entidades: { tipo: string; id: string }[] = [];
        unidadesConScore.forEach(u => {
          if (u.chofer_id) entidades.push({ tipo: 'chofer', id: u.chofer_id });
          if (u.camion_id) entidades.push({ tipo: 'camion', id: u.camion_id });
          if (u.acoplado_id) entidades.push({ tipo: 'acoplado', id: u.acoplado_id });
        });

        if (entidades.length > 0) {
          const docRes = await fetchWithAuth('/api/documentacion/estado-batch', {
            method: 'POST',
            body: JSON.stringify({ entidades }),
          });
          if (docRes.ok) {
            const docData = await docRes.json();
            setDocStatusMap(docData.data || {});
          }
        }
      } catch (docErr) {
        console.warn('⚠️ No se pudo cargar estado de documentación:', docErr);
      }
    } catch (err: any) {
      console.error('Error al cargar unidades:', err);
      setError(err.message || 'Error al cargar unidades');
    } finally {
      setLoading(false);
    }
  };

  const handleAsignar = async () => {
    if (!selectedUnidad) {
      setError('Selecciona una unidad para asignar');
      return;
    }

    try {
      setAsignando(true);
      setError('');

      const unidad = unidades.find(u => u.id === selectedUnidad);
      if (!unidad) throw new Error('Unidad no encontrada');

      // Verificar si ya existe un viaje para este despacho
      let viajeId = despacho.viaje_id;
      
      if (!viajeId) {
        const { data: viajeExistente } = await supabase
          .from('viajes_despacho')
          .select('id, estado')
          .eq('despacho_id', despacho.id)
          .maybeSingle();
        
        viajeId = viajeExistente?.id;
        
        // 🛡️ VALIDACIÓN: NO permitir asignar unidad a viajes expirados
        if (viajeExistente && viajeExistente.estado === 'expirado') {
          throw new Error('❌ No se puede asignar unidad a un viaje EXPIRADO. El viaje debe ser reprogramado primero.');
        }
      }

      if (viajeId) {
        // � Usar API route con service_role para bypasear RLS
        const response = await fetchWithAuth('/api/transporte/asignar-unidad', {
          method: 'POST',
          body: JSON.stringify({
            viajeId,
            despachoId: despacho.id,
            choferId: unidad.chofer_id,
            camionId: unidad.camion_id,
            acopladoId: unidad.acoplado_id || null,
            unidadNombre: unidad.nombre,
            pedidoId: despacho.pedido_id
          })
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Error al asignar unidad');
        }
      } else {
        // Crear nuevo viaje (caso raro — normalmente el viaje ya existe)
        const response = await fetchWithAuth('/api/transporte/asignar-unidad', {
          method: 'POST',
          body: JSON.stringify({
            viajeId: null,
            despachoId: despacho.id,
            choferId: unidad.chofer_id,
            camionId: unidad.camion_id,
            acopladoId: unidad.acoplado_id || null,
            unidadNombre: unidad.nombre,
            pedidoId: despacho.pedido_id,
            createNew: true
          })
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Error al crear viaje con unidad');
        }
        console.log('✅ Viaje creado con unidad via API:', result);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error al asignar unidad:', err);
      setError(err.message || 'Error al asignar unidad');
    } finally {
      setAsignando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 bg-gradient-to-r from-gray-900 to-gray-800">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <TruckIcon className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Asignar Unidad Operativa</h2>
                <p className="text-xs text-gray-500 mt-0.5">{despacho.pedido_id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Detalles del viaje */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Origen */}
            <div className="bg-gray-800/50 rounded-lg p-3 border border-green-500/30">
              <div className="flex items-center gap-2 mb-2">
                <MapPinIcon className="h-5 w-5 text-green-400" />
                <span className="text-xs font-medium text-gray-400 uppercase">Origen</span>
              </div>
              <p className="text-white font-bold text-lg">{despacho.origen}</p>
              {(despacho.origen_ciudad || despacho.origen_provincia) && (
                <p className="text-sm text-gray-400 mt-1">
                  {despacho.origen_ciudad}{despacho.origen_ciudad && despacho.origen_provincia ? ', ' : ''}{despacho.origen_provincia}
                </p>
              )}
            </div>

            {/* Destino */}
            <div className="bg-gray-800/50 rounded-lg p-3 border border-orange-500/30">
              <div className="flex items-center gap-2 mb-2">
                <MapPinIcon className="h-5 w-5 text-orange-400" />
                <span className="text-xs font-medium text-gray-400 uppercase">Destino</span>
              </div>
              <p className="text-white font-bold text-lg">{despacho.destino}</p>
              {(despacho.destino_ciudad || despacho.destino_provincia) && (
                <p className="text-sm text-gray-400 mt-1">
                  {despacho.destino_ciudad}{despacho.destino_ciudad && despacho.destino_provincia ? ', ' : ''}{despacho.destino_provincia}
                </p>
              )}
            </div>
          </div>

          {/* Fecha y Distancia */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <ClockIcon className="h-5 w-5 text-cyan-400" />
              <div>
                <p className="text-xs text-cyan-300/70">Fecha de carga</p>
                <p className="text-sm font-bold text-cyan-400">
                  {new Date(despacho.scheduled_local_date + 'T00:00:00').toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })} - {despacho.scheduled_local_time}
                </p>
              </div>
            </div>

            {distanciaViaje && (
              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                <MapPinIcon className="h-5 w-5 text-indigo-400" />
                <div>
                  <p className="text-xs text-indigo-300/70">Distancia estimada</p>
                  <p className="text-sm font-bold text-indigo-400">
                    {distanciaViaje.toFixed(0)} km
                  </p>

          {/* Mapa de la ruta */}
          {origenCoords && destinoCoords && (
            <div className="mt-4">
              <RouteMap
                origin={{
                  lat: origenCoords.lat,
                  lng: origenCoords.lng,
                  label: despacho.origen
                }}
                destination={{
                  lat: destinoCoords.lat,
                  lng: destinoCoords.lng,
                  label: despacho.destino
                }}
                height="250px"
                showRoute={true}
              />
            </div>
          )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                <p className="mt-4 text-gray-400">Calculando asignaciones óptimas...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          ) : unidades.length === 0 ? (
            <div className="text-center py-12">
              <TruckIcon className="mx-auto h-16 w-16 text-gray-600" />
              <p className="mt-4 text-gray-400">No hay unidades disponibles</p>
              <p className="mt-2 text-sm text-gray-500">
                Crea unidades operativas en Flota {'>'} Unidades Operativas
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {unidades.map((unidad) => (
                <div
                  key={unidad.id}
                  onClick={() => !unidad.necesita_descanso_obligatorio && setSelectedUnidad(unidad.id)}
                  className={`relative border rounded-lg p-3 transition-all cursor-pointer ${
                    unidad.necesita_descanso_obligatorio
                      ? 'border-gray-700 bg-gray-800/30 opacity-50 cursor-not-allowed'
                      : selectedUnidad === unidad.id
                      ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/50'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  {/* Top row: Name + Score badge */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {selectedUnidad === unidad.id && (
                        <CheckCircleIcon className="h-5 w-5 text-indigo-400 flex-shrink-0" />
                      )}
                      <h3 className="text-sm font-bold text-white truncate">{unidad.nombre}</h3>
                      {unidad.codigo && (
                        <span className="text-[10px] text-gray-500 font-mono flex-shrink-0">{unidad.codigo}</span>
                      )}
                    </div>
                    {unidad.necesita_descanso_obligatorio ? (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-500/20 text-red-400 flex-shrink-0">
                        🛑 DESCANSO
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded flex-shrink-0 ${
                          unidad.categoria === 'ÓPTIMA'
                            ? 'bg-green-500/20 text-green-400'
                            : unidad.categoria === 'BUENA'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-orange-500/20 text-orange-400'
                        }`}
                      >
                        {Array.from({ length: unidad.estrellas || 0 }).map((_, i) => '⭐').join('')} {unidad.categoria}
                      </span>
                    )}
                  </div>

                  {/* Compact info grid */}
                  <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-xs">
                    <div>
                      <span className="text-gray-500">👤</span>{' '}
                      <span className="text-gray-300">{unidad.chofer_nombre} {unidad.chofer_apellido?.charAt(0)}.</span>
                    </div>
                    <div>
                      <span className="text-gray-500">🚛</span>{' '}
                      <span className="text-gray-300 font-mono">{unidad.camion_patente}</span>
                    </div>
                    <div>
                      <span className={`font-medium ${
                        unidad.horas_conducidas_hoy >= 8 ? 'text-red-400' :
                        unidad.horas_conducidas_hoy >= 6 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        ⏱️ {unidad.horas_conducidas_hoy.toFixed(1)}h/9h
                      </span>
                    </div>
                    {unidad.acoplado_patente && (
                      <div>
                        <span className="text-gray-500">🔗</span>{' '}
                        <span className="text-gray-300 font-mono">{unidad.acoplado_patente}</span>
                      </div>
                    )}
                    {unidad.distancia_km !== undefined && unidad.distancia_km > 0 && (
                      <div>
                        <span className="text-gray-500">📍</span>{' '}
                        <span className="text-indigo-300">{unidad.distancia_km.toFixed(0)} km</span>
                      </div>
                    )}
                  </div>

                  {/* Doc status compact */}
                  {(() => {
                    const choferDoc = docStatusMap[`chofer:${unidad.chofer_id}`];
                    const camionDoc = docStatusMap[`camion:${unidad.camion_id}`];
                    const acopladoDoc = unidad.acoplado_id ? docStatusMap[`acoplado:${unidad.acoplado_id}`] : null;
                    if (!choferDoc && !camionDoc && !acopladoDoc) return null;
                    const anyIssue = [choferDoc, camionDoc, acopladoDoc].some(d => d && (d.estado === 'danger' || d.estado === 'warning'));
                    return (
                      <div className={`mt-2 pt-2 border-t border-gray-700/50 flex items-center gap-1 text-[10px] ${anyIssue ? 'text-yellow-400' : 'text-green-400'}`}>
                        <DocumentCheckIcon className="h-3 w-3" />
                        {anyIssue ? '⚠️ Docs con observaciones' : '✅ Docs OK'}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}

          {/* Info normativa */}
          <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ClockIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-1">Algoritmo de Asignación Inteligente</p>
                <p className="text-blue-200/80">
                  • <strong>Distancia:</strong> Menor distancia desde última ubicación (peso 40%)<br />
                  • <strong>Disponibilidad:</strong> Menos horas conducidas hoy (peso 30%)<br />
                  • <strong>Normativa:</strong> Sin descanso obligatorio pendiente (peso 30%)<br />
                  • Las unidades con descanso obligatorio no pueden ser asignadas
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex items-center justify-between bg-gray-900/50">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg font-medium text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleAsignar}
            disabled={!selectedUnidad || asignando}
            className="px-6 py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {asignando ? 'Asignando...' : 'Asignar Unidad'}
          </button>
        </div>
      </div>
    </div>
  );
}
