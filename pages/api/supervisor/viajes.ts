// pages/api/supervisor/viajes.ts
// API Route para obtener viajes relevantes al supervisor de carga/descarga
// Bypasea RLS usando supabaseAdmin para resolver destinos cross-empresa
import type { NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/middleware/withAuth';

const ESTADOS_CARGA = ['ingresado_origen', 'llamado_carga', 'cargando', 'cargado'];
const ESTADOS_DESCARGA = ['ingresado_destino', 'llamado_descarga', 'descargando', 'descargado'];
const ESTADOS_SUPERVISOR = [...ESTADOS_CARGA, ...ESTADOS_DESCARGA];

export default withAuth(async (req, res, { empresaId }) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (!empresaId) {
    return res.status(400).json({ error: 'Empresa no identificada' });
  }

  try {
    // Paso 1: Obtener usuarios de la misma empresa
    const { data: companyUsers } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('user_id')
      .eq('empresa_id', empresaId)
      .eq('activo', true);

    const allUserIds = [...new Set((companyUsers || []).map((u: any) => u.user_id).filter(Boolean))];

    // Paso 2a: Despachos ORIGEN (creados por mi empresa)
    const despachosOriginPromise = allUserIds.length > 0
      ? supabaseAdmin
          .from('despachos')
          .select('id, origen, destino')
          .in('created_by', allUserIds)
      : Promise.resolve({ data: [] as any[], error: null });

    // Paso 2b: Despachos DESTINO (destino es ubicación de mi empresa)
    const { data: myUbicaciones } = await supabaseAdmin
      .from('ubicaciones')
      .select('id')
      .eq('empresa_id', empresaId);

    const ubicacionIds = (myUbicaciones || []).map((u: any) => u.id).filter(Boolean);

    const despachosDestinoPromise = ubicacionIds.length > 0
      ? supabaseAdmin
          .from('despachos')
          .select('id, origen, destino')
          .in('destino_id', ubicacionIds)
      : Promise.resolve({ data: [] as any[], error: null });

    const [despOrigen, despDestino] = await Promise.all([despachosOriginPromise, despachosDestinoPromise]);

    // Merge sin duplicados
    const allDespachos = [...(despOrigen.data || []), ...(despDestino.data || [])];
    const despachosMap = new Map(allDespachos.map((d: any) => [d.id, d]));
    const despachoIds = [...despachosMap.keys()];

    if (despachoIds.length === 0) {
      return res.status(200).json({ viajes: [] });
    }

    // Paso 3: Viajes en estados relevantes
    const { data: viajes, error: viajesError } = await supabaseAdmin
      .from('viajes_despacho')
      .select('id, numero_viaje, estado, chofer_id, camion_id, acoplado_id, despacho_id')
      .in('despacho_id', despachoIds)
      .in('estado', ESTADOS_SUPERVISOR)
      .order('created_at', { ascending: true });

    if (viajesError) {
      return res.status(500).json({ error: 'Error obteniendo viajes', details: viajesError.message });
    }

    const viajesFiltrados = viajes || [];

    // Paso 4: Traer choferes, camiones, acoplados
    const choferIds = [...new Set(viajesFiltrados.map((v: any) => v.chofer_id).filter(Boolean))];
    const camionIds = [...new Set(viajesFiltrados.map((v: any) => v.camion_id).filter(Boolean))];
    const acopladoIds = [...new Set(viajesFiltrados.map((v: any) => v.acoplado_id).filter(Boolean))];

    const [choferesRes, camionesRes, acopladosRes] = await Promise.all([
      choferIds.length > 0
        ? supabaseAdmin.from('choferes').select('id, nombre, apellido, dni').in('id', choferIds)
        : Promise.resolve({ data: [] }),
      camionIds.length > 0
        ? supabaseAdmin.from('camiones').select('id, patente, marca, modelo').in('id', camionIds)
        : Promise.resolve({ data: [] }),
      acopladoIds.length > 0
        ? supabaseAdmin.from('acoplados').select('id, patente, marca, modelo').in('id', acopladoIds)
        : Promise.resolve({ data: [] }),
    ]);

    const choferesMap: Record<string, any> = {};
    const camionesMap: Record<string, any> = {};
    const acopladosMap: Record<string, any> = {};
    (choferesRes.data || []).forEach((c: any) => { choferesMap[c.id] = c; });
    (camionesRes.data || []).forEach((c: any) => { camionesMap[c.id] = c; });
    (acopladosRes.data || []).forEach((a: any) => { acopladosMap[a.id] = a; });

    // Paso 5: Formatear respuesta
    const formateados = viajesFiltrados.map((v: any) => {
      const despacho = despachosMap.get(v.despacho_id);
      const chofer = choferesMap[v.chofer_id];
      const camion = camionesMap[v.camion_id];
      const acoplado = v.acoplado_id ? acopladosMap[v.acoplado_id] : null;
      const esCarga = ESTADOS_CARGA.includes(v.estado);

      return {
        id: v.id,
        numero_viaje: String(v.numero_viaje),
        estado: v.estado || 'ingresado_origen',
        origen: despacho?.origen || '-',
        destino: despacho?.destino || '-',
        despacho_id: v.despacho_id,
        tipo_operacion: esCarga ? 'carga' : 'descarga',
        chofer_id: v.chofer_id,
        camion_id: v.camion_id,
        acoplado_id: v.acoplado_id,
        chofer: chofer
          ? { nombre: `${chofer.nombre} ${chofer.apellido}`, dni: chofer.dni }
          : { nombre: 'Sin asignar', dni: '-' },
        camion: camion
          ? { patente: camion.patente, marca: `${camion.marca} ${camion.modelo || ''}`.trim() }
          : { patente: 'Sin asignar', marca: '-' },
        acoplado: acoplado
          ? { patente: acoplado.patente, marca: `${acoplado.marca} ${acoplado.modelo || ''}`.trim() }
          : null,
      };
    });

    return res.status(200).json({ viajes: formateados });
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}, { roles: ['admin_nodexia', 'coordinador', 'coordinador_integral', 'supervisor', 'control_acceso'] });
