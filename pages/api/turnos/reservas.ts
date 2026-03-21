import { withAuth } from '@/lib/middleware/withAuth';
import { createUserSupabaseClient } from '@/lib/supabaseServerClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function isTransporte(tipoEmpresa: string | null) {
  return String(tipoEmpresa || '').toLowerCase() === 'transporte';
}

function isPlanta(tipoEmpresa: string | null) {
  return String(tipoEmpresa || '').toLowerCase() === 'planta';
}

const RESERVE_ROLES = ['coordinador', 'coordinador_integral', 'supervisor', 'admin_nodexia'];

export default withAuth(async (req, res, authCtx) => {
  const supabase = createUserSupabaseClient(authCtx.token);

  if (req.method === 'GET') {
    const fecha = req.query.fecha as string | undefined;

    let query = supabaseAdmin
      .from('turnos_reservados')
      .select('*, despachos(pedido_id), empresas!turnos_reservados_empresa_transporte_id_fkey(nombre)')
      .neq('estado', 'cancelado')
      .order('fecha', { ascending: true })
      .order('hora_inicio', { ascending: true })
      .limit(200);

    if (fecha) {
      query = query.eq('fecha', fecha);
    }

    if (isTransporte(authCtx.tipoEmpresa)) {
      query = query.eq('empresa_transporte_id', authCtx.empresaId || '');
    } else if (isPlanta(authCtx.tipoEmpresa)) {
      const { data: ventanas, error: ventanasError } = await supabaseAdmin
        .from('ventanas_recepcion')
        .select('id')
        .eq('empresa_planta_id', authCtx.empresaId || '');

      if (ventanasError) {
        return res.status(500).json({ error: ventanasError.message });
      }

      const ventanaIds = (ventanas || []).map((v: any) => v.id);
      if (ventanaIds.length === 0) {
        return res.status(200).json({ data: [] });
      }

      query = query.in('ventana_id', ventanaIds);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const flattened = (data || []).map((r: any) => ({
      ...r,
      despacho_pedido_id: r.despachos?.pedido_id || null,
      empresa_origen: r.empresas?.nombre || null,
      despachos: undefined,
      empresas: undefined,
    }));

    return res.status(200).json({ data: flattened });
  }

  if (req.method === 'POST') {
    const canReserve = isTransporte(authCtx.tipoEmpresa)
      || (!!authCtx.rolInterno && RESERVE_ROLES.includes(authCtx.rolInterno));
    if (!canReserve) {
      return res.status(403).json({ error: 'No tiene permisos para reservar turnos' });
    }

    const {
      ventana_id,
      fecha,
      slot_hora_inicio,
      slot_hora_fin,
      despacho_id,
      patente_camion,
      chofer_nombre,
      observaciones,
      empresa_transporte_id,
    } = req.body || {};

    if (!ventana_id || !fecha) {
      return res.status(400).json({
        error: 'Datos requeridos faltantes',
        required: ['ventana_id', 'fecha'],
      });
    }

    const { data: ventana, error: ventanaError } = await supabase
      .from('ventanas_recepcion')
      .select('id, hora_inicio, hora_fin, capacidad, duracion_turno_minutos, activa')
      .eq('id', ventana_id)
      .maybeSingle();

    if (ventanaError || !ventana) {
      return res.status(404).json({ error: 'Ventana no encontrada' });
    }

    if (!ventana.activa) {
      return res.status(400).json({ error: 'La ventana esta inactiva' });
    }

    // Determine slot hours: use explicit slot if provided, fallback to full ventana range
    const slotStart = slot_hora_inicio || ventana.hora_inicio;
    const slotEnd = slot_hora_fin || ventana.hora_fin;

    // Validate slot is within ventana range
    if (slotStart < ventana.hora_inicio.slice(0, 5) || slotEnd > ventana.hora_fin.slice(0, 5)) {
      return res.status(400).json({ error: 'El slot no esta dentro del rango de la ventana' });
    }

    // Check capacity for this specific slot (not whole ventana)
    let capQuery = supabase
      .from('turnos_reservados')
      .select('id, estado')
      .eq('ventana_id', ventana_id)
      .eq('fecha', fecha);

    if (slot_hora_inicio) {
      // Slot-level capacity check
      capQuery = capQuery.eq('hora_inicio', slotStart + ':00');
    }

    const { data: existentes, error: capError } = await capQuery;

    if (capError) {
      return res.status(500).json({ error: capError.message });
    }

    const ocupados = (existentes || []).filter((t: any) => t.estado !== 'cancelado').length;
    if (ocupados >= (ventana.capacidad || 0)) {
      return res.status(409).json({
        error: 'No hay cupo disponible para el turno seleccionado',
        capacidad: ventana.capacidad,
        ocupados,
      });
    }

    const targetTransporteId = empresa_transporte_id || authCtx.empresaId;

    if (!targetTransporteId) {
      return res.status(400).json({ error: 'empresa_transporte_id no disponible' });
    }

    // Use admin client for insert to avoid PostgREST RLS cache issues
    // with the turno_contadores trigger. All authorization is already
    // validated above (canReserve, capacity, ventana active, etc.)
    const { data, error } = await supabaseAdmin
      .from('turnos_reservados')
      .insert({
        ventana_id,
        empresa_transporte_id: targetTransporteId,
        despacho_id: despacho_id || null,
        fecha,
        hora_inicio: slotStart.length === 5 ? slotStart + ':00' : slotStart,
        hora_fin: slotEnd.length === 5 ? slotEnd + ':00' : slotEnd,
        estado: 'reservado',
        patente_camion: patente_camion || null,
        chofer_nombre: chofer_nombre || null,
        observaciones: observaciones || null,
        reservado_por: authCtx.userId,
      })
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ data });
  }

  if (req.method === 'PATCH') {
    const { id, estado, observaciones, despacho_id } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: 'id requerido' });
    }

    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (estado !== undefined) payload.estado = estado;
    if (observaciones !== undefined) payload.observaciones = observaciones;
    if (despacho_id !== undefined) payload.despacho_id = despacho_id;

    const { data, error } = await supabaseAdmin
      .from('turnos_reservados')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data });
  }

  return res.status(405).json({ error: 'Metodo no permitido' });
}, { roles: ['admin_nodexia', 'coordinador', 'coordinador_integral', 'control_acceso', 'supervisor', 'administrativo', 'gerente'] });
