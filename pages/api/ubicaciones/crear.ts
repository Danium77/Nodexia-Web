import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

    // Agregar updated_at
    const dataToInsert = {
      ...ubicacionData,
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
    console.error('Error general en crear ubicación:', error);
    return res.status(500).json({ 
      error: error.message || 'Error interno del servidor' 
    });
  }
}
