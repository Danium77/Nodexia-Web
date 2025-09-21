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
    const { data, error: fetchError } = await supabase
      .from('choferes')
      .select('*')
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

      // Obtener la empresa del usuario desde la nueva estructura
      const { data: usuarioEmpresa, error: empresaError } = await supabase
        .from('usuarios_empresa')
        .select('empresa_id')
        .eq('user_id', user.id)
        .eq('activo', true)
        .single();

      if (empresaError || !usuarioEmpresa) {
        // Fallback: usar el sistema anterior si no está en la nueva estructura
        console.warn('Usuario no está en nueva estructura de empresas, usando sistema anterior');
        chofer.id_transporte = user.id;
      } else {
        // Usar la nueva estructura
        chofer.empresa_id = usuarioEmpresa.empresa_id;
        chofer.id_transporte = user.id; // Mantener por compatibilidad
      }

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
                          insertError.error_description || 
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
      .delete()
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
