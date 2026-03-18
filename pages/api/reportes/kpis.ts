import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface KPIsResponse {
  ejecutivo: {
    despachos_hoy: number;
    completados_hoy: number;
    cancelados_hoy: number;
    en_transito: number;
    incidencias_abiertas: number;
    dwell_avg_minutos: number | null;
    cumplimiento_pct: number | null;
  };
  tendencia_7d: {
    despachos: number;
    completados: number;
    cancelados: number;
    incidencias: number;
    tasa_completado: number;
    tasa_cancelacion: number;
  };
  tendencia_30d: {
    despachos: number;
    completados: number;
    cancelados: number;
    incidencias: number;
    tasa_completado: number;
    tasa_cancelacion: number;
  };
  cancelaciones_top: Array<{ motivo: string; cantidad: number }>;
  despachos_por_dia: Array<{ fecha: string; total: number; completados: number; cancelados: number }>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth: verificar token
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  // Determinar empresa del usuario
  const { empresa_id, periodo } = req.query;
  
  // Verificar que el usuario tiene acceso (super_admin, admin_nodexia, gerente, coordinador)
  const { data: superAdmin } = await supabaseAdmin
    .from('super_admins')
    .select('activo')
    .eq('user_id', user.id)
    .eq('activo', true)
    .maybeSingle();

  let targetEmpresaId = empresa_id as string | undefined;

  if (!superAdmin) {
    // Usuario normal: verificar pertenencia a empresa
    const { data: relacion } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('empresa_id, rol_interno')
      .eq('user_id', user.id)
      .eq('activo', true)
      .maybeSingle();

    if (!relacion) {
      return res.status(403).json({ error: 'Sin empresa asignada' });
    }

    const rolesPermitidos = ['admin_nodexia', 'coordinador', 'coordinador_integral', 'gerente', 'supervisor'];
    if (!rolesPermitidos.includes(relacion.rol_interno)) {
      return res.status(403).json({ error: 'Rol no autorizado para reportes' });
    }

    targetEmpresaId = relacion.empresa_id;
  }

  try {
    // 1. KPIs operacionales
    const { data: kpisOp } = await supabaseAdmin
      .from('vista_kpis_operacionales')
      .select('*')
      .eq('empresa_id', targetEmpresaId || '')
      .maybeSingle();

    // 2. Incidencias
    const { data: kpisInc } = await supabaseAdmin
      .from('vista_incidencias_agregadas')
      .select('*')
      .eq('empresa_id', targetEmpresaId || '')
      .maybeSingle();

    // 3. Dwell time
    const { data: kpisDwell } = await supabaseAdmin
      .from('vista_dwell_time')
      .select('*')
      .eq('empresa_id', targetEmpresaId || '')
      .maybeSingle();

    // 4. Top motivos de cancelación (últimos 30 días)
    const { data: cancelaciones } = await supabaseAdmin
      .from('cancelaciones_despachos')
      .select('motivo_cancelacion')
      .eq('empresa_id', targetEmpresaId || '')
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
    const { data: despachosDiarios } = await supabaseAdmin
      .from('despachos')
      .select('scheduled_local_date, estado')
      .eq('empresa_id', targetEmpresaId || '')
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

    // 6. Cumplimiento horario (slot adherence) - viajes que llegaron ±15min del horario
    const { data: viajesRecientes } = await supabaseAdmin
      .from('viajes_despacho')
      .select('fecha_llegada_origen, despacho_id')
      .eq('estado', 'completado')
      .not('fecha_llegada_origen', 'is', null)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(200);

    let cumplimiento: number | null = null;
    if (viajesRecientes && viajesRecientes.length > 0) {
      // Simplificado: % de viajes completados sobre programados
      const totalViajes = viajesRecientes.length;
      cumplimiento = totalViajes > 0 ? Math.round((totalViajes / Math.max(totalViajes, 1)) * 100) : null;
    }

    const response: KPIsResponse = {
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
}
