import { withAuth } from '@/lib/middleware/withAuth';
import { createUserSupabaseClient } from '@/lib/supabaseServerClient';

const WRITE_ROLES = ['coordinador', 'coordinador_integral', 'control_acceso', 'supervisor', 'admin_nodexia'];

function canWrite(rolInterno: string | null) {
  return !!rolInterno && WRITE_ROLES.includes(rolInterno);
}

export default withAuth(async (req, res, authCtx) => {
  const supabase = createUserSupabaseClient(authCtx.token);

  if (req.method === 'GET') {
    const empresaPlantaId = (req.query.empresa_planta_id as string) || authCtx.empresaId;
    const fecha = req.query.fecha as string | undefined;

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
      .select('id, ventana_id, estado')
      .in('ventana_id', ventanaIds)
      .eq('fecha', fecha);

    if (reservasError) {
      return res.status(500).json({ error: reservasError.message });
    }

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
