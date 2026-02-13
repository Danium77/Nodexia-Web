import { withAuth } from '../../../lib/middleware/withAuth'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

interface ActualizarUsuarioRequest {
  user_id: string;
  nombre_completo?: string;
  telefono?: string;
  dni?: string;
  departamento?: string;
}

export default withAuth(async (req, res, authCtx) => {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { 
      user_id,
      nombre_completo,
      telefono,
      dni,
      departamento
    }: ActualizarUsuarioRequest = req.body;

    console.log('Actualizando usuario:', { user_id, nombre_completo, telefono, dni, departamento });

    // Validar campos requeridos
    if (!user_id) {
      return res.status(400).json({
        error: 'Missing required field: user_id'
      });
    }

    // Actualizar en tabla usuarios (si existe el registro)
    // Esta tabla es opcional, algunos usuarios solo existen en usuarios_empresa
    const { error: usuariosError } = await supabaseAdmin
      .from('usuarios')
      .upsert({
        id: user_id,
        nombre_completo: nombre_completo || null,
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (usuariosError) {
      console.warn('Warning updating usuarios table (puede no existir):', usuariosError.message);
      // No retornar error, continuar con usuarios_empresa que es la tabla principal
    }

    // Actualizar en tabla usuarios_empresa (puede haber múltiples registros)
    const { error: usuariosEmpresaError } = await supabaseAdmin
      .from('usuarios_empresa')
      .update({
        nombre_completo: nombre_completo || null,
        telefono_interno: telefono || null,
        dni: dni || null,
        departamento: departamento || null
      })
      .eq('user_id', user_id);

    if (usuariosEmpresaError) {
      console.error('Error actualizando usuarios_empresa:', usuariosEmpresaError);
      return res.status(500).json({
        error: 'Error updating usuarios_empresa table',
        details: usuariosEmpresaError.message
      });
    }

    console.log('✅ Usuario actualizado exitosamente');

    return res.status(200).json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      updated: {
        user_id,
        nombre_completo,
        telefono,
        dni,
        departamento
      }
    });

  } catch (error: any) {
    console.error('Error general actualizando usuario:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}, { roles: ['coordinador', 'admin_nodexia'] });
