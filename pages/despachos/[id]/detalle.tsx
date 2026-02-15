import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import Header from '../../../components/layout/Header';
import Sidebar from '../../../components/layout/Sidebar';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { ArrowLeftIcon, DocumentTextIcon, TruckIcon, MapPinIcon, ClockIcon, CheckCircleIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface ViajeDetalle {
  id: string;
  numero_viaje: number;
  estado: string;
  chofer?: { nombre: string; apellido: string; telefono: string; dni: string };
  camion?: { patente: string; marca: string; modelo: string };
  acoplado?: { patente: string; marca: string; modelo: string };
  transporte?: { nombre: string; cuit: string };
  observaciones?: string;
}

interface Documento {
  id: string;
  viaje_id: string;
  tipo: string;
  nombre_archivo: string;
  file_url: string;
  fecha_emision: string;
  subido_por: string;
}

interface Timeline {
  id: string;
  estado_anterior: string;
  estado_nuevo: string;
  fecha: string;
  usuario_nombre?: string;
}

export default function DetalleDespacho() {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [despacho, setDespacho] = useState<any>(null);
  const [viajes, setViajes] = useState<ViajeDetalle[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [timeline, setTimeline] = useState<Timeline[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) { router.push('/login'); return; }
      setUser(user);
      const { data } = await supabase.from('usuarios').select('nombre_completo').eq('id', user.id).single();
      setUserName(data?.nombre_completo || user.email?.split('@')[0] || 'Usuario');
    };
    checkUser();
  }, [router]);

  useEffect(() => {
    if (!id || !user) return;
    loadData();
  }, [id, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Despacho
      const { data: desp } = await supabase
        .from('despachos')
        .select('id, pedido_id, origen, destino, estado, scheduled_local_date, scheduled_local_time, prioridad, tipo_carga, observaciones, created_at')
        .eq('id', id)
        .single();
      setDespacho(desp);

      // 2. Viajes con datos completos
      const { data: viajesRaw } = await supabase
        .from('viajes_despacho')
        .select('id, numero_viaje, estado, id_transporte, chofer_id, camion_id, acoplado_id, observaciones')
        .eq('despacho_id', id as string)
        .order('numero_viaje');

      if (viajesRaw && viajesRaw.length > 0) {
        const transporteIds = viajesRaw.filter(v => v.id_transporte).map(v => v.id_transporte);
        const choferIds = viajesRaw.filter(v => v.chofer_id).map(v => v.chofer_id);
        const camionIds = viajesRaw.filter(v => v.camion_id).map(v => v.camion_id);
        const acopladoIds = viajesRaw.filter(v => v.acoplado_id).map(v => v.acoplado_id);

        const [transportes, choferes, camiones, acoplados] = await Promise.all([
          transporteIds.length ? supabase.from('empresas').select('id, nombre, cuit').in('id', transporteIds) : Promise.resolve({ data: [] }),
          choferIds.length ? supabase.from('choferes').select('id, nombre, apellido, telefono, dni').in('id', choferIds) : Promise.resolve({ data: [] }),
          camionIds.length ? supabase.from('camiones').select('id, patente, marca, modelo').in('id', camionIds) : Promise.resolve({ data: [] }),
          acopladoIds.length ? supabase.from('acoplados').select('id, patente, marca, modelo').in('id', acopladoIds) : Promise.resolve({ data: [] }),
        ]);

        const tMap = (transportes.data || []).reduce((a: any, t: any) => ({ ...a, [t.id]: t }), {});
        const chMap = (choferes.data || []).reduce((a: any, c: any) => ({ ...a, [c.id]: c }), {});
        const caMap = (camiones.data || []).reduce((a: any, c: any) => ({ ...a, [c.id]: c }), {});
        const acMap = (acoplados.data || []).reduce((a: any, a2: any) => ({ ...a, [a2.id]: a2 }), {});

        setViajes(viajesRaw.map(v => ({
          ...v,
          transporte: v.id_transporte ? tMap[v.id_transporte] : undefined,
          chofer: v.chofer_id ? chMap[v.chofer_id] : undefined,
          camion: v.camion_id ? caMap[v.camion_id] : undefined,
          acoplado: v.acoplado_id ? acMap[v.acoplado_id] : undefined,
        })));

        // 3. Documentos (remitos, etc.) for all viajes
        const viajeIds = viajesRaw.map(v => v.id);
        const { data: docs } = await supabase
          .from('documentos_viaje_seguro')
          .select('id, viaje_id, tipo, nombre_archivo, file_url, fecha_emision, subido_por')
          .in('viaje_id', viajeIds)
          .order('fecha_emision', { ascending: false });
        setDocumentos(docs || []);
      }

      // 4. Timeline
      const { data: events } = await supabase
        .from('despacho_timeline')
        .select('id, estado_anterior, estado_nuevo, fecha, usuario_nombre')
        .eq('despacho_id', id as string)
        .order('fecha', { ascending: true });
      setTimeline(events || []);
    } catch (err) {
      console.error('Error loading detalle:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const colors: Record<string, string> = {
      completado: 'bg-green-600 text-green-100',
      cancelado: 'bg-red-600 text-red-100',
      pendiente: 'bg-yellow-600 text-yellow-100',
      en_transito_origen: 'bg-purple-600 text-purple-100',
      en_transito_destino: 'bg-purple-600 text-purple-100',
      ingresado_origen: 'bg-cyan-600 text-cyan-100',
      cargando: 'bg-orange-600 text-orange-100',
      cargado: 'bg-indigo-600 text-indigo-100',
      egreso_origen: 'bg-gray-600 text-gray-100',
      ingresado_destino: 'bg-teal-600 text-teal-100',
      descargado: 'bg-lime-600 text-lime-100',
      egreso_destino: 'bg-green-700 text-green-100',
    };
    return colors[estado] || 'bg-slate-600 text-slate-100';
  };

  const getEstadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      pendiente: 'Pendiente',
      transporte_asignado: 'Transporte Asignado',
      camion_asignado: 'Camión Asignado',
      confirmado_chofer: 'Confirmado',
      en_transito_origen: '→ Origen',
      ingresado_origen: 'En Planta Origen',
      llamado_carga: 'Llamado a Carga',
      cargando: 'Cargando',
      cargado: 'Cargado',
      egreso_origen: 'Egreso Origen',
      en_transito_destino: '→ Destino',
      ingresado_destino: 'En Planta Destino',
      llamado_descarga: 'Llamado Descarga',
      descargando: 'Descargando',
      descargado: 'Descargado',
      egreso_destino: 'Egreso Destino',
      completado: 'Completado',
      cancelado: 'Cancelado',
    };
    return labels[estado] || estado;
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0e1a2d]">
      <LoadingSpinner size="xl" text="Verificando sesión..." variant="logo" color="primary" fullScreen />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#0e1a2d]">
      <Sidebar userEmail={user.email} userName={userName} />
      <div className="flex-1 flex flex-col">
        <Header userEmail={user.email} userName={userName} pageTitle="Detalle de Despacho" />
        <main className="flex-1 p-6 overflow-auto">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span className="text-sm font-medium">Volver</span>
          </button>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" text="Cargando detalle..." variant="logo" color="primary" />
            </div>
          ) : despacho ? (
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Header del Despacho */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-2">{despacho.pedido_id}</h1>
                    <div className="flex items-center gap-4 text-sm text-gray-300">
                      <span className="flex items-center gap-1">
                        <MapPinIcon className="h-4 w-4 text-emerald-400" />
                        {despacho.origen}
                      </span>
                      <span className="text-gray-500">→</span>
                      <span className="flex items-center gap-1">
                        <MapPinIcon className="h-4 w-4 text-cyan-400" />
                        {despacho.destino}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${getEstadoBadge(despacho.estado)}`}>
                      {getEstadoLabel(despacho.estado)}
                    </span>
                    <span className="text-xs text-gray-400">
                      📅 {despacho.scheduled_local_date} — {despacho.scheduled_local_time || 'Sin hora'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                  <div>
                    <span className="text-gray-400">Prioridad:</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                      despacho.prioridad === 'Urgente' ? 'bg-red-600 text-white' :
                      despacho.prioridad === 'Alta' ? 'bg-orange-600 text-white' :
                      'bg-yellow-600 text-white'
                    }`}>{despacho.prioridad || 'Media'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Tipo de Carga:</span>
                    <span className="ml-2 text-white">{despacho.tipo_carga || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Creado:</span>
                    <span className="ml-2 text-white">{new Date(despacho.created_at).toLocaleDateString('es-AR')}</span>
                  </div>
                </div>
                {despacho.observaciones && (
                  <div className="mt-3 p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-gray-400 text-xs">Observaciones:</span>
                    <p className="text-white text-sm mt-1">{despacho.observaciones}</p>
                  </div>
                )}
              </div>

              {/* Viajes */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                  <TruckIcon className="h-5 w-5" />
                  Viajes ({viajes.length})
                </h2>
                {viajes.map(viaje => (
                  <div key={viaje.id} className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1.5 bg-blue-900 text-blue-200 rounded-lg font-mono text-sm font-bold">
                          Viaje #{viaje.numero_viaje}
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getEstadoBadge(viaje.estado)}`}>
                          {getEstadoLabel(viaje.estado)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {/* Transporte */}
                      <div className="bg-slate-700/40 rounded-lg p-3">
                        <p className="text-gray-400 text-xs mb-1">🚚 Transporte</p>
                        {viaje.transporte ? (
                          <>
                            <p className="text-green-400 font-semibold">{viaje.transporte.nombre}</p>
                            <p className="text-gray-500 text-xs">CUIT: {viaje.transporte.cuit}</p>
                          </>
                        ) : (
                          <p className="text-gray-500">Sin asignar</p>
                        )}
                      </div>

                      {/* Chofer */}
                      <div className="bg-slate-700/40 rounded-lg p-3">
                        <p className="text-gray-400 text-xs mb-1">👤 Chofer</p>
                        {viaje.chofer ? (
                          <>
                            <p className="text-cyan-400 font-semibold">{viaje.chofer.nombre} {viaje.chofer.apellido}</p>
                            <p className="text-gray-500 text-xs">📱 {viaje.chofer.telefono || 'N/A'}</p>
                          </>
                        ) : (
                          <p className="text-gray-500">Sin asignar</p>
                        )}
                      </div>

                      {/* Camión */}
                      <div className="bg-slate-700/40 rounded-lg p-3">
                        <p className="text-gray-400 text-xs mb-1">🚛 Camión</p>
                        {viaje.camion ? (
                          <>
                            <p className="text-yellow-400 font-bold">{viaje.camion.patente}</p>
                            <p className="text-gray-500 text-xs">{viaje.camion.marca} {viaje.camion.modelo}</p>
                          </>
                        ) : (
                          <p className="text-gray-500">Sin asignar</p>
                        )}
                      </div>

                      {/* Acoplado */}
                      <div className="bg-slate-700/40 rounded-lg p-3">
                        <p className="text-gray-400 text-xs mb-1">🔗 Acoplado</p>
                        {viaje.acoplado ? (
                          <>
                            <p className="text-purple-400 font-bold">{viaje.acoplado.patente}</p>
                            <p className="text-gray-500 text-xs">{viaje.acoplado.marca} {viaje.acoplado.modelo}</p>
                          </>
                        ) : (
                          <p className="text-gray-500 italic">Sin acoplado</p>
                        )}
                      </div>
                    </div>

                    {viaje.observaciones && (
                      <p className="text-gray-400 text-xs mt-3">📝 {viaje.observaciones}</p>
                    )}

                    {/* Documentos del viaje */}
                    {documentos.filter(d => d.viaje_id === viaje.id).length > 0 && (
                      <div className="mt-4 border-t border-slate-700 pt-3">
                        <p className="text-gray-400 text-xs font-semibold mb-2 flex items-center gap-1">
                          <DocumentTextIcon className="h-4 w-4" />
                          Comprobantes adjuntos
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {documentos.filter(d => d.viaje_id === viaje.id).map(doc => (
                            <div
                              key={doc.id}
                              onClick={() => setPreviewUrl(doc.file_url)}
                              className="bg-slate-700/50 rounded-lg p-3 hover:bg-slate-600/50 cursor-pointer transition-colors border border-slate-600"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <PhotoIcon className="h-4 w-4 text-cyan-400" />
                                <span className="text-white text-xs font-medium capitalize">{doc.tipo}</span>
                              </div>
                              <p className="text-gray-400 text-[10px] truncate">{doc.nombre_archivo}</p>
                              <p className="text-gray-500 text-[10px]">
                                {new Date(doc.fecha_emision).toLocaleDateString('es-AR')} {new Date(doc.fecha_emision).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Timeline */}
              {timeline.length > 0 && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
                  <h2 className="text-lg font-bold text-cyan-400 flex items-center gap-2 mb-4">
                    <ClockIcon className="h-5 w-5" />
                    Historial de Eventos
                  </h2>
                  <div className="space-y-3">
                    {timeline.map((event, idx) => (
                      <div key={event.id} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${idx === timeline.length - 1 ? 'bg-green-400' : 'bg-cyan-500'}`} />
                          {idx < timeline.length - 1 && <div className="w-0.5 h-8 bg-slate-700" />}
                        </div>
                        <div className="flex-1 pb-3">
                          <div className="flex items-center gap-2 text-sm">
                            <span className={`px-2 py-0.5 rounded text-xs ${getEstadoBadge(event.estado_nuevo)}`}>
                              {getEstadoLabel(event.estado_nuevo)}
                            </span>
                            {event.estado_anterior && (
                              <>
                                <span className="text-gray-500 text-xs">desde</span>
                                <span className="text-gray-400 text-xs">{getEstadoLabel(event.estado_anterior)}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span>{new Date(event.fecha).toLocaleDateString('es-AR')}</span>
                            <span>{new Date(event.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                            {event.usuario_nombre && <span>· {event.usuario_nombre}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sección Facturación (placeholder) */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 border-dashed">
                <h2 className="text-lg font-bold text-gray-500 flex items-center gap-2">
                  📑 Facturación
                </h2>
                <p className="text-gray-500 text-sm mt-2">
                  La factura del transporte se adjuntará aquí cuando esté disponible.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              Despacho no encontrado
            </div>
          )}

          {/* Preview modal */}
          {previewUrl && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
              <div className="bg-slate-800 rounded-xl max-w-3xl max-h-[90vh] overflow-auto p-2 border border-slate-600" onClick={e => e.stopPropagation()}>
                <div className="flex justify-end mb-2">
                  <button onClick={() => setPreviewUrl(null)} className="text-gray-400 hover:text-white text-sm px-2 py-1">✕ Cerrar</button>
                </div>
                <img src={previewUrl} alt="Documento" className="max-w-full max-h-[80vh] object-contain rounded-lg" />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
