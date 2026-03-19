import { withAuth } from '@/lib/middleware/withAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default withAuth(async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  const destinoId = req.query.destino_id as string | undefined;
  if (!destinoId) {
    return res.status(400).json({ error: 'destino_id requerido' });
  }

  try {
    const { data: ubicacion, error: ubicacionError } = await supabaseAdmin
      .from('ubicaciones')
      .select('id, empresa_id, nombre, latitud, longitud')
      .eq('id', destinoId)
      .maybeSingle();

    if (ubicacionError) {
      return res.status(500).json({ error: ubicacionError.message });
    }

    if (!ubicacion || !ubicacion.empresa_id) {
      return res.status(200).json({
        requiere_turno: false,
        motivo: 'destino_sin_empresa',
      });
    }

    const { data: empresaDestino, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .select('id, tipo_empresa, nombre')
      .eq('id', ubicacion.empresa_id)
      .maybeSingle();

    if (empresaError) {
      return res.status(500).json({ error: empresaError.message });
    }

    if (!empresaDestino || String(empresaDestino.tipo_empresa).toLowerCase() !== 'planta') {
      return res.status(200).json({
        requiere_turno: false,
        empresa_planta_id: null,
        motivo: 'destino_no_planta',
      });
    }

    const { data: feature } = await supabaseAdmin
      .from('funciones_sistema')
      .select('id, activo')
      .eq('clave', 'turnos_recepcion')
      .maybeSingle();

    if (!feature?.activo) {
      return res.status(200).json({
        requiere_turno: false,
        empresa_planta_id: empresaDestino.id,
        motivo: 'feature_global_inactiva',
      });
    }

    const { data: featureEmpresa } = await supabaseAdmin
      .from('funciones_empresa')
      .select('habilitada')
      .eq('funcion_id', feature.id)
      .eq('empresa_id', empresaDestino.id)
      .maybeSingle();

    if (!featureEmpresa?.habilitada) {
      return res.status(200).json({
        requiere_turno: false,
        empresa_planta_id: empresaDestino.id,
        motivo: 'feature_empresa_inactiva',
      });
    }

    const { count: ventanasActivas } = await supabaseAdmin
      .from('ventanas_recepcion')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_planta_id', empresaDestino.id)
      .eq('activa', true);

    return res.status(200).json({
      requiere_turno: (ventanasActivas || 0) > 0,
      empresa_planta_id: empresaDestino.id,
      empresa_planta_nombre: empresaDestino.nombre,
      ubicacion_destino: {
        id: ubicacion.id,
        nombre: ubicacion.nombre,
        latitud: ubicacion.latitud,
        longitud: ubicacion.longitud,
      },
      motivo: (ventanasActivas || 0) > 0 ? 'ok' : 'sin_ventanas_activas',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error interno' });
  }
});
