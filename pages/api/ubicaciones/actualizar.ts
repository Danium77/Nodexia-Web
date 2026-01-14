import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, ...ubicacionData } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID de ubicación requerido' });
    }

    // Agregar updated_at
    const dataToUpdate = {
      ...ubicacionData,
      updated_at: new Date().toISOString()
    };

    // Usar supabaseAdmin para evitar problemas de RLS
    const { data, error } = await supabaseAdmin
      .from('ubicaciones')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando ubicación:', error);
      
      if (error.code === '23505') {
        return res.status(400).json({ 
          error: 'Ya existe otra ubicación con ese CUIT' 
        });
      }

      if (error.code === '22001') {
        return res.status(400).json({ 
          error: 'Uno de los campos supera el límite de caracteres permitido' 
        });
      }

      return res.status(500).json({ 
        error: error.message || 'Error al actualizar la ubicación' 
      });
    }

    return res.status(200).json({ 
      success: true, 
      data 
    });

  } catch (error: any) {
    console.error('Error general en actualizar ubicación:', error);
    return res.status(500).json({ 
      error: error.message || 'Error interno del servidor' 
    });
  }
}
