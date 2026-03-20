/**
 * API /api/planificacion/recepciones
 * 
 * Carga recepciones para la planificación semanal usando supabaseAdmin (sin RLS).
 * Soporta dos caminos:
 *   A) Por turno: planta con ventanas → turnos_reservados → despachos vinculados
 *   B) Por destino: despachos donde destino_id es ubicación de la planta
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, type AuthContext } from '@/lib/middleware/withAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

async function handler(req: NextApiRequest, res: NextApiResponse, auth: AuthContext) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const empresaId = auth.empresaId;
  if (!empresaId) {
    return res.status(400).json({ error: 'Usuario sin empresa asociada' });
  }

  try {
    // 1. Obtener empresa info (cuit para ubicaciones)
    const { data: empresa } = await supabaseAdmin
      .from('empresas')
      .select('id, cuit')
      .eq('id', empresaId)
      .single();

    const cuit = empresa?.cuit;

    // 2. Obtener usuarios de la empresa (para excluir despachos propios)
    const { data: companyUsers } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('user_id')
      .eq('empresa_id', empresaId)
      .eq('activo', true);

    const companyUserIds = (companyUsers || []).map((u: any) => u.user_id).filter(Boolean);
    if (!companyUserIds.includes(auth.userId)) {
      companyUserIds.push(auth.userId);
    }

    // 3. Ubicaciones de la empresa
    const ubicacionFilter = cuit
      ? `empresa_id.eq.${empresaId},cuit.eq.${cuit}`
      : `empresa_id.eq.${empresaId}`;

    const { data: ubicaciones } = await supabaseAdmin
      .from('ubicaciones')
      .select('id')
      .or(ubicacionFilter);

    const ubicacionIds = (ubicaciones || []).map((u: any) => u.id);

    // 4. Ventanas de recepción (determina si la planta maneja turnos)
    const { data: ventanas } = await supabaseAdmin
      .from('ventanas_recepcion')
      .select('id')
      .eq('empresa_planta_id', empresaId);

    const ventanaIds = (ventanas || []).map((v: any) => v.id);
    const esTurnoPlanta = ventanaIds.length > 0;

    // 5A. Recepciones por TURNO
    let turnoRecepciones: any[] = [];
    if (esTurnoPlanta && ventanaIds.length > 0) {
      const { data: turnos } = await supabaseAdmin
        .from('turnos_reservados')
        .select('despacho_id, fecha, hora_inicio, hora_fin, numero_turno, estado')
        .in('ventana_id', ventanaIds)
        .in('estado', ['reservado', 'confirmado', 'completado']);

      const turnoDespachoIds = (turnos || [])
        .map((t: any) => t.despacho_id)
        .filter(Boolean);

      if (turnoDespachoIds.length > 0) {
        const { data: despachos } = await supabaseAdmin
          .from('despachos')
          .select('*')
          .in('id', turnoDespachoIds);

        const turnosLookup = Object.fromEntries(
          (turnos || []).map((t: any) => [t.despacho_id, t])
        );

        turnoRecepciones = (despachos || []).map((d: any) => {
          const turno = turnosLookup[d.id];
          return {
            ...d,
            scheduled_local_date: turno?.fecha || d.scheduled_local_date,
            scheduled_local_time: turno?.hora_inicio || d.scheduled_local_time,
            _turno_data: turno,
          };
        });
      }
    }

    // 5B. Recepciones por DESTINO
    let destinoRecepciones: any[] = [];
    if (ubicacionIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('despachos')
        .select('*')
        .in('destino_id', ubicacionIds)
        .not('created_by', 'in', `(${companyUserIds.join(',')})`)
        .order('created_at', { ascending: true });

      destinoRecepciones = data || [];
    }

    // 6. Deduplicar (turno tiene prioridad)
    const turnoIds = new Set(turnoRecepciones.map((d: any) => d.id));
    const destinoSinDup = destinoRecepciones.filter((d: any) => !turnoIds.has(d.id));

    const todasRecepciones = [...turnoRecepciones, ...destinoSinDup];

    return res.status(200).json({
      data: todasRecepciones,
      meta: {
        esTurnoPlanta,
        turnoCount: turnoRecepciones.length,
        destinoCount: destinoSinDup.length,
        ubicacionCount: ubicacionIds.length,
        ventanaCount: ventanaIds.length,
        companyUserCount: companyUserIds.length,
      },
    });
  } catch (err: any) {
    console.error('❌ Error en /api/planificacion/recepciones:', err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
}

export default withAuth(handler);
