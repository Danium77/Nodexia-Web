// pages/api/control-acceso/documentos-detalle.ts
// API para obtener documentos detallados de los recursos de un viaje
// Usa supabaseAdmin para bypasear RLS (control-acceso no tiene acceso directo a documentos_entidad)

import type { NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { withAuth } from '../../../lib/middleware/withAuth';

export default withAuth(async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { chofer_id, camion_id, acoplado_id } = req.query;

  if (!chofer_id && !camion_id && !acoplado_id) {
    return res.status(400).json({ error: 'Se requiere al menos un ID de entidad' });
  }

  try {
    // Recopilar IDs
    const entidadIds: string[] = [];
    if (chofer_id) entidadIds.push(chofer_id as string);
    if (camion_id) entidadIds.push(camion_id as string);
    if (acoplado_id) entidadIds.push(acoplado_id as string);

    // Consultar documentos con supabaseAdmin (bypasea RLS)
    const { data: docs, error: docsError } = await supabaseAdmin
      .from('documentos_entidad')
      .select('id, tipo_documento, entidad_tipo, entidad_id, nombre_archivo, estado_vigencia, fecha_emision, fecha_vencimiento, created_at')
      .in('entidad_id', entidadIds)
      .eq('activo', true)
      .order('entidad_tipo')
      .order('tipo_documento');

    if (docsError) throw docsError;

    // Cargar nombres de entidades
    const nombres: Record<string, string> = {};
    const queries = [];

    if (chofer_id) {
      queries.push(
        supabaseAdmin.from('choferes').select('id, nombre, apellido').eq('id', chofer_id as string).maybeSingle()
          .then(({ data }) => {
            if (data) nombres[chofer_id as string] = `${data.nombre} ${data.apellido}`;
          })
      );
    }
    if (camion_id) {
      queries.push(
        supabaseAdmin.from('camiones').select('id, patente, marca').eq('id', camion_id as string).maybeSingle()
          .then(({ data }) => {
            if (data) nombres[camion_id as string] = `${data.patente}${data.marca ? ` (${data.marca})` : ''}`;
          })
      );
    }
    if (acoplado_id) {
      queries.push(
        supabaseAdmin.from('acoplados').select('id, patente, marca').eq('id', acoplado_id as string).maybeSingle()
          .then(({ data }) => {
            if (data) nombres[acoplado_id as string] = `${data.patente}${data.marca ? ` (${data.marca})` : ''}`;
          })
      );
    }

    await Promise.all(queries);

    return res.status(200).json({
      success: true,
      data: {
        documentos: docs || [],
        nombres,
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Error interno' });
  }
}, { roles: ['control_acceso', 'supervisor', 'coordinador', 'admin_nodexia'] });
