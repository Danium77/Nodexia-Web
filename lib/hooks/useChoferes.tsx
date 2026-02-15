import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface Chofer {
  id?: string;
  nombre?: string;
  apellido?: string;
  dni?: string;
  telefono?: string;
  foto_url?: string | null;
  empresa_id?: string; // ID de la empresa de transporte
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
      .eq('empresa_id', empresaId)
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

      // La tabla choferes usa empresa_id Y id_transporte para asociar con la EMPRESA
      chofer.empresa_id = userEmpresa.empresa_id;
      (chofer as any).id_transporte = userEmpresa.empresa_id;
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
    // Verificar si el chofer está asignado a alguna unidad operativa
    const { data: unidadesData, error: checkError } = await supabase
      .from('unidades_operativas')
      .select('id, nombre, activo')
      .eq('chofer_id', id)
      .limit(10);

    if (checkError) {
      console.error('Error verificando unidades operativas:', checkError);
      throw new Error('Error al verificar asignaciones del chofer');
    }

    if (unidadesData && unidadesData.length > 0) {
      const activas = unidadesData.filter(u => u.activo);
      const inactivas = unidadesData.filter(u => !u.activo);

      // Si hay unidades ACTIVAS, bloquear
      if (activas.length > 0) {
        const nombres = activas.map(u => u.nombre).join(', ');
        throw new Error(
          `No se puede desvincular el chofer porque tiene ${activas.length} unidad(es) operativa(s) ACTIVA(s): ${nombres}. ` +
          `Primero debe desactivarlas desde Flota → Unidades Operativas.`
        );
      }

      // Si solo hay inactivas, eliminarlas automáticamente
      if (inactivas.length > 0) {
        console.log(`🗑️ Auto-eliminando ${inactivas.length} unidades operativas inactivas del chofer`);
        const inactivaIds = inactivas.map(u => u.id);
        const { error: deleteUOError } = await supabase
          .from('unidades_operativas')
          .delete()
          .in('id', inactivaIds);

        if (deleteUOError) {
          console.error('Error eliminando unidades inactivas:', deleteUOError);
          throw new Error('Error al limpiar unidades operativas inactivas del chofer');
        }
      }
    }

    // Desvincular chofer de la empresa (NO eliminar registro)
    const { error: updateError } = await supabase
      .from('choferes')
      .update({ empresa_id: null })
      .eq('id', id);
    
    if (updateError) {
      console.error('Error desvinculando chofer:', updateError);
      throw new Error('Error al desvincular el chofer de la empresa');
    }
    
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
