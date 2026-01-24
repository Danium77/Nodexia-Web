import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface Chofer {
  id?: string;
  nombre?: string;
  apellido?: string;
  dni?: string;
  telefono?: string;
  foto_url?: string | null;
  id_transporte?: string; // Mantener por compatibilidad
  empresa_id?: string; // Nuevo campo para asociación con empresa
  usuario_alta?: string | null;
  usuario_id?: string | null; // Vinculación con usuario de Nodexia
}

export function useChoferes() {
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChoferes();
     
  }, []);

  async function fetchChoferes() {
    setLoading(true);
    setError(null);
    
    // Obtener empresa del usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Usuario no autenticado');
      setLoading(false);
      return;
    }

    // Obtener empresa de transporte del usuario
    const { data: userEmpresa } = await supabase
      .from('usuarios_empresa')
      .select('empresa_id, empresas(id, tipo_empresa)')
      .eq('user_id', user.id)
      .eq('activo', true)
      .single();

    if (!userEmpresa || !userEmpresa.empresas) {
      setError('No se encontró empresa asociada');
      setLoading(false);
      return;
    }

    const empresaId = userEmpresa.empresa_id;

    const { data, error: fetchError } = await supabase
      .from('choferes')
      .select('*')
      .eq('id_transporte', empresaId)
      .is('deleted_at', null)
      .order('apellido', { ascending: true });
      
    if (fetchError) {
      console.error('Error fetching choferes:', fetchError);
      setError(fetchError.message || 'Error al cargar choferes');
    }
    setChoferes(data || []);
    setLoading(false);
  }

  async function addChofer(chofer: Partial<Chofer>) {
    try {
      // Validar campos requeridos
      if (!chofer.nombre || !chofer.apellido || !chofer.dni) {
        throw new Error('Nombre, apellido y DNI son obligatorios');
      }
      
      // Obtener la empresa del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Obtener empresa de transporte del usuario
      const { data: userEmpresa } = await supabase
        .from('usuarios_empresa')
        .select('empresa_id')
        .eq('user_id', user.id)
        .eq('activo', true)
        .single();

      if (!userEmpresa) {
        throw new Error('No se encontró empresa asociada');
      }

      // La tabla choferes usa id_transporte para asociar con la EMPRESA
      chofer.id_transporte = userEmpresa.empresa_id;
      chofer.usuario_alta = user.id;

      const { data, error: insertError } = await supabase
        .from('choferes')
        .insert([chofer])
        .select();
        
      if (insertError) {
        console.error('Error al insertar chofer:', insertError);
        
        // Manejar errores específicos de base de datos
        let errorMessage = 'Error al crear chofer';
        
        if (insertError && typeof insertError === 'object') {
          const errorCode = insertError.code;
          const errorDetails = insertError.details || '';
          
          if (errorCode === '23505' || errorDetails.includes('unique')) {
            if (errorDetails.includes('dni')) {
              errorMessage = 'Ya existe un chofer con ese DNI';
            } else {
              errorMessage = 'Ya existe un registro con esos datos';
            }
          } else if (errorCode === '23503') {
            errorMessage = 'Error de referencia en la base de datos';
          } else if (errorCode === '42501') {
            errorMessage = 'No tiene permisos para realizar esta operación';
          } else {
            errorMessage = insertError.message ||
                          insertError.details ||
                          'Error desconocido en la base de datos';
          }
        }
        throw new Error(errorMessage);
      }
      setChoferes((prev) => [...prev, ...(data || [])]);
      return data?.[0];
    } catch (error) {
      console.error('Error en addChofer:', error);
      throw error;
    }
  }

  async function updateChofer(id: string, updates: Partial<Chofer>) {
    const { data, error: updateError } = await supabase
      .from('choferes')
      .update(updates)
      .eq('id', id)
      .select();
    if (updateError) throw updateError;
    setChoferes((prev) => prev.map((c) => (c.id === id ? data?.[0] ?? c : c)));
    return data?.[0];
  }

  async function deleteChofer(id: string) {
    const { error: deleteError } = await supabase
      .from('choferes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (deleteError) throw deleteError;
    setChoferes((prev) => prev.filter((c) => c.id !== id));
  }

  return {
    choferes,
    loading,
    error,
    fetchChoferes,
    addChofer,
    updateChofer,
    deleteChofer,
  };
}
