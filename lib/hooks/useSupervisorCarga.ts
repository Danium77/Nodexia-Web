/**
 * Hook: useSupervisorCarga
 * Carga viajes relevantes para el supervisor de carga/descarga,
 * provee filtrados por tab, y lógica del scanner QR.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useUserRole } from '../contexts/UserRoleContext';
import type { ViajeParaCarga } from '../../components/SuperAdmin/ViajeAcciones';

// =====================
// Types
// =====================

export interface DocStatus {
  total: number;
  vigentes: number;
  vencidos: number;
  pendientes: number;
}

// Estados que interesan al supervisor: carga en origen + descarga en destino
export const ESTADOS_CARGA = ['ingresado_origen', 'llamado_carga', 'cargando', 'cargado'];
export const ESTADOS_DESCARGA = ['ingresado_destino', 'llamado_descarga', 'descargando', 'descargado'];
export const ESTADOS_SUPERVISOR = [...ESTADOS_CARGA, ...ESTADOS_DESCARGA];

// Labels de estado para UI
export const ESTADO_LABELS: Record<string, string> = {
  ingresado_origen: '🏭 En Planta',
  en_playa_origen: '⏸️ En Playa',
  llamado_carga: '📢 Llamado',
  cargando: '⚙️ Cargando',
  cargado: '📦 Cargado',
  ingresado_destino: '🏭 En Planta',
  llamado_descarga: '📢 Llamado',
  descargando: '⬇️ Descargando',
  descargado: '✅ Descargado',
};

export const ESTADO_COLORS: Record<string, string> = {
  ingresado_origen: 'bg-blue-900/30 text-blue-400 border-blue-800',
  en_playa_origen: 'bg-cyan-900/30 text-cyan-400 border-cyan-800',
  llamado_carga: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  cargando: 'bg-orange-900/30 text-orange-400 border-orange-800',
  cargado: 'bg-green-900/30 text-green-400 border-green-800',
  ingresado_destino: 'bg-blue-900/30 text-blue-400 border-blue-800',
  llamado_descarga: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  descargando: 'bg-orange-900/30 text-orange-400 border-orange-800',
  descargado: 'bg-green-900/30 text-green-400 border-green-800',
};

const EMPTY_DOCS: DocStatus = { total: 0, vigentes: 0, vencidos: 0, pendientes: 0 };

// =====================
// Hook principal
// =====================

export default function useSupervisorCarga() {
  const { empresaId, user } = useUserRole();

  const [viajes, setViajes] = useState<ViajeParaCarga[]>([]);
  const [loadingViajes, setLoadingViajes] = useState(false);

  // ─── Cargar viajes relevantes ──────────────────────────────────
  const cargarViajes = useCallback(async () => {
    if (!empresaId) return;

    setLoadingViajes(true);
    try {
      // Paso 1: Obtener usuarios de la misma empresa para filtrar despachos origen
      const { data: companyUsers } = await supabase
        .from('usuarios_empresa')
        .select('user_id')
        .eq('empresa_id', empresaId)
        .eq('activo', true);

      const allUserIds = [...new Set((companyUsers || []).map(u => u.user_id).filter(Boolean))];

      // Paso 2a: Obtener despachos ORIGEN (creados por mi empresa)
      const despachosOriginPromise = allUserIds.length > 0
        ? supabase
            .from('despachos')
            .select('id, origen, destino')
            .in('created_by', allUserIds)
        : Promise.resolve({ data: [], error: null });

      // Paso 2b: Obtener despachos DESTINO (destino es una ubicación de mi empresa)
      const { data: myUbicaciones } = await supabase
        .from('ubicaciones')
        .select('id')
        .eq('empresa_id', empresaId);

      const ubicacionIds = (myUbicaciones || []).map(u => u.id).filter(Boolean);

      const despachosDestinoPromise = ubicacionIds.length > 0
        ? supabase
            .from('despachos')
            .select('id, origen, destino')
            .in('destino_id', ubicacionIds)
        : Promise.resolve({ data: [], error: null });

      const [despOrigen, despDestino] = await Promise.all([despachosOriginPromise, despachosDestinoPromise]);

      if (despOrigen.error) console.error('❌ [supervisor] Error despachos origen:', despOrigen.error);
      if (despDestino.error) console.error('❌ [supervisor] Error despachos destino:', despDestino.error);

      // Merge despachos sin duplicados
      const allDespachos = [...(despOrigen.data || []), ...(despDestino.data || [])];
      const despachosMap = new Map(allDespachos.map(d => [d.id, d]));
      const despachoIds = [...despachosMap.keys()];

      if (despachoIds.length === 0) {
        setViajes([]);
        setLoadingViajes(false);
        return;
      }

      // Paso 3: Obtener viajes en estados relevantes
      const { data, error } = await supabase
        .from('viajes_despacho')
        .select('id, numero_viaje, estado, chofer_id, camion_id, acoplado_id, despacho_id')
        .in('despacho_id', despachoIds)
        .in('estado', ESTADOS_SUPERVISOR)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ [supervisor-carga] Error cargando viajes:', error);
        return;
      }

      const viajesFiltrados = data || [];

      // Traer choferes, camiones y acoplados por ID
      const choferIds = [...new Set(viajesFiltrados.map((v: any) => v.chofer_id).filter(Boolean))];
      const camionIds = [...new Set(viajesFiltrados.map((v: any) => v.camion_id).filter(Boolean))];
      const acopladoIds = [...new Set(viajesFiltrados.map((v: any) => v.acoplado_id).filter(Boolean))];

      const [choferesRes, camionesRes, acopladosRes] = await Promise.all([
        choferIds.length > 0
          ? supabase.from('choferes').select('id, nombre, apellido, dni').in('id', choferIds)
          : Promise.resolve({ data: [] }),
        camionIds.length > 0
          ? supabase.from('camiones').select('id, patente, marca, modelo').in('id', camionIds)
          : Promise.resolve({ data: [] }),
        acopladoIds.length > 0
          ? supabase.from('acoplados').select('id, patente, marca, modelo').in('id', acopladoIds)
          : Promise.resolve({ data: [] }),
      ]);

      const choferesMap: Record<string, any> = {};
      const camionesMap: Record<string, any> = {};
      const acopladosMap: Record<string, any> = {};
      (choferesRes.data || []).forEach((c: any) => { choferesMap[c.id] = c; });
      (camionesRes.data || []).forEach((c: any) => { camionesMap[c.id] = c; });
      (acopladosRes.data || []).forEach((a: any) => { acopladosMap[a.id] = a; });

      // Traer estado de documentación via API server-side
      const allEntidades: { tipo: string; id: string }[] = [
        ...choferIds.map(id => ({ tipo: 'chofer', id })),
        ...camionIds.map(id => ({ tipo: 'camion', id })),
        ...acopladoIds.map(id => ({ tipo: 'acoplado', id })),
      ];

      let docsStatusMap: Record<string, { estado: string; vigentes: number; vencidos: number; por_vencer: number; faltantes: string[] }> = {};
      if (allEntidades.length > 0) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const docRes = await fetch('/api/documentacion/estado-batch', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ entidades: allEntidades }),
            });
            if (docRes.ok) {
              const docJson = await docRes.json();
              docsStatusMap = docJson.data || {};
            }
          }
        } catch (err) {
          console.warn('⚠️ [supervisor-carga] Error cargando docs:', err);
        }
      }

      const getDocStatus = (tipo: string, id: string): DocStatus => {
        const key = `${tipo}:${id}`;
        const s = docsStatusMap[key];
        if (!s) return { total: 0, vigentes: 0, vencidos: 0, pendientes: 0 };
        return {
          total: s.vigentes + s.vencidos + s.por_vencer,
          vigentes: s.vigentes,
          vencidos: s.vencidos,
          pendientes: s.por_vencer,
        };
      };

      const formateados: ViajeParaCarga[] = viajesFiltrados.map((v: any) => {
        const despacho = despachosMap.get(v.despacho_id);
        const chofer = choferesMap[v.chofer_id];
        const camion = camionesMap[v.camion_id];
        const acoplado = v.acoplado_id ? acopladosMap[v.acoplado_id] : null;

        const esCarga = ESTADOS_CARGA.includes(v.estado);
        const tipo_operacion = esCarga ? 'carga' as const : 'descarga' as const;

        return {
          id: v.id,
          numero_viaje: String(v.numero_viaje),
          estado: v.estado || 'ingresado_origen',
          estado_carga: 'pendiente',
          origen: despacho?.origen || '-',
          destino: despacho?.destino || '-',
          chofer: chofer
            ? { nombre: `${chofer.nombre} ${chofer.apellido}`, dni: chofer.dni }
            : { nombre: 'Sin asignar', dni: '-' },
          camion: camion
            ? { patente: camion.patente, marca: `${camion.marca} ${camion.modelo || ''}`.trim() }
            : { patente: 'Sin asignar', marca: '-' },
          acoplado: acoplado
            ? { patente: acoplado.patente, marca: `${acoplado.marca} ${acoplado.modelo || ''}`.trim() }
            : null,
          tipo_operacion,
          docs_chofer: v.chofer_id ? getDocStatus('chofer', v.chofer_id) : EMPTY_DOCS,
          docs_camion: v.camion_id ? getDocStatus('camion', v.camion_id) : EMPTY_DOCS,
          docs_acoplado: v.acoplado_id ? getDocStatus('acoplado', v.acoplado_id) : null,
        };
      });

      setViajes(formateados);
    } catch (err) {
      console.error('❌ [supervisor-carga] Exception:', err);
    } finally {
      setLoadingViajes(false);
    }
  }, [empresaId]);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    cargarViajes();
    const interval = setInterval(cargarViajes, 30000);
    return () => clearInterval(interval);
  }, [cargarViajes]);

  // ─── Scanner QR ────────────────────────────────────────────────
  const escanearQR = useCallback(async (qrCode: string): Promise<ViajeParaCarga | null> => {
    if (!qrCode.trim()) return null;

    const codigo = qrCode.trim().replace(/^(QR-|DSP-)/, '');

    // Paso 1: Buscar despacho por pedido_id
    const { data: despacho, error: despError } = await supabase
      .from('despachos')
      .select('id, pedido_id, origen, destino')
      .ilike('pedido_id', `%${codigo}%`)
      .maybeSingle();

    if (despError || !despacho) return null;

    // Paso 2: Buscar viaje del despacho
    const { data: viajesData, error: viajeError } = await supabase
      .from('viajes_despacho')
      .select('id, numero_viaje, estado, chofer_id, camion_id, estado_carga_viaje (estado_carga)')
      .eq('despacho_id', despacho.id)
      .limit(1);

    if (viajeError || !viajesData || viajesData.length === 0) return null;

    const viajeData = viajesData[0];
    const carga = Array.isArray(viajeData.estado_carga_viaje) ? viajeData.estado_carga_viaje[0] : viajeData.estado_carga_viaje;

    // Paso 3: Traer chofer y camión
    let choferNombre = 'Sin asignar';
    let choferDni = '-';
    let camionPatente = 'Sin asignar';
    let camionMarca = '-';

    if (viajeData.chofer_id) {
      const { data: choferData } = await supabase
        .from('choferes')
        .select('nombre, apellido, dni')
        .eq('id', viajeData.chofer_id)
        .maybeSingle();
      if (choferData) {
        choferNombre = `${choferData.nombre} ${choferData.apellido || ''}`.trim();
        choferDni = choferData.dni || '-';
      }
    }

    if (viajeData.camion_id) {
      const { data: camionData } = await supabase
        .from('camiones')
        .select('patente, marca, modelo')
        .eq('id', viajeData.camion_id)
        .maybeSingle();
      if (camionData) {
        camionPatente = camionData.patente;
        camionMarca = `${camionData.marca} ${camionData.modelo || ''}`.trim();
      }
    }

    return {
      id: viajeData.id,
      numero_viaje: String(viajeData.numero_viaje),
      estado: viajeData.estado || 'desconocido',
      estado_carga: (carga as any)?.estado_carga || 'pendiente',
      origen: despacho.origen || '-',
      destino: despacho.destino || '-',
      chofer: { nombre: choferNombre, dni: choferDni },
      camion: { patente: camionPatente, marca: camionMarca },
      acoplado: null,
      tipo_operacion: ESTADOS_CARGA.includes(viajeData.estado) ? 'carga' : 'descarga',
      docs_chofer: EMPTY_DOCS,
      docs_camion: EMPTY_DOCS,
      docs_acoplado: null,
    };
  }, []);

  // ─── Filtros por Tab (memoized) ────────────────────────────────
  const viajesCargas = useMemo(
    () => viajes.filter(v => ESTADOS_CARGA.includes(v.estado) && v.estado !== 'cargado'),
    [viajes]
  );

  const viajesDescargas = useMemo(
    () => viajes.filter(v => ESTADOS_DESCARGA.includes(v.estado) && v.estado !== 'descargado'),
    [viajes]
  );

  const viajesCompletados = useMemo(
    () => viajes.filter(v => v.estado === 'cargado' || v.estado === 'descargado'),
    [viajes]
  );

  return {
    // Data
    viajes,
    viajesCargas,
    viajesDescargas,
    viajesCompletados,
    loadingViajes,
    // Actions
    cargarViajes,
    escanearQR,
    // Context (forwarded)
    empresaId,
    user,
  };
}
