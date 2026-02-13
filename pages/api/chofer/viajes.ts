// pages/api/chofer/viajes.ts
// API Route para obtener viajes del chofer - bypasea RLS
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Verificar autenticación
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    // 1. Buscar chofer_id por email o user_id
    let choferId: string | null = null;

    const { data: choferByEmail } = await supabaseAdmin
      .from('choferes')
      .select('id')
      .eq('email', user.email)
      .maybeSingle();

    if (choferByEmail) {
      choferId = choferByEmail.id;
    } else {
      const { data: choferByUserId } = await supabaseAdmin
        .from('choferes')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (choferByUserId) {
        choferId = choferByUserId.id;
      }
    }

    if (!choferId) {
      return res.status(404).json({ error: 'Chofer no encontrado', viajes: [] });
    }

    // 2. Buscar viajes activos
    const { data: viajes, error: viajesError } = await supabaseAdmin
      .from('viajes_despacho')
      .select(`
        id,
        numero_viaje,
        despacho_id,
        estado,
        estado_unidad,
        despachos!inner(
          pedido_id,
          origen,
          destino,
          scheduled_local_date,
          scheduled_local_time,
          origen_empresa_id
        ),
        camion_id,
        camiones(
          patente,
          marca,
          modelo
        )
      `)
      .eq('chofer_id', choferId)
      .in('estado', [
        'transporte_asignado', 'camion_asignado', 'confirmado_chofer',
        'en_transito_origen', 'ingresado_origen',
        'llamado_carga', 'cargando', 'cargado', 'egreso_origen',
        'en_transito_destino', 'ingresado_destino',
        'llamado_descarga', 'descargando', 'descargado', 'egreso_destino'
      ])
      .order('created_at', { ascending: false });

    if (viajesError) {
      console.error('Error obteniendo viajes:', viajesError);
      return res.status(500).json({ error: 'Error obteniendo viajes', details: viajesError.message });
    }

    return res.status(200).json({
      choferId,
      viajes: viajes || [],
      count: viajes?.length || 0
    });
  } catch (err: unknown) {
    console.error('Error en API chofer/viajes:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
