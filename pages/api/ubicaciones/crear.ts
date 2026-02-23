import { withAuth } from '@/lib/middleware/withAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ubicacionData = req.body;

    // Validar campos requeridos
    if (!ubicacionData.nombre || !ubicacionData.cuit || !ubicacionData.tipo) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos (nombre, cuit, tipo)' 
      });
    }

    // Obtener empresa_id del usuario autenticado
    const { data: userEmpresa } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('empresa_id')
      .eq('user_id', authCtx.userId)
      .eq('activo', true)
      .single();

    // Auto-set empresa_id: por CUIT match o por empresa del usuario
    let empresaId = null;
    if (ubicacionData.cuit) {
      const { data: empresaCuit } = await supabaseAdmin
        .from('empresas')
        .select('id')
        .eq('cuit', ubicacionData.cuit)
        .maybeSingle();
      empresaId = empresaCuit?.id || null;
    }
    if (!empresaId && userEmpresa?.empresa_id) {
      empresaId = userEmpresa.empresa_id;
    }

    // Agregar updated_at y empresa_id
    const dataToInsert = {
      ...ubicacionData,
      empresa_id: empresaId,
      updated_at: new Date().toISOString()
    };

    // Usar supabaseAdmin para evitar problemas de RLS
    const { data, error } = await supabaseAdmin
      .from('ubicaciones')
      .insert([dataToInsert])
      .select()
      .single();

    if (error) {
      console.error('Error insertando ubicación:', error);
      
      // Manejar errores específicos
      if (error.code === '23505') {
        return res.status(400).json({ 
          error: 'Ya existe una ubicación con ese CUIT' 
        });
      }

      if (error.code === '22001') {
        return res.status(400).json({ 
          error: 'Uno de los campos supera el límite de caracteres permitido' 
        });
      }

      return res.status(500).json({ 
        error: error.message || 'Error al crear la ubicación' 
      });
    }

    return res.status(200).json({ 
      success: true, 
      data 
    });

  } catch (error: any) {
    return res.status(500).json({ 
      error: error.message || 'Error interno del servidor' 
    });
  }
}, { roles: ['coordinador', 'admin_nodexia'] });
