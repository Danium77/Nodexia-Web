import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { 
  RolEmpresa,
  UsuarioEmpresa, 
  CreateUsuarioEmpresaData,
  UpdateUsuarioEmpresaData
} from '../../types/network';

export function useRolesEmpresa(tipoEmpresa?: string) {
  const [roles, setRoles] = useState<RolEmpresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRoles = async (tipo?: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!tipo) {
        // Si no se especifica tipo, obtenerlo del contexto del usuario
        const { data: usuarioEmpresa } = await supabase
          .from('usuarios_empresa')
          .select('empresas(tipo_empresa)')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();
        
        tipo = usuarioEmpresa?.empresas?.tipo_empresa;
      }

      if (!tipo) {
        throw new Error('No se pudo determinar el tipo de empresa');
      }

      const { data, error: rpcError } = await supabase
        .rpc('get_roles_disponibles', { p_tipo_empresa: tipo });

      if (rpcError) throw rpcError;

      setRoles(data || []);
    } catch (err) {
      console.error('Error loading roles:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles(tipoEmpresa);
  }, [tipoEmpresa]);

  return { roles, loading, error, refresh: () => loadRoles(tipoEmpresa) };
}

export function useUsuariosEmpresa() {
  const [usuarios, setUsuarios] = useState<UsuarioEmpresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_usuarios_mi_empresa');

      if (rpcError) throw rpcError;

      setUsuarios(data || []);
    } catch (err) {
      console.error('Error loading usuarios:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const agregarUsuario = async (userData: CreateUsuarioEmpresaData) => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('agregar_usuario_empresa', {
          p_email_usuario: userData.email_usuario,
          p_rol_interno: userData.rol_interno,
          p_nombre_completo: userData.nombre_completo,
          p_email_interno: userData.email_interno || null,
          p_telefono_interno: userData.telefono_interno || null,
          p_departamento: userData.departamento || null,
          p_fecha_ingreso: userData.fecha_ingreso || new Date().toISOString().split('T')[0]
        });

      if (rpcError) throw rpcError;

      await loadUsuarios(); // Refrescar lista
      return data;
    } catch (err) {
      console.error('Error adding usuario:', err);
      throw err;
    }
  };

  const actualizarUsuario = async (usuarioId: string, updates: UpdateUsuarioEmpresaData) => {
    try {
      const { error: updateError } = await supabase
        .from('usuarios_empresa')
        .update(updates)
        .eq('id', usuarioId);

      if (updateError) throw updateError;

      await loadUsuarios(); // Refrescar lista
    } catch (err) {
      console.error('Error updating usuario:', err);
      throw err;
    }
  };

  const desactivarUsuario = async (usuarioId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('usuarios_empresa')
        .update({ activo: false })
        .eq('id', usuarioId);

      if (updateError) throw updateError;

      await loadUsuarios(); // Refrescar lista
    } catch (err) {
      console.error('Error deactivating usuario:', err);
      throw err;
    }
  };

  const reactivarUsuario = async (usuarioId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('usuarios_empresa')
        .update({ activo: true })
        .eq('id', usuarioId);

      if (updateError) throw updateError;

      await loadUsuarios(); // Refrescar lista
    } catch (err) {
      console.error('Error reactivating usuario:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadUsuarios();
  }, []);

  return { 
    usuarios, 
    loading, 
    error, 
    agregarUsuario,
    actualizarUsuario,
    desactivarUsuario,
    reactivarUsuario,
    refresh: loadUsuarios 
  };
}

export function useUserPermisos() {
  const [permisos, setPermisos] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPermisos = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_user_permisos')
        .single();

      if (rpcError) throw rpcError;

      setPermisos(data || {});
    } catch (err) {
      console.error('Error loading permisos:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar permisos');
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permiso: string): boolean => {
    return Boolean(permisos[permiso]);
  };

  useEffect(() => {
    loadPermisos();
  }, []);

  return { permisos, loading, error, hasPermission, refresh: loadPermisos };
}