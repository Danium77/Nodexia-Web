import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useUserRole } from '../../lib/contexts/UserRoleContext';

interface ViajeExpirado {
  viaje_id: string;
  pedido_id: string;
  origen: string;
  destino: string;
  fecha_programada: string;
  transporte_nombre: string;
  chofer_nombre: string;
  camion_patente: string;
  razon_expiracion: string;
  fecha_expiracion: string;
  horas_despues_programado: number;
  era_urgente: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void; // 🔄 Callback para recargar desde afuera
}

export default function ViajesExpiradosModal({ isOpen, onClose, onRefresh }: Props) {
  const { user } = useUserRole();
  const [viajes, setViajes] = useState<ViajeExpirado[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState<'todos' | 'hoy' | 'semana'>('semana');
  const [refreshKey, setRefreshKey] = useState(0); // 🔄 Para forzar recarga

  useEffect(() => {
    if (isOpen && user) {
      loadViajes();
    }
  }, [isOpen, filtro, user, refreshKey]); // 🔄 Agregado refreshKey

  const loadViajes = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log('🔍 Cargando viajes expirados para userId:', user.id);
      
      // 🔒 FILTRO POR EMPRESA: Obtener empresa del usuario (mismo patrón que planificación.tsx)
      const { data: usuarioEmpresa, error: empresaError } = await supabase
        .from('usuarios_empresa')
        .select(`
          empresa_id,
          empresa:empresas(
            id,
            nombre,
            cuit,
            tipo_empresa
          )
        `)
        .eq('user_id', user.id)
        .eq('activo', true)
        .maybeSingle(); // 🔥 maybeSingle para no fallar si no hay registro

      if (empresaError) {
        console.error('❌ Error al obtener empresa del usuario:', empresaError);
      }

      const empresaActual = usuarioEmpresa?.empresa as any;
      const empresaId = usuarioEmpresa?.empresa_id;
      const tipoEmpresa = empresaActual?.tipo_empresa;
      const cuitEmpresa = empresaActual?.cuit;
      
      console.log('🔍 Filtrando viajes expirados para:', {
        empresaId: empresaId || 'N/A (sin empresa asignada - mostrará todos los viajes del usuario)',
        empresaNombre: empresaActual?.nombre || 'N/A',
        tipoEmpresa: tipoEmpresa || 'N/A',
        cuitEmpresa: cuitEmpresa || 'N/A',
        userId: user.id,
        tieneEmpresa: !!empresaId
      });
      
      // 🔒 Consultar viajes expirados SIN relaciones (Dictionary Pattern)
      const { data: viajesData, error } = await supabase
        .from('viajes_despacho')
        .select(`
          id,
          numero_viaje,
          estado_carga,
          estado_unidad,
          chofer_id,
          camion_id,
          transport_id,
          updated_at,
          despacho_id
        `)
        .eq('estado_carga', 'expirado')
        .order('updated_at', { ascending: false })
        .limit(200); // 🔥 Aumentado límite para capturar más recepciones

      if (error) {
        console.error('Error al cargar viajes expirados:', error);
        throw error;
      }

      console.log('📦 Total viajes expirados encontrados (ANTES de filtrar):', viajesData?.length || 0);
      
      // 🔍 DEBUG: Mostrar algunos viajes para verificar
      if (viajesData && viajesData.length > 0) {
        console.log('🔍 Primeros 3 viajes expirados:', viajesData.slice(0, 3).map(v => ({
          id: v.id,
          numero_viaje: v.numero_viaje,
          despacho_id: v.despacho_id,
          transport_id: v.transport_id
        })));
      }
      
      if (!viajesData || viajesData.length === 0) {
        setViajes([]);
        setLoading(false);
        return;
      }

      // 📋 Obtener despachos relacionados (incluir destino_id para recepciones)
      const despachoIds = [...new Set(viajesData.map(v => v.despacho_id))];
      const { data: despachosData } = await supabase
        .from('despachos')
        .select('id, pedido_id, origen, destino, destino_id, scheduled_at, created_by, transport_id')
        .in('id', despachoIds);
      
      const despachosDict: Record<string, any> = {};
      despachosData?.forEach(d => { despachosDict[d.id] = d; });

      // 🚛 Obtener choferes, camiones y transportes únicos
      const choferIds = [...new Set(viajesData.filter(v => v.chofer_id).map(v => v.chofer_id!))];
      const camionIds = [...new Set(viajesData.filter(v => v.camion_id).map(v => v.camion_id!))];
      const transporteIds = [...new Set(viajesData.filter(v => v.transport_id).map(v => v.transport_id!))];

      const [choferesResult, camionesResult, transportesResult] = await Promise.all([
        choferIds.length > 0 ? supabase.from('choferes').select('id, nombre, apellido').in('id', choferIds) : { data: [] },
        camionIds.length > 0 ? supabase.from('camiones').select('id, patente').in('id', camionIds) : { data: [] },
        transporteIds.length > 0 ? supabase.from('empresas').select('id, nombre').in('id', transporteIds) : { data: [] }
      ]);

      // Crear diccionarios
      const choferesDict: Record<string, any> = {};
      choferesResult.data?.forEach(c => { choferesDict[c.id] = c; });

      const camionesDict: Record<string, any> = {};
      camionesResult.data?.forEach(c => { camionesDict[c.id] = c; });

      const transportesDict: Record<string, any> = {};
      transportesResult.data?.forEach(t => { transportesDict[t.id] = t; });

      // Filtrar por empresa según el tipo:
      // - Planta: ver viajes de despachos creados por usuarios de su empresa
      // - Planta: ver también recepciones (viajes donde destino es de su empresa)
      // - Transporte: ver viajes donde su empresa es el transporte asignado
      
      // Obtener IDs de usuarios de la misma empresa
      const { data: usuariosEmpresa } = await supabase
        .from('usuarios_empresa')
        .select('user_id')
        .eq('empresa_id', empresaId);
      
      const userIdsEmpresa = usuariosEmpresa?.map(u => u.user_id) || [];
      
      // 🔒 RECEPCIONES: Obtener ubicaciones de la empresa para filtrar destinos
      let ubicacionIds: string[] = [];
      let nombresUbicaciones: string[] = [];
      
      if (cuitEmpresa) {
        const { data: ubicaciones } = await supabase
          .from('ubicaciones')
          .select('id, nombre')
          .eq('cuit', cuitEmpresa)
          .eq('activo', true);
        
        if (ubicaciones && ubicaciones.length > 0) {
          ubicacionIds = ubicaciones.map(u => u.id);
          nombresUbicaciones = ubicaciones.map(u => u.nombre);
          console.log('📍 Ubicaciones de la empresa (para recepciones):', {
            ids: ubicacionIds,
            nombres: nombresUbicaciones
          });
        }
      }
      
      const viajesFiltrados = (viajesData || []).filter(v => {
        const despacho = despachosDict[v.despacho_id];
        if (!despacho) return false;
        
        // Si NO hay empresa, mostrar viajes creados por el usuario
        if (!empresaId) {
          return despacho.created_by === user.id;
        }
        
        // Si es transporte asignado, mostrar
        if (v.transport_id === empresaId) return true;
        
        // Si el despacho fue creado por alguien de la misma empresa, mostrar (DESPACHOS)
        if (despacho.created_by && userIdsEmpresa.includes(despacho.created_by)) return true;
        
        // 🔄 RECEPCIONES: Verificar si es una recepción (mismo método que planificación)
        // MÉTODO 1: Por destino_id (ID de ubicación)
        if ((despacho as any).destino_id && ubicacionIds.includes((despacho as any).destino_id)) {
          console.log('✅ Recepción encontrada (por destino_id):', {
            pedido_id: despacho.pedido_id,
            destino: despacho.destino,
            destino_id: (despacho as any).destino_id
          });
          return true;
        }
        
        // MÉTODO 2: Por nombre de destino (fallback)
        const esRecepcionPorNombre = despacho.destino && nombresUbicaciones.some(nombre => 
          despacho.destino?.toLowerCase().includes(nombre.toLowerCase())
        );
        if (esRecepcionPorNombre) {
          console.log('✅ Recepción encontrada (por nombre):', {
            pedido_id: despacho.pedido_id,
            destino: despacho.destino,
            matched: nombresUbicaciones.find(n => despacho.destino?.toLowerCase().includes(n.toLowerCase()))
          });
          return true;
        }
        
        return false;
      });

      console.log('✅ Viajes filtrados por empresa (incluye recepciones):', viajesFiltrados.length);

      // Mapear a formato esperado usando diccionarios
      const viajesFormateados = viajesFiltrados.map(v => {
        const despacho = despachosDict[v.despacho_id];
        const chofer = v.chofer_id ? choferesDict[v.chofer_id] : null;
        const camion = v.camion_id ? camionesDict[v.camion_id] : null;
        const transporte = v.transport_id ? transportesDict[v.transport_id] : null;

        return {
          viaje_id: v.id,
          pedido_id: despacho?.pedido_id || 'N/A',
          origen: despacho?.origen || 'N/A',
          destino: despacho?.destino || 'N/A',
          fecha_programada: despacho?.scheduled_at || '',
          transporte_nombre: transporte?.nombre || 'Sin asignar',
          chofer_nombre: chofer ? `${chofer.nombre} ${chofer.apellido || ''}`.trim() : 'Sin asignar',
          camion_patente: camion?.patente || 'Sin asignar',
          razon_expiracion: !v.chofer_id && !v.camion_id ? 'Sin recursos' : !v.chofer_id ? 'Sin chofer' : 'Sin camión',
          fecha_expiracion: v.updated_at,
          horas_despues_programado: 0,
          era_urgente: false
        };
      });

      // Filtrar por fecha si es necesario
      let viajesConFiltroFecha = viajesFormateados;
      
      if (filtro === 'hoy') {
        const hoy = new Date().toISOString().split('T')[0];
        viajesConFiltroFecha = viajesConFiltroFecha.filter(v => 
          v.fecha_expiracion?.startsWith(hoy)
        );
      } else if (filtro === 'semana') {
        const hace7dias = new Date();
        hace7dias.setDate(hace7dias.getDate() - 7);
        viajesConFiltroFecha = viajesConFiltroFecha.filter(v => 
          new Date(v.fecha_expiracion) >= hace7dias
        );
      }

      setViajes(viajesConFiltroFecha);
    } catch (error) {
      console.error('Error al cargar viajes expirados:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a1628] border border-red-500/30 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900/50 to-red-800/30 p-4 border-b border-red-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-red-400 flex items-center gap-2">
                ⚠️ Viajes Expirados
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Viajes que llegaron a su fecha programada sin recursos asignados
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              ✕
            </button>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 mt-3 items-center">
            <button
              onClick={() => setFiltro('hoy')}
              className={`px-3 py-1 text-xs rounded-lg transition-all ${
                filtro === 'hoy'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setFiltro('semana')}
              className={`px-3 py-1 text-xs rounded-lg transition-all ${
                filtro === 'semana'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Última Semana
            </button>
            <button
              onClick={() => setFiltro('todos')}
              className={`px-3 py-1 text-xs rounded-lg transition-all ${
                filtro === 'todos'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Todos
            </button>
            
            {/* 🔄 Botón de recarga */}
            <button
              onClick={() => setRefreshKey(prev => prev + 1)}
              disabled={loading}
              className="ml-auto px-3 py-1 text-xs rounded-lg transition-all bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              title="Recargar lista"
            >
              <span className={loading ? 'animate-spin' : ''}>🔄</span>
              Actualizar
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
              Cargando viajes expirados...
            </div>
          ) : viajes.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-lg font-semibold">No hay viajes expirados</p>
              <p className="text-sm mt-2">
                {filtro === 'hoy' && 'No se expiraron viajes hoy'}
                {filtro === 'semana' && 'No se expiraron viajes en la última semana'}
                {filtro === 'todos' && 'No hay viajes expirados en el sistema'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {viajes.map((viaje) => (
                <div
                  key={viaje.viaje_id}
                  className="bg-gradient-to-br from-[#1a0f0f] to-[#0f0a0a] border border-red-500/20 rounded-lg p-4 hover:border-red-500/40 transition-all"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Columna 1: Info principal */}
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Pedido</p>
                          <p className="text-sm font-bold text-white">{viaje.pedido_id}</p>
                        </div>
                        {viaje.era_urgente && (
                          <span className="bg-orange-500/20 text-orange-400 text-[9px] px-2 py-0.5 rounded font-semibold">
                            URGENTE
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-xs">
                        <div>
                          <span className="text-gray-500">Origen:</span>
                          <span className="text-cyan-400 ml-2 font-medium">{viaje.origen}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Destino:</span>
                          <span className="text-emerald-400 ml-2 font-medium">{viaje.destino}</span>
                        </div>
                      </div>
                    </div>

                    {/* Columna 2: Fechas y razón */}
                    <div>
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 uppercase">Razón de Expiración</p>
                        <p className="text-sm font-semibold text-red-400">{viaje.razon_expiracion}</p>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div>
                          <span className="text-gray-500">Programado:</span>
                          <span className="text-white ml-2">
                            {new Date(viaje.fecha_programada).toLocaleString('es-AR')}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Expiró:</span>
                          <span className="text-red-400 ml-2">
                            {new Date(viaje.fecha_expiracion).toLocaleString('es-AR')}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Tiempo transcurrido:</span>
                          <span className="text-orange-400 ml-2 font-semibold">
                            {Math.abs(viaje.horas_despues_programado).toFixed(1)} hs
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Columna 3: Recursos asignados */}
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">Recursos al Expirar</p>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-16">Transporte:</span>
                          <span className={viaje.transporte_nombre ? 'text-white' : 'text-gray-600 italic'}>
                            {viaje.transporte_nombre || 'Sin asignar'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-16">Chofer:</span>
                          <span className={viaje.chofer_nombre !== 'Sin asignar' ? 'text-white' : 'text-red-400 font-semibold'}>
                            {viaje.chofer_nombre}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-16">Camión:</span>
                          <span className={viaje.camion_patente ? 'text-white' : 'text-red-400 font-semibold'}>
                            {viaje.camion_patente || 'Sin asignar'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-900/50 p-4 border-t border-gray-700 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Total: <span className="font-bold text-red-400">{viajes.length}</span> viaje{viajes.length !== 1 ? 's' : ''} expirado{viajes.length !== 1 ? 's' : ''}
          </p>
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
