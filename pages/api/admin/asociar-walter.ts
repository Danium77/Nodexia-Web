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
    console.log('🔧 Asociando Walter con Tecnoembalajes Zayas...');

    const walterUserId = '936677cb-92c9-4019-9cd8-819286f43c40';
    
    // Buscar la empresa Tecnoembalajes Zayas
    const { data: empresas, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .select('id, nombre')
      .ilike('nombre', '%tecnoembalajes%zayas%');

    if (empresaError) {
      console.error('❌ Error buscando empresa:', empresaError);
      return res.status(404).json({ error: 'Error buscando empresa Tecnoembalajes Zayas' });
    }

    console.log('🔍 Empresas encontradas:', empresas);

    if (!empresas || empresas.length === 0) {
      // Si no encuentra con criterio específico, buscar solo "tecnoembalajes"
      const { data: empresas2, error: empresaError2 } = await supabaseAdmin
        .from('empresas')
        .select('id, nombre')
        .ilike('nombre', '%tecnoembalajes%');

      if (empresaError2 || !empresas2 || empresas2.length === 0) {
        return res.status(404).json({ error: 'Empresa Tecnoembalajes no encontrada' });
      }
      
      var empresa = empresas2[0]; // Tomar la primera
    } else {
      var empresa = empresas[0]; // Tomar la primera que coincida
    }



    console.log('✅ Empresa encontrada:', empresa);

    // Verificar si Walter ya está asociado
    const { data: existingAssociation } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('*')
      .eq('user_id', walterUserId)
      .single();

    if (existingAssociation) {
      console.log('ℹ️ Walter ya está asociado, actualizando datos...');
      
      // Actualizar la asociación existente
      const { error: updateError } = await supabaseAdmin
        .from('usuarios_empresa')
        .update({
          empresa_id: empresa.id,
          nombre: 'Walter Zayas',
          email: 'waltedanielzaas@gmail.com',
          telefono: '+54112769000',
          rol_interno: 'transporte',
          activo: true
        })
        .eq('user_id', walterUserId);

      if (updateError) {
        console.error('❌ Error actualizando asociación:', updateError);
        throw updateError;
      }

      console.log('✅ Asociación actualizada exitosamente');
    } else {
      console.log('➕ Creando nueva asociación para Walter...');
      
      // Crear nueva asociación (usando solo campos básicos por ahora)
      const { error: insertError } = await supabaseAdmin
        .from('usuarios_empresa')
        .insert({
          user_id: walterUserId,
          empresa_id: empresa.id,
          nombre: 'Walter Zayas',
          email: 'waltedanielzaas@gmail.com',
          telefono: '+54112769000',
          rol_interno: 'transporte',
          activo: true
        });

      if (insertError) {
        console.error('❌ Error insertando asociación:', insertError);
        throw insertError;
      }

      console.log('✅ Nueva asociación creada exitosamente');
    }

    return res.status(200).json({
      message: 'Walter asociado exitosamente con Tecnoembalajes Zayas',
      usuario: {
        id: walterUserId,
        nombre: 'Walter Zayas',
        email: 'waltedanielzaas@gmail.com',
        empresa: empresa.nombre,
        rol: 'transporte',
        departamento: 'Operaciones'
      },
      empresa: {
        id: empresa.id,
        nombre: empresa.nombre
      }
    });

  } catch (error) {
    console.error('❌ Error general:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}