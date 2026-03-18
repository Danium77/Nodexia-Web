import { withAuth } from '@/lib/middleware/withAuth';
import { createUserSupabaseClient } from '@/lib/supabaseServerClient';

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  const supabase = createUserSupabaseClient(authCtx.token);
  const { despacho_id } = req.body || {};

  if (!despacho_id) {
    return res.status(400).json({ error: 'despacho_id requerido' });
  }

  if (!authCtx.empresaId) {
    return res.status(400).json({ error: 'Empresa no identificada para validar turno' });
  }

  // Si la feature no esta habilitada para la planta, no bloquea ingreso.
  const { data: feature } = await supabase
    .from('funciones_sistema')
    .select('id, activo')
    .eq('clave', 'turnos_recepcion')
    .maybeSingle();

  if (!feature?.activo) {
    return res.status(200).json({ aplica: false, valido: true, motivo: 'feature_inactiva' });
  }

  const { data: featureEmpresa } = await supabase
    .from('funciones_empresa')
    .select('habilitada')
    .eq('funcion_id', feature.id)
    .eq('empresa_id', authCtx.empresaId)
    .maybeSingle();

  if (!featureEmpresa?.habilitada) {
    return res.status(200).json({ aplica: false, valido: true, motivo: 'feature_no_habilitada_empresa' });
  }

  const { data: turno, error: turnoError } = await supabase
    .from('turnos_reservados')
    .select('id, ventana_id, fecha, hora_inicio, hora_fin, estado')
    .eq('despacho_id', despacho_id)
    .in('estado', ['reservado', 'confirmado'])
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (turnoError) {
    return res.status(500).json({ error: turnoError.message });
  }

  if (!turno) {
    return res.status(200).json({
      aplica: true,
      valido: false,
      motivo: 'sin_turno',
      mensaje: 'No existe un turno reservado para este despacho en esta planta.',
    });
  }

  const { data: ventana, error: ventanaError } = await supabase
    .from('ventanas_recepcion')
    .select('id, empresa_planta_id, nombre')
    .eq('id', turno.ventana_id)
    .maybeSingle();

  if (ventanaError) {
    return res.status(500).json({ error: ventanaError.message });
  }

  if (!ventana || ventana.empresa_planta_id !== authCtx.empresaId) {
    return res.status(200).json({ aplica: false, valido: true, motivo: 'turno_de_otra_planta' });
  }

  const hoy = new Date();
  const hoyStr = hoy.toISOString().split('T')[0];

  if (turno.fecha !== hoyStr) {
    return res.status(200).json({
      aplica: true,
      valido: false,
      motivo: 'fecha_incorrecta',
      mensaje: `El turno corresponde a ${turno.fecha} y no a ${hoyStr}.`,
      turno,
      ventana,
    });
  }

  const nowMin = hoy.getHours() * 60 + hoy.getMinutes();
  const inicioMin = toMinutes(turno.hora_inicio);
  const finMin = toMinutes(turno.hora_fin);

  const toleranciaTemprano = 60;
  const toleranciaTarde = 120;
  const dentroVentana = nowMin >= (inicioMin - toleranciaTemprano) && nowMin <= (finMin + toleranciaTarde);

  if (turno.estado === 'reservado') {
    await supabase
      .from('turnos_reservados')
      .update({ estado: 'confirmado', updated_at: new Date().toISOString() })
      .eq('id', turno.id);
  }

  return res.status(200).json({
    aplica: true,
    valido: true,
    warning: dentroVentana ? null : 'Ingreso fuera de la ventana horaria configurada',
    turno,
    ventana,
  });
}, { roles: ['admin_nodexia', 'coordinador', 'coordinador_integral', 'control_acceso', 'supervisor'] });
