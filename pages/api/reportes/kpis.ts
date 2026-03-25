import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/middleware/withAuth';
import { createUserSupabaseClient } from '@/lib/supabaseServerClient';

const ROLES_REPORTES = ['admin_nodexia', 'coordinador', 'coordinador_integral', 'gerente', 'supervisor'];

export default withAuth(async (req, res, auth) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // admin_nodexia puede consultar cualquier empresa via query param
  const { empresa_id } = req.query;
  const targetEmpresaId = (auth.rolInterno === 'admin_nodexia' && empresa_id)
    ? empresa_id as string
    : auth.empresaId;

  if (!targetEmpresaId) {
    return res.status(400).json({ error: 'Sin empresa para consultar' });
  }

  const supabase = createUserSupabaseClient(auth.token);

  try {
    // 1. KPIs operacionales
    const { data: kpisOp } = await supabase
      .from('vista_kpis_operacionales')
      .select('*')
      .eq('empresa_id', targetEmpresaId)
      .maybeSingle();

    // 2. Incidencias
    const { data: kpisInc } = await supabase
      .from('vista_incidencias_agregadas')
      .select('*')
      .eq('empresa_id', targetEmpresaId)
      .maybeSingle();

    // 3. Dwell time
    const { data: kpisDwell } = await supabase
      .from('vista_dwell_time')
      .select('*')
      .eq('empresa_id', targetEmpresaId)
      .maybeSingle();

    // 4. Top motivos de cancelación (últimos 30 días)
    const { data: cancelaciones } = await supabase
      .from('cancelaciones_despachos')
      .select('motivo_cancelacion')
      .eq('empresa_id', targetEmpresaId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const motivoCount: Record<string, number> = {};
    (cancelaciones || []).forEach((c: any) => {
      const motivo = c.motivo_cancelacion || 'Sin especificar';
      motivoCount[motivo] = (motivoCount[motivo] || 0) + 1;
    });
    const cancelacionesTop = Object.entries(motivoCount)
      .map(([motivo, cantidad]) => ({ motivo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    // 5. Despachos por día (últimos 14 días)
    const { data: despachosDiarios } = await supabase
      .from('despachos')
      .select('scheduled_local_date, estado')
      .eq('empresa_id', targetEmpresaId)
      .gte('scheduled_local_date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    const porDia: Record<string, { total: number; completados: number; cancelados: number }> = {};
    (despachosDiarios || []).forEach((d: any) => {
      const fecha = d.scheduled_local_date;
      if (!fecha) return;
      if (!porDia[fecha]) porDia[fecha] = { total: 0, completados: 0, cancelados: 0 };
      porDia[fecha].total++;
      if (d.estado === 'completado') porDia[fecha].completados++;
      if (d.estado === 'cancelado') porDia[fecha].cancelados++;
    });
    const despachosPorDia = Object.entries(porDia)
      .map(([fecha, data]) => ({ fecha, ...data }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    // 6. Cumplimiento horario: % de despachos completados sobre total (últimos 7 días)
    const { data: viajesCumplimiento } = await supabase
      .from('despachos')
      .select('estado')
      .eq('empresa_id', targetEmpresaId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    let cumplimiento: number | null = null;
    if (viajesCumplimiento && viajesCumplimiento.length > 0) {
      const total = viajesCumplimiento.length;
      const completados = viajesCumplimiento.filter((v: any) => v.estado === 'completado').length;
      cumplimiento = Math.round((completados / total) * 100);
    }

    const response = {
      ejecutivo: {
        despachos_hoy: kpisOp?.despachos_hoy || 0,
        completados_hoy: kpisOp?.completados_hoy || 0,
        cancelados_hoy: kpisOp?.cancelados_hoy || 0,
        en_transito: kpisOp?.en_transito || 0,
        incidencias_abiertas: kpisInc?.incidencias_abiertas || 0,
        dwell_avg_minutos: kpisDwell?.dwell_avg_minutos || null,
        cumplimiento_pct: cumplimiento,
      },
      tendencia_7d: {
        despachos: kpisOp?.despachos_7d || 0,
        completados: kpisOp?.completados_7d || 0,
        cancelados: kpisOp?.cancelados_7d || 0,
        incidencias: kpisInc?.incidencias_7d || 0,
        tasa_completado: kpisOp?.despachos_7d ? Math.round((kpisOp.completados_7d / kpisOp.despachos_7d) * 100) : 0,
        tasa_cancelacion: kpisOp?.despachos_7d ? Math.round((kpisOp.cancelados_7d / kpisOp.despachos_7d) * 100) : 0,
      },
      tendencia_30d: {
        despachos: kpisOp?.despachos_30d || 0,
        completados: kpisOp?.completados_30d || 0,
        cancelados: kpisOp?.cancelados_30d || 0,
        incidencias: kpisInc?.incidencias_30d || 0,
        tasa_completado: kpisOp?.despachos_30d ? Math.round((kpisOp.completados_30d / kpisOp.despachos_30d) * 100) : 0,
        tasa_cancelacion: kpisOp?.despachos_30d ? Math.round((kpisOp.cancelados_30d / kpisOp.despachos_30d) * 100) : 0,
      },
      cancelaciones_top: cancelacionesTop,
      despachos_por_dia: despachosPorDia,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('[reportes/kpis] Error:', error);
    return res.status(500).json({ error: 'Error al obtener KPIs' });
  }
}, { roles: ROLES_REPORTES });
