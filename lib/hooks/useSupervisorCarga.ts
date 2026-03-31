/**
 * Hook: useSupervisorCarga
 * Carga viajes relevantes para el supervisor de carga/descarga,
 * provee filtrados por tab, y lógica del scanner QR.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserRole } from '@/lib/contexts/UserRoleContext';
import type { ViajeParaCarga } from '@/components/SuperAdmin/ViajeAcciones';

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

  // ─── Cargar viajes relevantes (via API server-side para bypass RLS) ───
  const cargarViajes = useCallback(async () => {
    if (!empresaId) return;

    setLoadingViajes(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ [supervisor-carga] No session');
        return;
      }

      const res = await fetch('/api/supervisor/viajes', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('❌ [supervisor-carga] API error:', err.error);
        return;
      }

      const json = await res.json();
      const viajesFromApi = json.viajes || [];

      // Traer estado de documentación via API server-side
      const allEntidades: { tipo: string; id: string }[] = [];
      const choferIds = new Set<string>();
      const camionIds = new Set<string>();
      const acopladoIds = new Set<string>();

      viajesFromApi.forEach((v: any) => {
        if (v.chofer_id) choferIds.add(v.chofer_id);
        if (v.camion_id) camionIds.add(v.camion_id);
        if (v.acoplado_id) acopladoIds.add(v.acoplado_id);
      });

      choferIds.forEach(id => allEntidades.push({ tipo: 'chofer', id }));
      camionIds.forEach(id => allEntidades.push({ tipo: 'camion', id }));
      acopladoIds.forEach(id => allEntidades.push({ tipo: 'acoplado', id }));

      let docsStatusMap: Record<string, { estado: string; vigentes: number; vencidos: number; por_vencer: number; faltantes: string[] }> = {};
      if (allEntidades.length > 0) {
        try {
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

      const formateados: ViajeParaCarga[] = viajesFromApi.map((v: any) => ({
        id: v.id,
        numero_viaje: v.numero_viaje,
        estado: v.estado,
        estado_carga: 'pendiente',
        origen: v.origen,
        destino: v.destino,
        tipo_operacion: v.tipo_operacion as 'carga' | 'descarga',
        chofer: v.chofer,
        camion: v.camion,
        acoplado: v.acoplado,
        docs_chofer: v.chofer_id ? getDocStatus('chofer', v.chofer_id) : EMPTY_DOCS,
        docs_camion: v.camion_id ? getDocStatus('camion', v.camion_id) : EMPTY_DOCS,
        docs_acoplado: v.acoplado_id ? getDocStatus('acoplado', v.acoplado_id) : null,
      }));

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
