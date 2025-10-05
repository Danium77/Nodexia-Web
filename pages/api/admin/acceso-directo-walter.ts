import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    console.log('🔄 Generando enlace directo para Walter...')

    // Primero verificamos que Walter existe
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      '936677cb-92c9-4019-9cd8-819286f43c40'
    )

    if (userError || !user) {
      console.error('❌ Error encontrando usuario:', userError)
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    console.log('✅ Usuario encontrado:', user.user?.email)

    // En lugar de usar enlaces de Supabase, vamos a crear un enlace directo
    // que fuerze el login con credenciales temporales

    // Primero, reseteamos la contraseña a una temporal conocida
    const tempPassword = 'TempPass123!Walter2025';
    
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      '936677cb-92c9-4019-9cd8-819286f43c40',
      {
        password: tempPassword,
        email_confirm: true
      }
    )

    if (updateError) {
      console.error('❌ Error actualizando contraseña:', updateError)
      return res.status(500).json({ error: 'No se pudo actualizar la contraseña' })
    }

    console.log('✅ Contraseña temporal establecida')
    
    // Crear enlace directo al login con instrucciones
    const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003'}/login`;
    
    return res.status(200).json({
      message: 'Acceso directo configurado para Walter',
      enlace: loginUrl,
      tipo: 'login_directo',
      credenciales: {
        email: 'waltedanielzaas@gmail.com',
        password_temporal: tempPassword
      },
      usuario: {
        id: user.user?.id,
        email: user.user?.email,
        created_at: user.user?.created_at
      },
      instrucciones: [
        '1. Ve a la página de login usando el enlace',
        '2. Usa estas credenciales temporales:',
        `   📧 Email: waltedanielzaas@gmail.com`,
        `   🔑 Contraseña: ${tempPassword}`,
        '3. Una vez dentro, Walter puede cambiar su contraseña',
        '4. El sistema recordará su sesión'
      ]
    })

  } catch (error) {
    console.error('❌ Error general:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}