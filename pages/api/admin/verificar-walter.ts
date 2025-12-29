// pages/api/admin/verificar-walter.ts
// API para verificar si Walter existe y obtener su enlace de activación

import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    console.log('🔍 Buscando Walter en Auth...');

    // Buscar Walter en auth.users
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      throw error;
    }

    const walter = users.users?.find((user: any) => 
      user.email?.toLowerCase() === 'waltedanielzaas@gmail.com'
    );

    if (!walter) {
      return res.status(404).json({
        success: false,
        error: 'Walter no encontrado en Auth',
        solucion: 'Usar el botón "👤 Crear Walter" para crearlo'
      });
    }

    console.log('✅ Walter encontrado:', walter.id);

    // Generar nuevo enlace de activación
    const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: walter.email!,
      password: 'temp-password-123',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'}/complete-invite`
      }
    });

    const enlaceActivacion = (linkData as any)?.properties?.action_link || 
                           `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'}/complete-invite`;

    return res.status(200).json({
      success: true,
      usuario: {
        id: walter.id,
        email: walter.email,
        created_at: walter.created_at,
        email_confirmed_at: walter.email_confirmed_at,
        last_sign_in_at: walter.last_sign_in_at,
        estado: walter.email_confirmed_at ? 'Activado' : 'Pendiente de activación'
      },
      enlace_activacion: enlaceActivacion,
      instrucciones: [
        '📧 Walter YA EXISTE en el sistema',
        '',
        `👤 Email: ${walter.email}`,
        `🔑 ID: ${walter.id}`,
        `📅 Creado: ${new Date(walter.created_at).toLocaleString()}`,
        `✅ Estado: ${walter.email_confirmed_at ? 'Activado' : 'Pendiente de activación'}`,
        '',
        '🔗 ENLACE DE ACTIVACIÓN:',
        enlaceActivacion,
        '',
        '📱 ENVÍA ESTE MENSAJE A WALTER:',
        '',
        'Hola Walter! 👋',
        '',
        'Te hemos creado una cuenta en el sistema Nodexia para Tecnoembalajes Zayas S.A.',
        '',
        'Para activar tu cuenta, haz clic en este enlace:',
        enlaceActivacion,
        '',
        'Una vez que hagas clic:',
        '• Podrás establecer tu contraseña',
        '• Acceder al sistema como Coordinador de Despachos',
        '• Gestionar operaciones y despachos',
        '',
        '¡Cualquier duda, nos contactas!',
        '',
        'Saludos,',
        'Equipo Nodexia'
      ]
    });

  } catch (error: any) {
    console.error('❌ Error verificando Walter:', error);
    return res.status(500).json({
      success: false,
      error: 'Error técnico verificando usuario',
      detalles: error.message
    });
  }
}