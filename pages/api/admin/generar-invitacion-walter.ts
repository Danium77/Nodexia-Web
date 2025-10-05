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
    console.log('🔄 Generando nueva invitación para Walter...')

    // Primero verificamos que Walter existe
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      '936677cb-92c9-4019-9cd8-819286f43c40'
    )

    if (userError || !user) {
      console.error('❌ Error encontrando usuario:', userError)
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    console.log('✅ Usuario encontrado:', user.user?.email)

    // Generamos un nuevo enlace de invitación usando el método correcto
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      'waltedanielzaas@gmail.com',
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003'}/dashboard`,
        data: {
          nombre: 'Walter Zayas',
          empresa_id: '416a7b57-fb7d-49f5-8632-36928ad4fe61',
          rol_interno: 'transporte',
          telefono: '+54112769000',
          departamento: 'Operaciones'
        }
      }
    )

    if (inviteError) {
      console.error('❌ Error generando invitación:', inviteError)
      
      // Si falla, intentemos resetear la contraseña que también genera un enlace válido
      const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: 'waltedanielzaas@gmail.com',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003'}/dashboard`
        }
      })

      if (resetError) {
        console.error('❌ Error generando enlace de recuperación:', resetError)
        return res.status(500).json({ error: 'No se pudo generar enlace de activación' })
      }

      console.log('✅ Enlace de recuperación generado')
      console.log('🔗 Datos de recuperación:', resetData)
      console.log('🔗 Action Link:', resetData.properties?.action_link)
      return res.status(200).json({
        message: 'Enlace de activación generado (método recovery)',
        enlace: resetData.properties?.action_link,
        tipo: 'recovery',
        usuario: {
          id: user.user?.id,
          email: user.user?.email,
          created_at: user.user?.created_at
        },
        instrucciones: [
          '1. Copia el enlace de activación',
          '2. Pégalo en el navegador de Walter',
          '3. Walter deberá crear una nueva contraseña',
          '4. Después podrá acceder al sistema'
        ]
      })
    }

    console.log('✅ Nueva invitación generada exitosamente')
    
    return res.status(200).json({
      message: 'Nueva invitación generada exitosamente',
      enlace: inviteData.properties?.action_link || 'No disponible',
      tipo: 'invite',
      usuario: {
        id: user.user?.id,
        email: user.user?.email,
        created_at: user.user?.created_at
      },
      instrucciones: [
        '1. Copia el enlace de activación',
        '2. Envíalo a Walter por WhatsApp',
        '3. Walter deberá crear una contraseña',
        '4. Después podrá acceder al sistema'
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