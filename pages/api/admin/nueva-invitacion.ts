import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

interface NuevaInvitacionRequest {
  email: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  empresa_id: string;
  rol_interno: string;
  departamento?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const { 
      email, 
      nombre, 
      apellido, 
      telefono, 
      empresa_id, 
      rol_interno, 
      departamento 
    }: NuevaInvitacionRequest = req.body;

    console.log('📧 Enviando invitación formal a usuario:', { email, nombre, apellido, empresa_id });

    // Validar campos requeridos
    if (!email || !nombre || !apellido || !empresa_id || !rol_interno) {
      return res.status(400).json({
        error: 'Faltan campos requeridos',
        requeridos: ['email', 'nombre', 'apellido', 'empresa_id', 'rol_interno']
      });
    }

    // Verificar que la empresa existe
    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .select('id, nombre')
      .eq('id', empresa_id)
      .single();

    if (empresaError || !empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    console.log('✅ Empresa encontrada:', empresa.nombre);

    // Generar invitación por email con metadata completa
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003'}/complete-invite`,
        data: {
          nombre,
          apellido,
          telefono: telefono || '',
          empresa_id,
          empresa_nombre: empresa.nombre,
          rol_interno,
          departamento: departamento || ''
        }
      }
    );

    if (inviteError) {
      console.error('❌ Error enviando invitación:', inviteError);
      
      // Si el usuario ya existe, intentemos regenerar un enlace
      if (inviteError.message?.includes('already been registered')) {
        return res.status(400).json({ 
          error: 'El usuario ya está registrado',
          solucion: 'Use la opción "Reenviar Invitación" o "Reset Password" en su lugar'
        });
      }

      return res.status(500).json({ 
        error: 'Error enviando invitación por email',
        details: inviteError.message
      });
    }

    console.log('✅ Invitación enviada exitosamente');

    return res.status(200).json({
      message: 'Invitación enviada exitosamente por email',
      usuario: {
        email,
        nombre: `${nombre} ${apellido}`,
        empresa: empresa.nombre,
        rol_interno
      },
      email_enviado: true,
      instrucciones: [
        `📧 Se envió un email de invitación a: ${email}`,
        '👀 El usuario debe revisar su bandeja de entrada (y spam)',
        '🔗 Al hacer clic en el enlace, podrá crear su contraseña',
        '📝 Deberá completar su información personal',
        '✅ Una vez completado, aparecerá automáticamente en la lista'
      ]
    });

  } catch (error) {
    console.error('❌ Error general:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}