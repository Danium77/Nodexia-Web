/**
 * User Role Context Provider
 * Centralizes user role management and avoids repeated database queries
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../supabaseClient';
import { UserRole, ProfileUser } from '../types';
import { shouldRedirectUser, getPrimaryRole } from '../navigation';
import type { User } from '@supabase/supabase-js';

interface UserRoleContextType {
  user: User | null;
  roles: UserRole[];
  primaryRole: UserRole | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const primaryRole = roles.length > 0 ? getPrimaryRole(roles) : null;
  
  // Derived values for backward compatibility
  const email = user?.email || '';
  const name = (user as any)?.user_metadata?.nombre_completo || user?.email?.split('@')[0] || 'Usuario';
  const role = primaryRole || '';

  // Helper functions
  const hasRole = (role: UserRole): boolean => roles.includes(role);
  
  const hasAnyRole = (checkRoles: UserRole[]): boolean => 
    checkRoles.some(role => roles.includes(role));

  const fetchUserAndRoles = async () => {
    try {
      setLoading(true);
      setError(null);

      // First check if we have a session before calling getUser
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setUser(null);
        setRoles([]);
        return;
      }

      // Get current user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError) throw authError;
      
      if (!authUser) {
        setUser(null);
        setRoles([]);
        return;
      }

      setUser(authUser);

      // Get user roles from usuarios_empresa table
      console.log('🔍 [UserRoleContext] Buscando usuario:', authUser.email);
      
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id, nombre_completo')
        .eq('email', authUser.email)
        .single();

      if (usuarioError) {
        console.warn('❌ [UserRoleContext] No user found in usuarios table:', usuarioError.message);
        
        // Fallback to old profile_users structure
        const { data: profileData, error: profileError } = await supabase
          .from('profile_users')
          .select('roles(name)')
          .eq('user_id', authUser.id)
          .single();

        if (profileError) {
          console.warn('No profile found for user, using default role');
          setRoles(['transporte']); // Default role
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
        } else {
          setRoles(['transporte']); // Default fallback
        }
        return;
      }

      // Get role relation separately
      if (usuarioData) {
        console.log('✅ [UserRoleContext] Usuario encontrado:', usuarioData);
        
        const { data: relacionData, error: relacionError } = await supabase
          .from('usuarios_empresa')
          .select('rol_interno')
          .eq('user_id', usuarioData.id)
          .single();

        if (relacionError) {
          console.warn('❌ [UserRoleContext] Sin relación usuario-empresa:', relacionError.message);
        } else if (relacionData) {
          const rolInterno = relacionData.rol_interno;
          console.log('🔍 [UserRoleContext] Rol encontrado:', rolInterno);
          
          let mappedRole: UserRole;
          switch (rolInterno) {
            case 'Super Admin':
              mappedRole = 'admin';
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
              mappedRole = 'chofer' as UserRole;
              break;
            case 'Operador':
              mappedRole = 'transporte';
              break;
            default:
              mappedRole = 'transporte';
          }
          
          console.log('🔄 [UserRoleContext] Mapeo final:', rolInterno, '→', mappedRole);
          setRoles([mappedRole]);
          return; // Exit early on success
        }
      }
      
      console.log('⚠️ [UserRoleContext] Fallback: usando profile_users o default');

    } catch (err) {
      console.error('Error fetching user roles:', err);
      setError(err instanceof Error ? err.message : 'Error loading user data');
      setUser(null);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshRoles = async () => {
    await fetchUserAndRoles();
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setRoles([]);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

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
    fetchUserAndRoles();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setRoles([]);
          router.push('/login');
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchUserAndRoles();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const value: UserRoleContextType = {
    user,
    roles,
    primaryRole,
    email,
    name,
    role,
    loading,
    error,
    hasRole,
    hasAnyRole,
    refreshRoles,
    signOut,
  };

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