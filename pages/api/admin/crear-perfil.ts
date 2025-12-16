// pages/api/admin/crear-perfil.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Verificación robusta de variables de entorno
if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Error crítico: Faltan las variables de entorno de Supabase. Revisa tu archivo .env.local y reinicia el servidor.");
}

// Cliente de Supabase con privilegios de administrador
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

interface Role {
  name: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 1. Verificar que el usuario que hace la petición es un administrador
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token de autorización no proporcionado.' });
        }

        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
        if (userError || !user) {
            return res.status(401).json({ error: 'No autorizado: Token inválido' });
        }

        const { data: profileUser, error: roleError } = await supabaseAdmin
            .from('profile_users').select('roles(name)').eq('user_id', user.id).single();

        const isAdmin = Array.isArray(profileUser?.roles)
          ? (profileUser.roles as Role[]).some((role) => role.name === 'admin')
          : ((profileUser?.roles as unknown) as Role)?.name === 'admin';

        if (roleError || !isAdmin) {
            return res.status(403).json({ error: 'Prohibido: No eres administrador' });
        }

        // 2. Lógica para crear el perfil
        const { name, type, cuit } = req.body;
        if (!name || !type || !cuit) {
            return res.status(400).json({ error: 'El nombre, tipo y CUIT del perfil son requeridos.' });
        }

        const { data, error: insertError } = await supabaseAdmin
            .from('profiles')
            .insert({ name, type, cuit })
            .select()
            .single();

        if (insertError) {
            // Manejar error de CUIT duplicado
            if (insertError.code === '23505') { 
                 return res.status(409).json({ error: 'El CUIT ingresado ya existe.' });
            }
            throw insertError;
        }

        res.status(200).json(data);
    } catch (error: any) {
        console.error('Error al crear perfil:', error);
        res.status(500).json({ error: error.message || 'Ocurrió un error interno en el servidor.' });
    }
}
