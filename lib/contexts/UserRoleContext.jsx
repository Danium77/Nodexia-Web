/**
 * User Role Context Provider
 * Centralizes user role management and avoids repeated database queries
 */
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../supabaseClient';
import { getPrimaryRole } from '../navigation';
const UserRoleContext = createContext(undefined);
export function UserRoleProvider({ children }) {
    const router = useRouter();
    // 🔥 OPTIMIZACIÓN: Cargar desde localStorage primero (para cambios de app)
    const [user, setUser] = useState(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('nodexia_user');
            return cached ? JSON.parse(cached) : null;
        }
        return null;
    });
    const [roles, setRoles] = useState(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('nodexia_roles');
            return cached ? JSON.parse(cached) : [];
        }
        return [];
    });
    const [empresaId, setEmpresaId] = useState(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('nodexia_empresaId');
            return cached || null;
        }
        return null;
    });
    const [tipoEmpresa, setTipoEmpresa] = useState(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('nodexia_tipoEmpresa');
            return cached || null;
        }
        return null;
    });
    const [userEmpresas, setUserEmpresas] = useState(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('nodexia_userEmpresas');
            return cached ? JSON.parse(cached) : [];
        }
        return [];
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastFetch, setLastFetch] = useState(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('nodexia_lastFetch');
            return cached ? parseInt(cached) : 0;
        }
        return 0;
    });
    const [isFetching, setIsFetching] = useState(false); // 🔥 Evita race conditions
    const initializedRef = useRef(false); // 🔥 Track si ya se inicializó
    // 🔥 OPTIMIZADO: useMemo para valores derivados
    const primaryRole = useMemo(() => {
        return roles.length > 0 ? getPrimaryRole(roles) : null;
    }, [roles]);
    // Derived values for backward compatibility
    const email = useMemo(() => user?.email || '', [user]);
    const name = useMemo(() => user?.user_metadata?.nombre_completo || user?.email?.split('@')[0] || 'Usuario', [user]);
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
    const hasRole = useCallback((role) => roles.includes(role), [roles]);
    const hasAnyRole = useCallback((checkRoles) => checkRoles.some(role => roles.includes(role)), [roles]);
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
            // Asegurar que loading esté en false
            setLoading(false);
            setIsFetching(false);
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
                setRoles(['super_admin']);
                setEmpresaId(null); // Super admin no tiene empresa específica
                finishFetch(); // Terminar fetch y liberar flags
                return; // IMPORTANTE: Salir aquí y NO seguir buscando otros roles
            }
            // 🔥 ACTUALIZADO: Buscar directamente en usuarios_empresa con JOIN a empresas
            console.log('🔍 [UserRoleContext] Buscando datos de usuario en usuarios_empresa...');
            console.log('   User ID:', authUser.id);
            console.log('   Email:', authUser.email);
            const { data: relacionData, error: relacionError } = await supabase
                .from('usuarios_empresa')
                .select(`
          rol_interno, 
          empresa_id,
          empresas (
            id,
            nombre,
            tipo_empresa
          )
        `)
                .eq('user_id', authUser.id)
                .single();
            console.log('📊 [UserRoleContext] Query result:', { relacionData, relacionError });
            if (relacionError || !relacionData) {
                console.warn('⚠️ [UserRoleContext] No se encontró relación única, buscando múltiples...');
                console.warn('   Error:', relacionError?.message);
                // Buscar múltiples empresas (usuario puede tener varios vínculos)
                const { data: multiRelacionData, error: multiError } = await supabase
                    .from('usuarios_empresa')
                    .select(`
              rol_interno, 
              empresa_id,
              empresas (
                id,
                nombre,
                tipo_empresa
              )
            `)
                    .eq('user_id', authUser.id);
                console.log('📊 [UserRoleContext] Multi-empresa result:', { multiRelacionData, multiError });
                if (multiError || !multiRelacionData || multiRelacionData.length === 0) {
                    // Usuario sin empresas asignadas - usar rol por defecto
                    console.warn('⚠️ Usuario sin empresas asignadas');
                    setRoles(['coordinador']);
                    setEmpresaId(null);
                    setTipoEmpresa(null);
                    setUserEmpresas([]);
                    finishFetch();
                    return;
                }
                // Usuario con múltiples empresas - usar la primera como principal
                setUserEmpresas(multiRelacionData);
                const primeraRelacion = multiRelacionData[0];
                if (!primeraRelacion) {
                    console.error('❌ No hay relación empresarial disponible');
                    setLoading(false);
                    return;
                }
                const rolInterno = primeraRelacion.rol_interno;
                const empresaIdValue = primeraRelacion.empresa_id;
                const tipoEmpresaValue = primeraRelacion.empresas?.tipo_empresa;
                console.log('🔍 [UserRoleContext] Datos cargados:');
                console.log('   - rol_interno:', rolInterno);
                console.log('   - tipo_empresa:', tipoEmpresaValue);
                console.log('   - empresa_id:', empresaIdValue);
                setEmpresaId(empresaIdValue || null);
                setTipoEmpresa(tipoEmpresaValue || null);
                // Continuar con mapeo de rol...
                let mappedRole;
                switch (rolInterno) {
                    case 'admin_nodexia':
                    case 'Super Admin':
                    case 'super_admin': // Legacy
                        mappedRole = 'admin_nodexia';
                        break;
                    case 'control_acceso':
                    case 'Control de Acceso':
                        mappedRole = 'control_acceso';
                        break;
                    case 'supervisor':
                    case 'Supervisor':
                    case 'Supervisor de Carga': // Legacy
                    case 'supervisor_carga': // Legacy DB value
                        mappedRole = 'supervisor';
                        break;
                    case 'coordinador':
                    case 'Coordinador':
                    case 'Coordinador de Transporte': // Legacy
                    case 'coordinador_transporte': // Legacy DB value
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
            }
            else {
                // relacionData existe - usuario con una única empresa
                setUserEmpresas([relacionData]);
                const rolInterno = relacionData.rol_interno;
                const empresaIdValue = relacionData.empresa_id;
                const tipoEmpresaValue = relacionData.empresas?.tipo_empresa;
                setEmpresaId(empresaIdValue || null);
                setTipoEmpresa(tipoEmpresaValue || null);
                // Mapeo de rol
                let mappedRole;
                switch (rolInterno) {
                    case 'admin_nodexia':
                    case 'Super Admin':
                    case 'super_admin': // Legacy
                        mappedRole = 'admin_nodexia';
                        break;
                    case 'control_acceso':
                    case 'Control de Acceso':
                        mappedRole = 'control_acceso';
                        break;
                    case 'supervisor':
                    case 'Supervisor':
                    case 'Supervisor de Carga': // Legacy
                    case 'supervisor_carga': // Legacy DB value
                        mappedRole = 'supervisor';
                        break;
                    case 'coordinador':
                    case 'Coordinador':
                    case 'Coordinador de Transporte': // Legacy
                    case 'coordinador_transporte': // Legacy DB value
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
                    case 'visor':
                        mappedRole = 'visor';
                        break;
                    default:
                        console.warn('⚠️ Rol desconocido:', rolInterno, '- usando coordinador');
                        mappedRole = 'coordinador';
                }
                console.log(`✅ [UserRoleContext] Datos cargados:`);
                console.log(`   - Rol interno DB: ${rolInterno}`);
                console.log(`   - Rol mapeado: ${mappedRole}`);
                console.log(`   - Tipo Empresa: ${tipoEmpresaValue}`);
                console.log(`   - Empresa ID: ${empresaIdValue}`);
                console.log(`   - Empresa: ${relacionData.empresas?.nombre}`);
                setRoles([mappedRole]);
                finishFetch();
                return;
            }
        }
        catch (err) {
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
            setTipoEmpresa(null);
            setUserEmpresas([]);
            setLastFetch(0);
            // 🔥 Limpiar localStorage
            if (typeof window !== 'undefined') {
                localStorage.removeItem('nodexia_user');
                localStorage.removeItem('nodexia_roles');
                localStorage.removeItem('nodexia_empresaId');
                localStorage.removeItem('nodexia_tipoEmpresa');
                localStorage.removeItem('nodexia_userEmpresas');
                localStorage.removeItem('nodexia_lastFetch');
            }
            router.push('/login');
        }
        catch (error) {
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
            if (!mounted)
                return;
            await fetchUserAndRoles();
            initialLoadDone = true;
            initializedRef.current = true; // 🔥 Marcar como inicializado
        };
        initializeAuth();
        // Listen for auth changes - SOLO eventos críticos
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted)
                return;
            console.log('🔄 [UserRoleContext] Auth event:', event);
            // SOLO reaccionar a SIGNED_OUT y SIGNED_IN
            // Ignorar TOKEN_REFRESHED, USER_UPDATED, etc. para evitar reloads innecesarios
            if (event === 'SIGNED_OUT' || !session) {
                setUser(null);
                setRoles([]);
                setEmpresaId(null);
                setLoading(false);
                router.push('/login');
            }
            else if (event === 'SIGNED_IN') {
                // 🔥 NO recargar si ya se inicializó (prevenir loops infinitos)
                if (initializedRef.current && user?.id && session.user.id === user?.id) {
                    console.log('⏸️ [UserRoleContext] SIGNED_IN ignorado - ya inicializado');
                    setLoading(false);
                    setIsFetching(false);
                    return;
                }
                // Solo recargar si es un usuario DIFERENTE
                if (session.user.id !== user?.id) {
                    console.log('🔄 [UserRoleContext] Nuevo usuario detectado en SIGNED_IN');
                    await fetchUserAndRoles();
                    initializedRef.current = true;
                }
            }
            else if (event === 'INITIAL_SESSION') {
                // Manejar sesión inicial - solo si no hay usuario cargado
                console.log('🔄 [UserRoleContext] INITIAL_SESSION detectado');
                // Si ya pasó la inicialización inicial, ignorar este evento
                if (initialLoadDone) {
                    console.log('⏸️ [UserRoleContext] INITIAL_SESSION ignorado - inicialización ya completada');
                    setLoading(false);
                    setIsFetching(false);
                    return;
                }
                if (!user && session) {
                    console.log('🔄 [UserRoleContext] Cargando usuario desde sesión inicial');
                    await fetchUserAndRoles();
                }
                else if (user) {
                    // Ya hay usuario cargado, solo asegurar que loading esté en false
                    console.log('⏸️ [UserRoleContext] Usuario ya cargado, ignorando INITIAL_SESSION');
                    setLoading(false);
                    setIsFetching(false);
                }
            }
            // ELIMINADO: bloque TOKEN_REFRESHED - no hacer nada para evitar reloads
        });
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
    const value = useMemo(() => ({
        user,
        roles,
        primaryRole,
        empresaId,
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
    }), [user, roles, primaryRole, empresaId, tipoEmpresa, userEmpresas, email, name, role, loading, error, hasRole, hasAnyRole, refreshRoles, signOut]);
    return (<UserRoleContext.Provider value={value}>
      {children}
    </UserRoleContext.Provider>);
}
// Custom hook to use the context
export function useUserRole() {
    const context = useContext(UserRoleContext);
    if (context === undefined) {
        throw new Error('useUserRole must be used within a UserRoleProvider');
    }
    return context;
}
// HOC for components that need role checking
export function withRoleCheck(Component, requiredRoles) {
    return function WrappedComponent(props) {
        const { hasAnyRole, loading } = useUserRole();
        if (loading) {
            return <div>Loading...</div>;
        }
        if (!hasAnyRole(requiredRoles)) {
            return <div>Access denied. Required roles: {requiredRoles.join(', ')}</div>;
        }
        return <Component {...props}/>;
    };
}
