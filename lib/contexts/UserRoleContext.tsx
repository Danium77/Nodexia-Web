/**
 * User Role Context Provider
 * Centralizes user role management and avoids repeated database queries
 */

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { UserRole } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

/** Determine the highest-priority role from a list */
function getPrimaryRole(roles: string[]): UserRole {
  if (roles.includes('super_admin')) return 'super_admin';
  if (roles.includes('admin_nodexia')) return 'admin_nodexia';
  if (roles.includes('coordinador_integral')) return 'coordinador_integral' as UserRole;
  if (roles.includes('coordinador')) return 'coordinador';
  if (roles.includes('control_acceso')) return 'control_acceso';
  if (roles.includes('supervisor')) return 'supervisor';
  if (roles.includes('chofer')) return 'chofer';
  if (roles.includes('administrativo')) return 'administrativo';
  if (roles.includes('vendedor')) return 'vendedor' as UserRole;
  if (roles.includes('visor')) return 'visor';
  return 'coordinador';
}

interface UserRoleContextType {
  user: User | null;
  roles: UserRole[];
  primaryRole: UserRole | null;
  empresaId: string | null;
  empresaNombre: string | null;
  cuitEmpresa: string | null;
  tipoEmpresa: string | null;
  userEmpresas: any[];
  email: string;
  name: string;
  role: string;
  loading: boolean;
  error: string | null;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  refreshRoles: () => Promise<void>;
  signOut: () => Promise<void>;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

interface UserRoleProviderProps {
  children: React.ReactNode;
}

export function UserRoleProvider({ children }: UserRoleProviderProps) {
  const router = useRouter();
  
  // 🔥 OPTIMIZACIÓN: Cargar desde localStorage primero (para cambios de app)
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('nodexia_user');
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  
  const [roles, setRoles] = useState<UserRole[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('nodexia_roles');
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  });
  
  const [cuitEmpresa, setCuitEmpresa] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nodexia_cuitEmpresa') || null;
    }
    return null;
  });

  const [empresaId, setEmpresaId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('nodexia_empresaId');
      return cached || null;
    }
    return null;
  });
  
  const [tipoEmpresa, setTipoEmpresa] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('nodexia_tipoEmpresa');
      return cached || null;
    }
    return null;
  });
  
  const [userEmpresas, setUserEmpresas] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('nodexia_userEmpresas');
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('nodexia_lastFetch');
      return cached ? parseInt(cached) : 0;
    }
    return 0;
  });
  const [isFetching, setIsFetching] = useState<boolean>(false); // 🔥 Evita race conditions
  const initializedRef = useRef<boolean>(false); // 🔥 Track si ya se inicializó

  // 🔥 OPTIMIZADO: useMemo para valores derivados
  const primaryRole = useMemo(() => {
    return roles.length > 0 ? getPrimaryRole(roles) : null;
  }, [roles]);
  
  // Derived values for backward compatibility
  const email = useMemo(() => user?.email || '', [user]);
  const name = useMemo(() => {
    // Prioridad: nombre_completo de usuarios_empresa > user_metadata > email
    if (userEmpresas?.length > 0 && userEmpresas[0]?.nombre_completo) {
      return userEmpresas[0].nombre_completo;
    }
    return (user as any)?.user_metadata?.nombre_completo || user?.email || 'Usuario';
  }, [user, userEmpresas]);
  const role = useMemo(() => primaryRole || '', [primaryRole]);

  // Nombre de la empresa principal del usuario
  const empresaNombre = useMemo(() => {
    if (userEmpresas?.length > 0) {
      return (userEmpresas[0]?.empresas as any)?.nombre || null;
    }
    return null;
  }, [userEmpresas]);

  // 🔥 PERSISTENCIA: Guardar en localStorage cuando cambien
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('nodexia_user', JSON.stringify(user));
      }
      if (roles.length > 0) {
        localStorage.setItem('nodexia_roles', JSON.stringify(roles));
      }
      if (cuitEmpresa) {
        localStorage.setItem('nodexia_cuitEmpresa', cuitEmpresa);
      }
      if (empresaId) {
        localStorage.setItem('nodexia_empresaId', empresaId);
      }
      if (tipoEmpresa) {
        localStorage.setItem('nodexia_tipoEmpresa', tipoEmpresa);
      }
      if (userEmpresas.length > 0) {
        localStorage.setItem('nodexia_userEmpresas', JSON.stringify(userEmpresas));
      }
      if (lastFetch > 0) {
        localStorage.setItem('nodexia_lastFetch', lastFetch.toString());
      }
    }
  }, [user, roles, empresaId, tipoEmpresa, userEmpresas, lastFetch]);

  // Primary role tracking (solo desarrollo)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && roles.length > 0) {
      console.log('[UserRoleContext] Primary role:', primaryRole);
    }
  }, [primaryRole]);

  // 🔥 Helper para terminar fetch y liberar flags
  const finishFetch = useCallback((updateCache = true) => {
    setLoading(false);
    setIsFetching(false);
    if (updateCache) {
      const now = Date.now();
      setLastFetch(now);
      // localStorage se actualiza automáticamente por el useEffect
    }
  }, []);

  // 🔥 OPTIMIZADO: Helper functions con useCallback
  const hasRole = useCallback((role: UserRole): boolean => 
    roles.includes(role), 
    [roles]
  );
  
  const hasAnyRole = useCallback((checkRoles: UserRole[]): boolean => 
    checkRoles.some(role => roles.includes(role)),
    [roles]
  );

  const fetchUserAndRoles = useCallback(async (force = false) => {
    // GUARD: Si ya hay un fetch en progreso, SALIR inmediatamente
    if (isFetching && !force) {
      return;
    }

    // Cache AGRESIVO: 5 minutos (300s)
    const now = Date.now();
    const isAdminDemo = user?.email === 'admin.demo@nodexia.com';
    if (!force && !isAdminDemo && lastFetch && (now - lastFetch) < 300000 && user && roles.length > 0) {
      setLoading(false);
      setIsFetching(false);
      return;
    }

    try {
      setIsFetching(true); // 🔥 Marcar como "fetching en progreso"
      setLoading(true);
      setError(null);

      // Timeout de seguridad - 10 segundos máximo
      const timeoutId = setTimeout(() => {
        console.warn('[UserRoleContext] Timeout - manteniendo estado actual');
        setLoading(false);
        setLastFetch(Date.now());
      }, 10000);

      // First check if we have a session before calling getUser
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        clearTimeout(timeoutId);
        setUser(null);
        setRoles([]);
        setEmpresaId(null);
        setLoading(false);
        
        // Redirigir al login si no estamos en rutas públicas
        const publicRoutes = ['/login', '/signup', '/'];
        if (typeof window !== 'undefined' && !publicRoutes.includes(router.pathname)) {
          console.log('[UserRoleContext] No session - redirecting to login');
          router.push('/login');
        }
        return;
      }

      // Get current user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        clearTimeout(timeoutId);
        throw authError;
      }
      
      if (!authUser) {
        clearTimeout(timeoutId);
        setUser(null);
        setRoles([]);
        setEmpresaId(null);
        finishFetch(false); // No actualizar cache si no hay user
        return;
      }

      setUser(authUser);
      
      // Limpiar timeout si llegamos hasta aquí
      clearTimeout(timeoutId);

      // PRIMERO: Verificar si es Super Admin en tabla super_admins
      const { data: superAdminData, error: superAdminError } = await supabase
        .from('super_admins')
        .select('activo')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (superAdminError) {
        console.warn('[UserRoleContext] Error verificando super_admin:', superAdminError.message);
      }

      if (superAdminData && superAdminData.activo === true) {
        setRoles(['super_admin' as UserRole]);
        setEmpresaId(null);
        // Cargar datos de empresa/nombre para super_admins (display)
        const { data: saEmpresas } = await supabase
          .from('usuarios_empresa')
          .select('nombre_completo, empresa_id, rol_interno, empresas(id, nombre, tipo_empresa, cuit)')
          .eq('user_id', authUser.id)
          .eq('activo', true);
        if (saEmpresas && saEmpresas.length > 0) {
          setUserEmpresas(saEmpresas);
        } else {
          setUserEmpresas([]);
        }
        finishFetch();
        return;
      }

      // Buscar datos de usuario en usuarios_empresa con JOIN a empresas
      
      const { data: relacionData, error: relacionError } = await supabase
        .from('usuarios_empresa')
        .select(`
          rol_interno, 
          empresa_id,
          nombre_completo,
          empresas (
            id,
            nombre,
            tipo_empresa,
            cuit
          )
        `)
        .eq('user_id', authUser.id)
        .eq('activo', true)
        .single();

      if (relacionError || !relacionData) {
          // Buscar múltiples empresas (usuario puede tener varios vínculos)
          const { data: multiRelacionData, error: multiError } = await supabase
            .from('usuarios_empresa')
            .select(`
              rol_interno, 
              empresa_id,
              nombre_completo,
              empresas (
                id,
                nombre,
                tipo_empresa,
                cuit
              )
            `)
            .eq('user_id', authUser.id)
            .eq('activo', true);

          if (multiError || !multiRelacionData || multiRelacionData.length === 0) {
            setRoles(['coordinador']);
            setEmpresaId(null);
            setTipoEmpresa(null);
            setCuitEmpresa(null);
            setUserEmpresas([]);
            finishFetch();
            return;
          }

          // Usuario con múltiples empresas - priorizar admin_nodexia si existe
          const rolPriority = ['admin_nodexia', 'super_admin', 'coordinador_integral', 'coordinador', 'supervisor', 'control_acceso', 'chofer', 'administrativo', 'vendedor', 'visor'];
          const sorted = [...multiRelacionData].sort((a, b) => {
            const ia = rolPriority.indexOf(a.rol_interno);
            const ib = rolPriority.indexOf(b.rol_interno);
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
          });
          setUserEmpresas(sorted);
          const primeraRelacion = sorted[0];
          
          if (!primeraRelacion) {
            setLoading(false);
            return;
          }
          
          const rolInterno = primeraRelacion.rol_interno;
          const empresaIdValue = primeraRelacion.empresa_id;
          const tipoEmpresaValue = (primeraRelacion.empresas as any)?.tipo_empresa;
          const cuitEmpresaValue = (primeraRelacion.empresas as any)?.cuit || null;

          setEmpresaId(empresaIdValue || null);
          setTipoEmpresa(tipoEmpresaValue || null);
          setCuitEmpresa(cuitEmpresaValue);
          
          // Continuar con mapeo de rol...
          let mappedRole: UserRole;
          switch (rolInterno) {
            case 'admin_nodexia':
            case 'Super Admin':
            case 'super_admin':  // Legacy
              mappedRole = 'admin_nodexia' as UserRole;
              break;
            case 'control_acceso':
            case 'Control de Acceso':
              mappedRole = 'control_acceso' as UserRole;
              break;
            case 'supervisor':
            case 'Supervisor':
            case 'Supervisor de Carga':  // Legacy
            case 'supervisor_carga':     // Legacy DB value
              mappedRole = 'supervisor' as UserRole;
              break;
            case 'coordinador':
            case 'Coordinador':
            case 'Coordinador de Transporte':  // Legacy
            case 'coordinador_transporte':     // Legacy DB value
              mappedRole = 'coordinador';
              break;
            case 'chofer':
            case 'Chofer':
              mappedRole = 'chofer';
              break;
            case 'administrativo':
            case 'Operador':
            case 'Administrativo':
              mappedRole = 'administrativo';
              break;
            case 'coordinador_integral':
            case 'Coordinador Integral':
              mappedRole = 'coordinador_integral' as UserRole;
              break;
            case 'vendedor':
            case 'Vendedor':
              mappedRole = 'vendedor' as UserRole;
              break;
            case 'visor':
              mappedRole = 'visor';
              break;
            default:
              console.warn('⚠️ Rol desconocido:', rolInterno, '- usando coordinador');
              mappedRole = 'coordinador';
          }
          
          setRoles([mappedRole]);
          finishFetch();
          return; // Exit early on success
        } else {
          // relacionData existe - usuario con una única empresa
          setUserEmpresas([relacionData]);
          const rolInterno = relacionData.rol_interno;
          const empresaIdValue = relacionData.empresa_id;
          const tipoEmpresaValue = (relacionData.empresas as any)?.tipo_empresa;
          const cuitEmpresaValue = (relacionData.empresas as any)?.cuit || null;

          setEmpresaId(empresaIdValue || null);
          setTipoEmpresa(tipoEmpresaValue || null);
          setCuitEmpresa(cuitEmpresaValue);
          
          // Mapeo de rol
          let mappedRole: UserRole;
          switch (rolInterno) {
            case 'admin_nodexia':
            case 'Super Admin':
            case 'super_admin':  // Legacy
              mappedRole = 'admin_nodexia' as UserRole;
              break;
            case 'control_acceso':
            case 'Control de Acceso':
              mappedRole = 'control_acceso' as UserRole;
              break;
            case 'supervisor':
            case 'Supervisor':
            case 'Supervisor de Carga':  // Legacy
            case 'supervisor_carga':     // Legacy DB value
              mappedRole = 'supervisor' as UserRole;
              break;
            case 'coordinador':
            case 'Coordinador':
            case 'Coordinador de Transporte':  // Legacy
            case 'coordinador_transporte':     // Legacy DB value
              mappedRole = 'coordinador';
              break;
            case 'chofer':
            case 'Chofer':
              mappedRole = 'chofer';
              break;
            case 'administrativo':
            case 'Operador':
            case 'Administrativo':
              mappedRole = 'administrativo';
              break;
            case 'coordinador_integral':
            case 'Coordinador Integral':
              mappedRole = 'coordinador_integral' as UserRole;
              break;
            case 'vendedor':
            case 'Vendedor':
              mappedRole = 'vendedor' as UserRole;
              break;
            case 'visor':
              mappedRole = 'visor';
              break;
            default:
              console.warn('⚠️ Rol desconocido:', rolInterno, '- usando coordinador');
              mappedRole = 'coordinador';
          }
          
          setRoles([mappedRole]);
          finishFetch();
          return;
        }

    } catch (err) {
      console.error('Error fetching user roles:', err);
      setError(err instanceof Error ? err.message : 'Error loading user data');
      setUser(null);
      setRoles([]);
      finishFetch(false); // Terminar fetch sin actualizar cache en caso de error
    }
  }, [isFetching, user, lastFetch, roles.length, finishFetch, router]);

  const refreshRoles = useCallback(async () => {
    await fetchUserAndRoles(true); // Forzar recarga
  }, [fetchUserAndRoles]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setRoles([]);
      setEmpresaId(null);
      setCuitEmpresa(null);
      setTipoEmpresa(null);
      setUserEmpresas([]);
      setLastFetch(0);
      
      // 🔥 Limpiar localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('nodexia_user');
        localStorage.removeItem('nodexia_roles');
        localStorage.removeItem('nodexia_empresaId');
        localStorage.removeItem('nodexia_cuitEmpresa');
        localStorage.removeItem('nodexia_tipoEmpresa');
        localStorage.removeItem('nodexia_userEmpresas');
        localStorage.removeItem('nodexia_lastFetch');
      }
      
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [router]);

  // Auto-redirect based on user roles and current path
  // TEMPORARILY DISABLED to fix infinite reload loop
  // useEffect(() => {
  //   if (!loading && user) {
  //     const redirect = shouldRedirectUser(router.pathname, roles, loading);
  //     if (redirect.shouldRedirect && redirect.redirectTo) {
  //       router.push(redirect.redirectTo);
  //     }
  //   }
  // }, [router.pathname, roles, loading, user]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    let initialLoadDone = false;

    const initializeAuth = async () => {
      if (!mounted) return;
      await fetchUserAndRoles();
      initialLoadDone = true;
      initializedRef.current = true; // 🔥 Marcar como inicializado
    };

    initializeAuth();

    // Listen for auth changes - SOLO eventos críticos
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        // SOLO reaccionar a SIGNED_OUT y SIGNED_IN
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setRoles([]);
          setEmpresaId(null);
          setCuitEmpresa(null);
          setTipoEmpresa(null);
          setUserEmpresas([]);
          setLastFetch(0);
          // Limpiar localStorage para evitar datos stale del usuario anterior
          if (typeof window !== 'undefined') {
            localStorage.removeItem('nodexia_user');
            localStorage.removeItem('nodexia_roles');
            localStorage.removeItem('nodexia_empresaId');
            localStorage.removeItem('nodexia_cuitEmpresa');
            localStorage.removeItem('nodexia_tipoEmpresa');
            localStorage.removeItem('nodexia_userEmpresas');
            localStorage.removeItem('nodexia_lastFetch');
          }
          setLoading(false);
          router.push('/login');
        } else if (event === 'SIGNED_IN') {
          // Detectar cambio de usuario: limpiar cache si el user ID cambió
          const cachedUserId = typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('nodexia_user') || '{}')?.id
            : null;
          if (cachedUserId && session.user.id !== cachedUserId) {
            // Nuevo usuario diferente al cacheado: limpiar todo
            localStorage.removeItem('nodexia_user');
            localStorage.removeItem('nodexia_roles');
            localStorage.removeItem('nodexia_empresaId');
            localStorage.removeItem('nodexia_cuitEmpresa');
            localStorage.removeItem('nodexia_tipoEmpresa');
            localStorage.removeItem('nodexia_userEmpresas');
            localStorage.removeItem('nodexia_lastFetch');
            setLastFetch(0);
            setRoles([]);
          }
          // 🔥 NO recargar si ya se inicializó con el mismo usuario
          if (initializedRef.current && user?.id && session.user.id === user?.id) {
            setLoading(false);
            setIsFetching(false);
            return;
          }
          if (session.user.id !== user?.id) {
            await fetchUserAndRoles();
            initializedRef.current = true;
          }
        } else if (event === 'INITIAL_SESSION') {
          if (initialLoadDone) {
            setLoading(false);
            setIsFetching(false);
            return;
          }
          if (!user && session) {
            await fetchUserAndRoles();
          } else if (user) {
            setLoading(false);
            setIsFetching(false);
          }
        }
        // ELIMINADO: bloque TOKEN_REFRESHED - no hacer nada para evitar reloads
      }
    );

    // 🔥 Listener para cuando la página se vuelve visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && roles.length > 0) {
        setLoading(false);
        setIsFetching(false);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, []);

  // 🔥 OPTIMIZADO: useMemo para el value del context
  const value: UserRoleContextType = useMemo(() => ({
    user,
    roles,
    primaryRole,
    empresaId,
    empresaNombre,
    cuitEmpresa,
    tipoEmpresa,
    userEmpresas,
    email,
    name,
    role,
    loading,
    error,
    hasRole,
    hasAnyRole,
    refreshRoles,
    signOut,
  }), [user, roles, primaryRole, empresaId, empresaNombre, cuitEmpresa, tipoEmpresa, userEmpresas, email, name, role, loading, error, hasRole, hasAnyRole, refreshRoles, signOut]);

  return (
    <UserRoleContext.Provider value={value}>
      {children}
    </UserRoleContext.Provider>
  );
}

// Custom hook to use the context
export function useUserRole(): UserRoleContextType {
  const context = useContext(UserRoleContext);
  if (context === undefined) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
}

// HOC for components that need role checking
export function withRoleCheck<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles: UserRole[]
) {
  return function WrappedComponent(props: P) {
    const { hasAnyRole, loading } = useUserRole();
    
    if (loading) {
      return <div>Loading...</div>;
    }
    
    if (!hasAnyRole(requiredRoles)) {
      return <div>Access denied. Required roles: {requiredRoles.join(', ')}</div>;
    }
    
    return <Component {...props} />;
  };
}