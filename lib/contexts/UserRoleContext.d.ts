/**
 * User Role Context Provider
 * Centralizes user role management and avoids repeated database queries
 */
import React from 'react';
import { UserRole } from '../types';
import type { User } from '@supabase/supabase-js';
interface UserRoleContextType {
    user: User | null;
    roles: UserRole[];
    primaryRole: UserRole | null;
    empresaId: string | null;
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
interface UserRoleProviderProps {
    children: React.ReactNode;
}
export declare function UserRoleProvider({ children }: UserRoleProviderProps): React.JSX.Element;
export declare function useUserRole(): UserRoleContextType;
export declare function withRoleCheck<P extends object>(Component: React.ComponentType<P>, requiredRoles: UserRole[]): (props: P) => React.JSX.Element;
export {};
