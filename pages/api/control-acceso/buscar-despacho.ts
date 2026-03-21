import { withAuth, type AuthContext } from '@/lib/middleware/withAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * POST /api/control-acceso/buscar-despacho
 * 
 * Server-side despacho lookup for control de acceso scanning.
 * Uses supabaseAdmin to bypass RLS — the plant receiving a shipment
 * needs to see despachos that were created by OTHER empresas.
 * 
 * Authorization: validates that the despacho's destino belongs to the
 * scanner's empresa (they can only scan shipments arriving at their plant).
 */
async function handler(req: NextApiRequest, res: NextApiResponse, auth: AuthContext) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { codigo } = req.body || {};
  if (!codigo || typeof codigo !== 'string') {
    return res.status(400).json({ error: 'codigo requerido' });
  }

  const codigoBusqueda = codigo.trim().replace(/^(QR-|DSP-)/, '');
  const empresaId = auth.empresaId;

  if (!empresaId) {
    return res.status(400).json({ error: 'Usuario sin empresa asociada' });
  }

  // 1. Find despacho by pedido_id (using admin to bypass RLS)
  const { data: despacho, error: despachoError } = await supabaseAdmin
    .from('despachos')
    .select('id, pedido_id, origen, destino, origen_id, destino_id, created_by, estado, empresa_id, transport_id')
    .ilike('pedido_id', `%${codigoBusqueda}%`)
    .maybeSingle();

  if (despachoError) {
    return res.status(500).json({ error: despachoError.message });
  }

  if (!despacho) {
    return res.status(404).json({ error: 'Despacho no encontrado' });
  }

  // 2. Verify the scanner's empresa is related to this despacho
  //    (origen, destino, or created by someone in the empresa)
  const ubicacionIds = [despacho.origen_id, despacho.destino_id].filter(Boolean);

  // Get empresa's CUIT for ubicacion matching
  const { data: empresa } = await supabaseAdmin
    .from('empresas')
    .select('cuit')
    .eq('id', empresaId)
    .single();

  const cuit = empresa?.cuit;
  const filtro = cuit
    ? `empresa_id.eq.${empresaId},cuit.eq.${cuit}`
    : `empresa_id.eq.${empresaId}`;

  let esOrigen = false;
  let esDestino = false;

  if (ubicacionIds.length > 0) {
    const { data: misUbics } = await supabaseAdmin
      .from('ubicaciones')
      .select('id')
      .in('id', ubicacionIds)
      .or(filtro);

    const misUbicIds = new Set((misUbics || []).map((u: any) => u.id));
    esOrigen = misUbicIds.has(despacho.origen_id);
    esDestino = misUbicIds.has(despacho.destino_id);
  }

  // Fallback: check if user's empresa created the despacho
  const esCreador = despacho.empresa_id === empresaId;
  // Also check transport
  const esTransporte = despacho.transport_id === empresaId;

  if (!esOrigen && !esDestino && !esCreador && !esTransporte) {
    // Check viaje-level transport assignment
    const { data: viaje } = await supabaseAdmin
      .from('viajes_despacho')
      .select('id_transporte')
      .eq('despacho_id', despacho.id)
      .limit(1)
      .maybeSingle();

    if (!viaje || viaje.id_transporte !== empresaId) {
      return res.status(403).json({ error: 'Este despacho no pertenece a su empresa' });
    }
  }

  // 3. Get viaje data
  const { data: viajesData } = await supabaseAdmin
    .from('viajes_despacho')
    .select('*')
    .eq('despacho_id', despacho.id)
    .limit(1);

  if (!viajesData || viajesData.length === 0) {
    return res.status(404).json({ error: `No hay viajes asignados para el despacho ${despacho.pedido_id}` });
  }

  const viaje = viajesData[0];

  // 4. Get ubicaciones, chofer, camion in parallel
  const [ubicacionesResult, choferResult, camionResult] = await Promise.all([
    ubicacionIds.length > 0
      ? supabaseAdmin.from('ubicaciones').select('id, nombre, tipo').in('id', ubicacionIds)
      : Promise.resolve({ data: [] }),
    viaje.chofer_id
      ? supabaseAdmin.from('choferes').select('nombre, apellido, dni, telefono').eq('id', viaje.chofer_id).maybeSingle()
      : Promise.resolve({ data: null }),
    viaje.camion_id
      ? supabaseAdmin.from('camiones').select('patente, marca, modelo, anio').eq('id', viaje.camion_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const origenUbicacion = (ubicacionesResult.data || []).find((u: any) => u.id === despacho.origen_id);
  const destinoUbicacion = (ubicacionesResult.data || []).find((u: any) => u.id === despacho.destino_id);

  return res.status(200).json({
    despacho: {
      id: despacho.id,
      pedido_id: despacho.pedido_id,
      origen: despacho.origen,
      destino: despacho.destino,
      estado: despacho.estado,
    },
    viaje: {
      id: viaje.id,
      numero_viaje: viaje.numero_viaje,
      estado: viaje.estado,
      estado_unidad: viaje.estado_unidad,
      chofer_id: viaje.chofer_id,
      camion_id: viaje.camion_id,
      acoplado_id: viaje.acoplado_id,
    },
    origen_nombre: origenUbicacion?.nombre || 'Origen desconocido',
    destino_nombre: destinoUbicacion?.nombre || 'Destino desconocido',
    esOrigen,
    esDestino,
    chofer: choferResult.data || null,
    camion: camionResult.data ? {
      ...camionResult.data,
      año: camionResult.data.anio,
    } : null,
  });
}

export default withAuth(handler, {
  roles: ['admin_nodexia', 'coordinador', 'coordinador_integral', 'control_acceso', 'supervisor'],
});
