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
    console.log('🔄 Generando magic link para Walter...')

    // Primero verificamos que Walter existe
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      '936677cb-92c9-4019-9cd8-819286f43c40'
    )

    if (userError || !user) {
      console.error('❌ Error encontrando usuario:', userError)
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    console.log('✅ Usuario encontrado:', user.user?.email)

    // Generamos un magic link usando generateLink
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: 'waltedanielzaas@gmail.com',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003'}/dashboard`
      }
    })

    if (linkError) {
      console.error('❌ Error generando magic link:', linkError)
      return res.status(500).json({ error: 'No se pudo generar magic link' })
    }

    console.log('✅ Magic link generado exitosamente')
    console.log('🔗 Datos del link:', linkData)
    console.log('🔗 Action Link:', linkData.properties?.action_link)
    
    return res.status(200).json({
      message: 'Magic link generado exitosamente',
      enlace: linkData.properties?.action_link,
      tipo: 'magiclink',
      usuario: {
        id: user.user?.id,
        email: user.user?.email,
        created_at: user.user?.created_at
      },
      instrucciones: [
        '1. Copia el enlace mágico',
        '2. Envíalo a Walter por WhatsApp',
        '3. Walter podrá acceder directamente sin contraseña',
        '4. Una vez dentro, puede cambiar su contraseña si desea'
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