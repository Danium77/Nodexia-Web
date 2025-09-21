import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { 
  SuperAdminContext,
  EmpresaAdmin,
  EstadisticasSistema,
  PlanSuscripcion,
  SuscripcionEmpresa,
  Pago,
  LogAdmin,
  CreateEmpresaAdminData,
  FiltrosEmpresas,
  FiltrosPagos,
  FiltrosLogs
} from '../../types/superadmin';

export function useSuperAdminContext() {
  const [context, setContext] = useState<SuperAdminContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContext = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Verificar si es super admin directamente desde la tabla
      const { data: superAdminData, error: checkError } = await supabase
        .from('super_admins')
        .select('*')
        .eq('user_id', user.id)
        .eq('activo', true)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (!superAdminData) {
        setContext({
          is_super_admin: false,
          permisos: {}
        });
        return;
      }

      setContext({
        is_super_admin: true,
        admin_info: superAdminData,
        permisos: superAdminData.permisos || {
          gestionar_empresas: true,
          gestionar_usuarios: true,
          gestionar_suscripciones: true,
          gestionar_pagos: true,
          ver_logs: true,
          configurar_sistema: true
        }
      });
    } catch (err) {
      console.error('Error loading super admin context:', err);
      setError(err instanceof Error ? err.message : 'Error al verificar permisos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContext();
  }, []);

  return { context, loading, error, refresh: loadContext };
}

export function useEmpresasAdmin(filtros?: FiltrosEmpresas) {
  const [empresas, setEmpresas] = useState<EmpresaAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEmpresas = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_empresas_admin');

      if (rpcError) throw rpcError;

      let empresasFiltradas = data || [];

      // Aplicar filtros localmente
      if (filtros) {
        if (filtros.tipo_empresa) {
          empresasFiltradas = empresasFiltradas.filter(e => e.tipo_empresa === filtros.tipo_empresa);
        }
        if (filtros.estado_suscripcion) {
          empresasFiltradas = empresasFiltradas.filter(e => e.estado_suscripcion === filtros.estado_suscripcion);
        }
        if (filtros.busqueda) {
          const busq = filtros.busqueda.toLowerCase();
          empresasFiltradas = empresasFiltradas.filter(e => 
            e.nombre.toLowerCase().includes(busq) || 
            e.cuit.includes(busq) ||
            e.email?.toLowerCase().includes(busq)
          );
        }
      }

      setEmpresas(empresasFiltradas);
    } catch (err) {
      console.error('Error loading empresas admin:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar empresas');
    } finally {
      setLoading(false);
    }
  };

  const crearEmpresa = async (data: CreateEmpresaAdminData) => {
    try {
      const { data: empresaId, error: rpcError } = await supabase
        .rpc('crear_empresa_admin', {
          p_nombre: data.nombre,
          p_cuit: data.cuit,
          p_tipo_empresa: data.tipo_empresa,
          p_email: data.email,
          p_telefono: data.telefono || null,
          p_direccion: data.direccion || null,
          p_admin_email: data.admin_email,
          p_admin_nombre: data.admin_nombre,
          p_plan_id: data.plan_id || null
        });

      if (rpcError) throw rpcError;

      await loadEmpresas(); // Refrescar lista
      return empresaId;
    } catch (err) {
      console.error('Error creating empresa:', err);
      throw err;
    }
  };

  const actualizarEstadoEmpresa = async (empresaId: string, activa: boolean, motivo?: string) => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('actualizar_estado_empresa', {
          p_empresa_id: empresaId,
          p_activa: activa,
          p_motivo: motivo || null
        });

      if (rpcError) throw rpcError;

      await loadEmpresas(); // Refrescar lista
      return data;
    } catch (err) {
      console.error('Error updating empresa status:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadEmpresas();
  }, [filtros]);

  return { 
    empresas, 
    loading, 
    error, 
    crearEmpresa, 
    actualizarEstadoEmpresa,
    refresh: loadEmpresas 
  };
}

export function useEstadisticasSistema() {
  const [estadisticas, setEstadisticas] = useState<EstadisticasSistema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEstadisticas = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_estadisticas_sistema')
        .single();

      if (rpcError) throw rpcError;

      setEstadisticas(data);
    } catch (err) {
      console.error('Error loading estadisticas:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEstadisticas();
  }, []);

  return { estadisticas, loading, error, refresh: loadEstadisticas };
}

export function usePlanesSuscripcion() {
  const [planes, setPlanes] = useState<PlanSuscripcion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlanes = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('planes_suscripcion')
        .select('*')
        .eq('activo', true)
        .order('precio_mensual');

      if (queryError) throw queryError;

      setPlanes(data || []);
    } catch (err) {
      console.error('Error loading planes:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar planes');
    } finally {
      setLoading(false);
    }
  };

  const cambiarPlanEmpresa = async (empresaId: string, planId: string, periodo: 'mensual' | 'anual') => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('cambiar_plan_empresa', {
          p_empresa_id: empresaId,
          p_nuevo_plan_id: planId,
          p_periodo: periodo
        });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      console.error('Error changing plan:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadPlanes();
  }, []);

  return { 
    planes, 
    loading, 
    error, 
    cambiarPlanEmpresa,
    refresh: loadPlanes 
  };
}

export function usePagosAdmin(filtros?: FiltrosPagos) {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPagos = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('pagos')
        .select(`
          *,
          empresa:empresas(nombre, cuit),
          suscripcion:suscripciones_empresa(
            periodo,
            plan:planes_suscripcion(nombre)
          )
        `)
        .order('fecha_creacion', { ascending: false });

      // Aplicar filtros
      if (filtros) {
        if (filtros.empresa_id) {
          query = query.eq('empresa_id', filtros.empresa_id);
        }
        if (filtros.estado) {
          query = query.eq('estado', filtros.estado);
        }
        if (filtros.fecha_desde) {
          query = query.gte('fecha_creacion', filtros.fecha_desde);
        }
        if (filtros.fecha_hasta) {
          query = query.lte('fecha_creacion', filtros.fecha_hasta);
        }
      }

      const { data, error: queryError } = await query.limit(100);

      if (queryError) throw queryError;

      setPagos(data || []);
    } catch (err) {
      console.error('Error loading pagos:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar pagos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPagos();
  }, [filtros]);

  return { pagos, loading, error, refresh: loadPagos };
}

export function useLogsAdmin(filtros?: FiltrosLogs) {
  const [logs, setLogs] = useState<LogAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_logs_admin', {
          p_limit: 100,
          p_offset: 0,
          p_admin_id: filtros?.admin_id || null,
          p_fecha_desde: filtros?.fecha_desde || null
        });

      if (rpcError) throw rpcError;

      let logsFiltrados = data || [];

      // Aplicar filtros adicionales localmente
      if (filtros) {
        if (filtros.accion) {
          logsFiltrados = logsFiltrados.filter(l => l.accion.includes(filtros.accion!));
        }
        if (filtros.entidad_tipo) {
          logsFiltrados = logsFiltrados.filter(l => l.entidad_tipo === filtros.entidad_tipo);
        }
      }

      setLogs(logsFiltrados);
    } catch (err) {
      console.error('Error loading logs:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [filtros]);

  return { logs, loading, error, refresh: loadLogs };
}

export function useSuscripcionesAdmin() {
  const [suscripciones, setSuscripciones] = useState<SuscripcionEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSuscripciones = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('suscripciones_empresa')
        .select(`
          *,
          empresas!inner(nombre, cuit),
          planes_suscripcion!inner(nombre, precio_mensual, limite_usuarios, limite_despachos)
        `)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      setSuscripciones(data || []);
    } catch (err) {
      console.error('Error loading subscriptions:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar suscripciones');
    } finally {
      setLoading(false);
    }
  };

  const cambiarPlanEmpresa = async (empresaId: string, planId: string) => {
    try {
      const { error } = await supabase.rpc('cambiar_plan_empresa', {
        p_empresa_id: empresaId,
        p_plan_id: planId
      });

      if (error) throw error;

      // Recargar suscripciones
      await loadSuscripciones();
    } catch (err) {
      console.error('Error changing plan:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadSuscripciones();
  }, []);

  return { 
    suscripciones, 
    loading, 
    error, 
    cambiarPlanEmpresa,
    refresh: loadSuscripciones 
  };
}