import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { 
  UserNetworkContext, 
  TransportistaDisponible, 
  ClienteEmpresa,
  RelacionEmpresa,
  CreateRelacionData,
  NetworkStats
} from '@/types/network';

export function useNetworkContext() {
  const [context, setContext] = useState<UserNetworkContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNetworkContext = async () => {
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

        // Obtener permisos del usuario (versión simplificada)
        let userPermisos = {};
        try {
          const { data: permisos, error: permisosError } = await supabase
            .rpc('get_user_permisos')
            .single();
          
          if (permisosError) {
            console.warn('RPC get_user_permisos no disponible, usando permisos básicos');
            // Fallback: permisos básicos según rol
            userPermisos = {
              ver_dashboard: true,
              gestionar_relaciones: usuarioEmpresa.empresa.tipo_empresa === 'coordinador',
              gestionar_transportistas: usuarioEmpresa.empresa.tipo_empresa === 'coordinador',
              crear_despachos: true,
              gestionar_despachos: true,
              gestionar_usuarios: usuarioEmpresa.rol_interno?.includes('Admin') || usuarioEmpresa.rol_interno?.includes('Coordinador'),
              gestionar_flota: usuarioEmpresa.empresa.tipo_empresa === 'transporte',
              gestionar_choferes: usuarioEmpresa.empresa.tipo_empresa === 'transporte'
            };
          } else {
            userPermisos = permisos || {};
          }
        } catch (err) {
          console.warn('Error obteniendo permisos, usando básicos:', err);
          userPermisos = {
            ver_dashboard: true,
            gestionar_relaciones: usuarioEmpresa.empresa.tipo_empresa === 'coordinador',
            gestionar_transportistas: usuarioEmpresa.empresa.tipo_empresa === 'coordinador',
            crear_despachos: true
          };
        }

        const networkContext: UserNetworkContext = {
          user_id: user.id,
          empresa: usuarioEmpresa.empresa,
          rol_interno: usuarioEmpresa.rol_interno,
          permisos: userPermisos as Record<string, boolean>,
          puede_crear_relaciones: (userPermisos as any).gestionar_relaciones || (userPermisos as any).gestionar_transportistas,
          puede_gestionar_despachos: (userPermisos as any).crear_despachos || (userPermisos as any).gestionar_despachos,
          puede_ver_red: (userPermisos as any).ver_dashboard,
          puede_gestionar_usuarios: (userPermisos as any).gestionar_usuarios,
          puede_gestionar_flota: (userPermisos as any).gestionar_flota || (userPermisos as any).gestionar_choferes
        };

        setContext(networkContext);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar contexto de red');
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
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

      // Fallback: consulta directa si RPC no existe
      const { data, error: queryError } = await supabase
        .from('empresas')
        .select('*')
        .eq('tipo_empresa', 'transporte')
        .eq('activo', true);

      if (queryError) throw queryError;

      // Mapear a formato esperado
      const transportistasData = (data || []).map(empresa => ({
        id: empresa.id,
        nombre: empresa.nombre,
        cuit: empresa.cuit,
        email: empresa.email,
        telefono: empresa.telefono,
        activa: empresa.activo,
        ya_contratado: false // Por ahora asumimos false, se puede mejorar
      }));

      setTransportistas(transportistasData);
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

      console.log('🔍 Ejecutando consulta de relaciones activas...');
      const { data, error: queryError } = await supabase
        .from('relaciones_empresa')
        .select(`
          *,
          empresa_coordinadora:empresas!empresa_coordinadora_id(*),
          empresa_transporte:empresas!empresa_transporte_id(*)
        `)
        .eq('estado', 'activa');
        
      console.log('📊 Resultado query - error:', queryError, 'data count:', data?.length);

      if (queryError) throw queryError;

      console.log('🔄 Relaciones cargadas - Total:', data?.length);
      console.log('🔍 Detalle de relaciones:', data?.map(r => ({
        id: r.id,
        transporte: r.empresa_transporte?.nombre,
        estado: r.estado,
        activo: r.activo,
        fecha_fin: r.fecha_fin
      })));
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
      console.log('🔄 Iniciando creación de relación...', data);
      
      // Obtener el usuario actual y su empresa coordinadora
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('👤 Usuario autenticado:', user ? 'Sí' : 'No', authError);
      
      if (authError) throw authError;
      if (!user) throw new Error('Usuario no autenticado');

      // Obtener la empresa coordinadora del usuario
      console.log('🏢 Buscando empresa del usuario...');
      const { data: usuarioEmpresa, error: userError } = await supabase
        .from('usuarios_empresa')
        .select('empresa_id, empresa:empresas(*)')
        .eq('user_id', user.id)
        .eq('activo', true)
        .single();

      console.log('🏢 Resultado empresa usuario:', usuarioEmpresa, userError);

      if (userError) {
        console.error('❌ Error al buscar empresa:', userError);
        throw userError;
      }
      
      if (!usuarioEmpresa?.empresa) {
        throw new Error('Usuario no está asociado a ninguna empresa');
      }
      
      if ((usuarioEmpresa.empresa as any).tipo_empresa !== 'coordinador') {
        throw new Error(`Usuario pertenece a empresa tipo '${(usuarioEmpresa.empresa as any).tipo_empresa}', se requiere 'coordinador'`);
      }

      console.log('✅ Empresa coordinadora válida:', (usuarioEmpresa.empresa as any).nombre);

      // Verificar que la empresa transporte existe y no hay relación duplicada
      console.log('🚛 Verificando empresa transporte...');
      const { data: empresaTransporte, error: transporteError } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', data.empresa_transporte_id)
        .eq('tipo_empresa', 'transporte')
        .single();

      if (transporteError) {
        console.error('❌ Error al verificar empresa transporte:', transporteError);
        throw new Error('Empresa de transporte no válida');
      }

      console.log('✅ Empresa transporte válida:', empresaTransporte.nombre);

      // Verificar relación existente (activa o finalizada)
      console.log('🔍 Verificando relaciones existentes...', {
        empresa_coordinadora_id: usuarioEmpresa.empresa_id,
        empresa_transporte_id: data.empresa_transporte_id
      });
      
      // Primero verificar si ya hay relación activa
      const { data: relacionActiva, error: checkActivaError } = await supabase
        .from('relaciones_empresa')
        .select('*')
        .eq('empresa_coordinadora_id', usuarioEmpresa.empresa_id)
        .eq('empresa_transporte_id', data.empresa_transporte_id)
        .eq('estado', 'activa')
        .eq('activo', true)
        .maybeSingle();

      if (checkActivaError) {
        console.error('❌ Error al verificar relación activa:', checkActivaError);
        throw checkActivaError;
      }

      if (relacionActiva) {
        console.log('❌ Relación activa encontrada:', relacionActiva.id);
        throw new Error('Ya existe una relación activa con esta empresa de transporte');
      }

      // Verificar si hay relación finalizada que podemos reutilizar
      const { data: relacionFinalizada, error: checkFinalizadaError } = await supabase
        .from('relaciones_empresa')
        .select('*')
        .eq('empresa_coordinadora_id', usuarioEmpresa.empresa_id)
        .eq('empresa_transporte_id', data.empresa_transporte_id)
        .eq('estado', 'finalizada')
        .maybeSingle();

      if (checkFinalizadaError) {
        console.error('❌ Error al verificar relación finalizada:', checkFinalizadaError);
        throw checkFinalizadaError;
      }

      if (relacionFinalizada) {
        // Reutilizar relación existente reactivándola
        console.log('♻️ Reutilizando relación finalizada:', relacionFinalizada.id);
        const { data: relacionReactivada, error: reactivarError } = await supabase
          .from('relaciones_empresa')
          .update({
            estado: 'activa',
            activo: true,
            fecha_inicio: new Date().toISOString().split('T')[0],
            fecha_fin: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', relacionFinalizada.id)
          .select()
          .single();

        if (reactivarError) {
          console.error('❌ Error al reactivar relación:', reactivarError);
          throw reactivarError;
        }

        console.log('✅ Relación reactivada exitosamente');
        return relacionReactivada;
      }

      // Si no hay relaciones existentes, crear nueva
      console.log('📝 Creando nueva relación...');
      const relacionData = {
        empresa_coordinadora_id: usuarioEmpresa.empresa_id,
        empresa_transporte_id: data.empresa_transporte_id,
        estado: 'activa',
        fecha_inicio: new Date().toISOString().split('T')[0],
        activo: true
      };
      
      console.log('📝 Datos de inserción:', relacionData);

      const { data: result, error: insertError } = await supabase
        .from('relaciones_empresa')
        .insert(relacionData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error al insertar relación:', insertError);
        throw insertError;
      }

      console.log('✅ Relación creada exitosamente:', result);

      await loadRelaciones(); // Refrescar lista
      return result;
    } catch (err) {
      console.error('💥 Error completo creating relacion:', err);
      throw err;
    }
  };

  const finalizarRelacion = async (relacionId: string) => {
    try {
      console.log('🔚 Finalizando relación ID:', relacionId);
      console.log('🔚 Tipo de ID:', typeof relacionId, 'Longitud:', relacionId?.length);
      
      // Verificar que la relación existe antes de actualizar
      const { data: existingRelation, error: checkError } = await supabase
        .from('relaciones_empresa')
        .select('id, estado, activo')
        .eq('id', relacionId)
        .single();
        
      console.log('🔍 Relación existente:', existingRelation, 'Error:', checkError);
      
      if (checkError || !existingRelation) {
        throw new Error(`Relación con ID ${relacionId} no encontrada`);
      }
      
      const updateData = { 
        estado: 'finalizada',
        fecha_fin: new Date().toISOString().split('T')[0],
        activo: false
      };
      
      console.log('📝 Datos de actualización:', updateData);
      
      const { data: updateResult, error: updateError } = await supabase
        .from('relaciones_empresa')
        .update(updateData)
        .eq('id', relacionId)
        .select();

      if (updateError) {
        console.error('❌ Error al actualizar relación:', updateError);
        throw updateError;
      }

      console.log('✅ Resultado de actualización:', updateResult);
      
      // Verificar que se actualizó correctamente
      const { data: verification } = await supabase
        .from('relaciones_empresa')
        .select('id, estado, activo, fecha_fin')
        .eq('id', relacionId)
        .single();
        
      console.log('🔍 Verificación post-update:', verification);

      console.log('✅ Relación finalizada correctamente, recargando lista...');
      await loadRelaciones(); // Refrescar lista
    } catch (err) {
      console.error('💥 Error finalizing relacion:', err);
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

      setStats(data as NetworkStats | null);
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