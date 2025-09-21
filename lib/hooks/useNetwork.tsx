import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { 
  Empresa, 
  UserNetworkContext, 
  TransportistaDisponible, 
  ClienteEmpresa,
  RelacionEmpresa,
  CreateRelacionData,
  NetworkStats
} from '../../types/network';

export function useNetworkContext() {
  const [context, setContext] = useState<UserNetworkContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadNetworkContext() {
      try {
        setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Usuario no autenticado');
        }

        // Obtener información de la empresa del usuario
        const { data: usuarioEmpresa, error: userError } = await supabase
          .from('usuarios_empresa')
          .select(`
            *,
            empresa:empresas(*)
          `)
          .eq('user_id', user.id)
          .eq('activo', true)
          .single();

        if (userError) throw userError;
        if (!usuarioEmpresa) {
          throw new Error('Usuario no está asociado a ninguna empresa');
        }

        // Obtener permisos del usuario
        const { data: permisos, error: permisosError } = await supabase
          .rpc('get_user_permisos')
          .single();

        if (permisosError) {
          console.warn('Error al obtener permisos:', permisosError);
        }

        const userPermisos = permisos || {};

        const networkContext: UserNetworkContext = {
          user_id: user.id,
          empresa: usuarioEmpresa.empresa,
          rol_interno: usuarioEmpresa.rol_interno,
          permisos: userPermisos,
          puede_crear_relaciones: userPermisos.gestionar_relaciones || userPermisos.gestionar_transportistas,
          puede_gestionar_despachos: userPermisos.crear_despachos || userPermisos.gestionar_despachos,
          puede_ver_red: userPermisos.ver_dashboard,
          puede_gestionar_usuarios: userPermisos.gestionar_usuarios,
          puede_gestionar_flota: userPermisos.gestionar_flota || userPermisos.gestionar_choferes
        };

        setContext(networkContext);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar contexto de red');
      } finally {
        setLoading(false);
      }
    }

    loadNetworkContext();
  }, []);

  return { context, loading, error, refresh: loadNetworkContext };
}

export function useTransportistasDisponibles() {
  const [transportistas, setTransportistas] = useState<TransportistaDisponible[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTransportistas = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_available_transportistas');

      if (rpcError) throw rpcError;

      setTransportistas(data || []);
    } catch (err) {
      console.error('Error loading transportistas:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar transportistas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransportistas();
  }, []);

  return { transportistas, loading, error, refresh: loadTransportistas };
}

export function useClientesEmpresa() {
  const [clientes, setClientes] = useState<ClienteEmpresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClientes = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_mis_clientes');

      if (rpcError) throw rpcError;

      setClientes(data || []);
    } catch (err) {
      console.error('Error loading clientes:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientes();
  }, []);

  return { clientes, loading, error, refresh: loadClientes };
}

export function useRelacionesEmpresa() {
  const [relaciones, setRelaciones] = useState<RelacionEmpresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRelaciones = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('relaciones_empresas')
        .select(`
          *,
          empresa_cliente:empresas!empresa_cliente_id(*),
          empresa_transporte:empresas!empresa_transporte_id(*)
        `)
        .eq('estado', 'activa');

      if (queryError) throw queryError;

      setRelaciones(data || []);
    } catch (err) {
      console.error('Error loading relaciones:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar relaciones');
    } finally {
      setLoading(false);
    }
  };

  const crearRelacion = async (data: CreateRelacionData) => {
    try {
      const { data: result, error: rpcError } = await supabase
        .rpc('crear_relacion_empresa', {
          p_empresa_transporte_id: data.empresa_transporte_id,
          p_condiciones: data.condiciones || null
        });

      if (rpcError) throw rpcError;

      await loadRelaciones(); // Refrescar lista
      return result;
    } catch (err) {
      console.error('Error creating relacion:', err);
      throw err;
    }
  };

  const finalizarRelacion = async (relacionId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('relaciones_empresas')
        .update({ 
          estado: 'inactiva',
          fecha_fin: new Date().toISOString()
        })
        .eq('id', relacionId);

      if (updateError) throw updateError;

      await loadRelaciones(); // Refrescar lista
    } catch (err) {
      console.error('Error finalizing relacion:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadRelaciones();
  }, []);

  return { 
    relaciones, 
    loading, 
    error, 
    crearRelacion, 
    finalizarRelacion,
    refresh: loadRelaciones 
  };
}

export function useNetworkStats() {
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_network_stats')
        .single();

      if (rpcError) throw rpcError;

      setStats(data);
    } catch (err) {
      console.error('Error loading network stats:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return { stats, loading, error, refresh: loadStats };
}