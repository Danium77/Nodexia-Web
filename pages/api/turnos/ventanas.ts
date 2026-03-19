import { withAuth } from '@/lib/middleware/withAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const WRITE_ROLES = ['coordinador', 'coordinador_integral', 'control_acceso', 'supervisor', 'admin_nodexia'];

function canWrite(rolInterno: string | null) {
  return !!rolInterno && WRITE_ROLES.includes(rolInterno);
}

/** Generate time slots from a ventana based on duracion_turno_minutos */
function generateSlots(ventana: any) {
  const slots: Array<{ hora_inicio: string; hora_fin: string }> = [];
  const [startH, startM] = ventana.hora_inicio.split(':').map(Number);
  const [endH, endM] = ventana.hora_fin.split(':').map(Number);
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;
  const duracion = ventana.duracion_turno_minutos || 60;

  for (let t = startMin; t + duracion <= endMin; t += duracion) {
    const slotStartH = String(Math.floor(t / 60)).padStart(2, '0');
    const slotStartM = String(t % 60).padStart(2, '0');
    const slotEnd = t + duracion;
    const slotEndH = String(Math.floor(slotEnd / 60)).padStart(2, '0');
    const slotEndM = String(slotEnd % 60).padStart(2, '0');
    slots.push({
      hora_inicio: `${slotStartH}:${slotStartM}`,
      hora_fin: `${slotEndH}:${slotEndM}`,
    });
  }
  return slots;
}

export default withAuth(async (req, res, authCtx) => {
  const supabase = supabaseAdmin;

  if (req.method === 'GET') {
    const empresaPlantaId = (req.query.empresa_planta_id as string) || authCtx.empresaId;
    const fecha = req.query.fecha as string | undefined;
    const withSlots = req.query.slots === 'true';

    if (!empresaPlantaId) {
      return res.status(400).json({ error: 'empresa_planta_id requerido' });
    }

    const { data: ventanas, error: ventanasError } = await supabase
      .from('ventanas_recepcion')
      .select('*')
      .eq('empresa_planta_id', empresaPlantaId)
      .order('dia_semana', { ascending: true })
      .order('hora_inicio', { ascending: true });

    if (ventanasError) {
      return res.status(500).json({ error: ventanasError.message });
    }

    if (!fecha || !ventanas || ventanas.length === 0) {
      return res.status(200).json({ data: ventanas || [] });
    }

    const ventanaIds = ventanas.map((v: any) => v.id);
    const { data: reservas, error: reservasError } = await supabase
      .from('turnos_reservados')
      .select('id, ventana_id, hora_inicio, hora_fin, estado')
      .in('ventana_id', ventanaIds)
      .eq('fecha', fecha);

    if (reservasError) {
      return res.status(500).json({ error: reservasError.message });
    }

    if (withSlots) {
      // Slot-level response: each ventana generates hourly slots with per-slot occupancy
      const fechaDate = new Date(fecha + 'T00:00:00');
      const fechaDow = fechaDate.getUTCDay(); // 0=Sun

      const allSlots: any[] = [];
      ventanas.forEach((v: any) => {
        if (!v.activa) return;
        if (v.dia_semana !== fechaDow) return;

        const slots = generateSlots(v);
        slots.forEach((slot) => {
          const slotReservas = (reservas || []).filter((r: any) =>
            r.ventana_id === v.id &&
            r.hora_inicio?.slice(0, 5) === slot.hora_inicio &&
            r.estado !== 'cancelado'
          );
          allSlots.push({
            ventana_id: v.id,
            ventana_nombre: v.nombre,
            hora_inicio: slot.hora_inicio,
            hora_fin: slot.hora_fin,
            capacidad: v.capacidad,
            ocupados: slotReservas.length,
            disponibles: Math.max((v.capacidad || 0) - slotReservas.length, 0),
          });
        });
      });

      return res.status(200).json({ data: allSlots });
    }

    // Legacy ventana-level response (backwards compatible)
    const ocupacion = new Map<string, number>();
    (reservas || []).forEach((r: any) => {
      if (r.estado === 'cancelado') return;
      ocupacion.set(r.ventana_id, (ocupacion.get(r.ventana_id) || 0) + 1);
    });

    const enriched = ventanas.map((v: any) => {
      const ocupados = ocupacion.get(v.id) || 0;
      return {
        ...v,
        ocupados,
        disponibles: Math.max((v.capacidad || 0) - ocupados, 0),
      };
    });

    return res.status(200).json({ data: enriched });
  }

  if (req.method === 'POST') {
    if (!canWrite(authCtx.rolInterno)) {
      return res.status(403).json({ error: 'Rol no autorizado para crear ventanas' });
    }

    const {
      empresa_planta_id,
      nombre,
      dia_semana,
      hora_inicio,
      hora_fin,
      capacidad,
      duracion_turno_minutos,
      activa,
    } = req.body || {};

    const targetEmpresaId = empresa_planta_id || authCtx.empresaId;

    if (!targetEmpresaId || !nombre || dia_semana === undefined || !hora_inicio || !hora_fin) {
      return res.status(400).json({
        error: 'Datos requeridos faltantes',
        required: ['nombre', 'dia_semana', 'hora_inicio', 'hora_fin'],
      });
    }

    if (authCtx.rolInterno !== 'admin_nodexia' && targetEmpresaId !== authCtx.empresaId) {
      return res.status(403).json({ error: 'Solo puede crear ventanas para su empresa' });
    }

    const { data, error } = await supabase
      .from('ventanas_recepcion')
      .insert({
        empresa_planta_id: targetEmpresaId,
        nombre,
        dia_semana,
        hora_inicio,
        hora_fin,
        capacidad: capacidad || 1,
        duracion_turno_minutos: duracion_turno_minutos || 60,
        activa: activa ?? true,
      })
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ data });
  }

  if (req.method === 'PUT') {
    if (!canWrite(authCtx.rolInterno)) {
      return res.status(403).json({ error: 'Rol no autorizado para editar ventanas' });
    }

    const { id, nombre, dia_semana, hora_inicio, hora_fin, capacidad, duracion_turno_minutos, activa } = req.body || {};

    if (!id) {
      return res.status(400).json({ error: 'id requerido' });
    }

    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (nombre !== undefined) payload.nombre = nombre;
    if (dia_semana !== undefined) payload.dia_semana = dia_semana;
    if (hora_inicio !== undefined) payload.hora_inicio = hora_inicio;
    if (hora_fin !== undefined) payload.hora_fin = hora_fin;
    if (capacidad !== undefined) payload.capacidad = capacidad;
    if (duracion_turno_minutos !== undefined) payload.duracion_turno_minutos = duracion_turno_minutos;
    if (activa !== undefined) payload.activa = activa;

    const { data, error } = await supabase
      .from('ventanas_recepcion')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data });
  }

  if (req.method === 'DELETE') {
    if (!canWrite(authCtx.rolInterno)) {
      return res.status(403).json({ error: 'Rol no autorizado para eliminar ventanas' });
    }

    const id = (req.query.id as string) || req.body?.id;
    if (!id) {
      return res.status(400).json({ error: 'id requerido' });
    }

    const { data, error } = await supabase
      .from('ventanas_recepcion')
      .update({ activa: false, updated_at: new Date().toISOString() })
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
