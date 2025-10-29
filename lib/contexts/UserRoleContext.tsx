/**
 * User Role Context Provider
 * Centralizes user role management and avoids repeated database queries
 */

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../supabaseClient';
import { UserRole } from '../types';
import { getPrimaryRole } from '../navigation';
import type { User } from '@supabase/supabase-js';

interface UserRoleContextType {
  user: User | null;
  roles: UserRole[];
  primaryRole: UserRole | null;
  empresaId: string | null; // 🔥 AGREGADO: ID de la empresa del usuario
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
  
  const [empresaId, setEmpresaId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('nodexia_empresaId');
      return cached || null;
    }
    return null;
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

  // 🔥 OPTIMIZADO: useMemo para valores derivados
  const primaryRole = useMemo(() => 
    roles.length > 0 ? getPrimaryRole(roles) : null, 
    [roles]
  );
  
  // Derived values for backward compatibility
  const email = useMemo(() => user?.email || '', [user]);
  const name = useMemo(() => 
    (user as any)?.user_metadata?.nombre_completo || user?.email?.split('@')[0] || 'Usuario',
    [user]
  );
  const role = useMemo(() => primaryRole || '', [primaryRole]);

  // 🔥 PERSISTENCIA: Guardar en localStorage cuando cambien
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('nodexia_user', JSON.stringify(user));
      }
      if (roles.length > 0) {
        localStorage.setItem('nodexia_roles', JSON.stringify(roles));
      }
      if (empresaId) {
        localStorage.setItem('nodexia_empresaId', empresaId);
      }
      if (lastFetch > 0) {
        localStorage.setItem('nodexia_lastFetch', lastFetch.toString());
      }
    }
  }, [user, roles, empresaId, lastFetch]);

  // Debug logging para diagnosticar problemas de roles (SOLO SI HAY CAMBIOS)
  useEffect(() => {
    if (roles.length > 0) {
      console.log('� [UserRoleContext] Primary role calculado:', primaryRole);
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
    // 🔥 GUARD: Si ya hay un fetch en progreso, SALIR inmediatamente
    if (isFetching && !force) {
      console.log('⏸️ [UserRoleContext] Fetch ya en progreso - ignorando solicitud duplicada');
      return;
    }

    // 🔥 Cache AGRESIVO: 5 minutos (300s) - Aumentado para mejor performance
    const now = Date.now();
    const isAdminDemo = user?.email === 'admin.demo@nodexia.com';
    if (!force && !isAdminDemo && lastFetch && (now - lastFetch) < 300000 && user && roles.length > 0) {
      console.log('📦 [UserRoleContext] Usando datos cacheados (5min)');
      return;
    }
    if (isAdminDemo) {
      console.log('👑 [UserRoleContext] Admin demo detectado - ignorando cache');
    }

    try {
      setIsFetching(true); // 🔥 Marcar como "fetching en progreso"
      setLoading(true);
      setError(null);

      // Timeout de seguridad - 5 segundos máximo
      const timeoutId = setTimeout(() => {
        console.warn('⏱️ [UserRoleContext] Timeout 5s - manteniendo estado actual');
        setLoading(false);
        setLastFetch(Date.now());
      }, 5000);

      // First check if we have a session before calling getUser
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        clearTimeout(timeoutId);
        setUser(null);
        setRoles([]);
        setEmpresaId(null);
        setLoading(false);
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
        .maybeSingle(); // Cambiado a maybeSingle para evitar error 406

      if (superAdminError) {
        console.warn('⚠️ Error al verificar super_admin:', superAdminError.message);
      }

      if (superAdminData && superAdminData.activo) {
        setRoles(['super_admin' as UserRole]);
        setEmpresaId(null); // Super admin no tiene empresa específica
        finishFetch(); // Terminar fetch y liberar flags
        return; // IMPORTANTE: Salir aquí y NO seguir buscando otros roles
      }

      // Get user roles from usuarios_empresa table
      
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id, nombre_completo')
        .eq('email', authUser.email)
        .single();

      if (usuarioError) {
        
        // Fallback to old profile_users structure
        const { data: profileData, error: profileError } = await supabase
          .from('profile_users')
          .select('roles(name)')
          .eq('user_id', authUser.id)
          .single();

        if (profileError) {
          console.warn('No profile found for user, using default role');
          setRoles(['coordinador']); // Default role
          setEmpresaId(null);
          finishFetch();
          return;
        }

        if (profileData?.roles) {
          const rolesRaw: any = profileData.roles;
          const userRoles = Array.isArray(rolesRaw)
            ? rolesRaw.map((r: any) => r.name)
            : [rolesRaw.name];
          
          setRoles(userRoles.filter((role: string): role is UserRole => 
            ['admin', 'coordinador', 'transporte'].includes(role)
          ));
          setEmpresaId(null); // Sistema antiguo no tiene empresa_id
        } else {
          setRoles(['coordinador']); // Default fallback
          setEmpresaId(null);
        }
        finishFetch();
        return;
      }

      // Get role relation separately
      if (usuarioData) {
        // Buscar primero con user_id de auth.users (caso de super_admin)
        const { data: relacionData, error: relacionError } = await supabase
          .from('usuarios_empresa')
          .select('rol_interno, empresa_id')
          .eq('user_id', authUser.id) // Usar authUser.id en lugar de usuarioData.id
          .single();

        if (relacionError) {
          // Usar rol por defecto
          setRoles(['coordinador']);
          setEmpresaId(null);
          finishFetch();
          return;
        } else if (relacionData) {
          const rolInterno = relacionData.rol_interno;
          const empresaIdValue = relacionData.empresa_id;
          
          // Guardar empresa_id
          setEmpresaId(empresaIdValue || null);
          
          let mappedRole: UserRole;
          switch (rolInterno) {
            case 'super_admin':
            case 'Super Admin':
              mappedRole = 'super_admin' as UserRole;
              break;
            case 'Control de Acceso':
              mappedRole = 'control_acceso' as UserRole;
              break;
            case 'Supervisor de Carga':
              mappedRole = 'supervisor_carga' as UserRole;
              break;
            case 'Coordinador':
              mappedRole = 'coordinador';
              break;
            case 'Chofer':
              mappedRole = 'chofer';
              break;
            case 'Operador':
            case 'Administrativo':
              mappedRole = 'administrativo';
              break;
            default:
              console.warn('⚠️ Rol desconocido:', rolInterno, '- usando coordinador');
              mappedRole = 'coordinador';
          }
          
          setRoles([mappedRole]);
          finishFetch();
          return; // Exit early on success
        }
      }
      
      setRoles(['coordinador']);
      finishFetch();

    } catch (err) {
      console.error('Error fetching user roles:', err);
      setError(err instanceof Error ? err.message : 'Error loading user data');
      setUser(null);
      setRoles([]);
      finishFetch(false); // Terminar fetch sin actualizar cache en caso de error
    }
  }, [isFetching, user, lastFetch, roles.length, finishFetch]);

  const refreshRoles = useCallback(async () => {
    await fetchUserAndRoles(true); // Forzar recarga
  }, [fetchUserAndRoles]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setRoles([]);
      setEmpresaId(null);
      setLastFetch(0);
      
      // 🔥 Limpiar localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('nodexia_user');
        localStorage.removeItem('nodexia_roles');
        localStorage.removeItem('nodexia_empresaId');
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
    };

    initializeAuth();

    // Listen for auth changes - SOLO eventos críticos
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('🔄 [UserRoleContext] Auth event:', event);
        
        // SOLO reaccionar a SIGNED_OUT y SIGNED_IN
        // Ignorar TOKEN_REFRESHED, USER_UPDATED, etc. para evitar reloads innecesarios
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setRoles([]);
          setEmpresaId(null);
          setLoading(false);
          router.push('/login');
        } else if (event === 'SIGNED_IN' && initialLoadDone) {
          // 🔥 NO recargar si el usuario ya está cargado (evita override duplicado)
          if (session.user.id === user?.id) {
            console.log('⏸️ [UserRoleContext] SIGNED_IN ignorado - usuario ya cargado');
            return;
          }
          // Solo recargar si es un usuario DIFERENTE
          await fetchUserAndRoles();
        } else if (event === 'INITIAL_SESSION') {
          // Manejar sesión inicial - solo si no hay usuario cargado
          console.log('🔄 [UserRoleContext] INITIAL_SESSION detectado');
          if (!user && session) {
            console.log('🔄 [UserRoleContext] Cargando usuario desde sesión inicial');
            await fetchUserAndRoles();
          } else if (user) {
            // Ya hay usuario cargado, solo asegurar que loading esté en false
            console.log('⏸️ [UserRoleContext] Usuario ya cargado, ignorando INITIAL_SESSION');
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
        console.log('👁️ [UserRoleContext] Página visible - verificando sesión');
        // Solo asegurar que loading esté en false si ya hay datos
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
    email,
    name,
    role,
    loading,
    error,
    hasRole,
    hasAnyRole,
    refreshRoles,
    signOut,
  }), [user, roles, primaryRole, empresaId, email, name, role, loading, error, hasRole, hasAnyRole, refreshRoles, signOut]);

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