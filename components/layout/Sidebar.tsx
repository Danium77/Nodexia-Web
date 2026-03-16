// components/Layout/Sidebar.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HomeIcon, CalendarDaysIcon, TruckIcon, ChartBarIcon, Cog6ToothIcon, ArrowLeftOnRectangleIcon, UserCircleIcon, BuildingOfficeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { useUserRole } from '@/lib/contexts/UserRoleContext';
import { NodexiaLogoBadge } from '@/components/ui/NodexiaLogo';
import { useDocAlerts } from '@/lib/hooks/useDocAlerts';

interface SidebarProps {
  userEmail?: string;
  userName?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ userEmail, userName }) => {
  const router = useRouter();
  const { email, name, primaryRole, loading, tipoEmpresa, userEmpresas } = useUserRole();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manejar hidratación del lado cliente
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (collapseTimer.current) clearTimeout(collapseTimer.current); };
  }, []);

  // Expand immediately, collapse with delay to prevent click-stealing
  const handleMouseEnter = useCallback(() => {
    if (collapseTimer.current) { clearTimeout(collapseTimer.current); collapseTimer.current = null; }
    setIsCollapsed(false);
  }, []);
  const handleMouseLeave = useCallback(() => {
    collapseTimer.current = setTimeout(() => setIsCollapsed(true), 300);
  }, []);

  // Alertas de documentación para roles de transporte
  const { badgeCount: docAlertBadge } = useDocAlerts(10 * 60 * 1000); // refresh cada 10 min

  // allow override via props (some pages pass them)
  const finalEmail = userEmail || email;
  const finalUserName = userName || name;
  
  // Derivar nombre+apellido desde usuarios_empresa o user_metadata
  const displayUserName = useMemo(() => {
    // Primero intentar nombre_completo de usuarios_empresa
    if (userEmpresas?.length > 0 && userEmpresas[0]?.nombre_completo) {
      return userEmpresas[0].nombre_completo;
    }
    // Fallback a name del contexto (user_metadata o email)
    return finalUserName || finalEmail?.split('@')[0] || 'Usuario';
  }, [userEmpresas, finalUserName, finalEmail]);
  
  // Verificación alternativa para coordinador basada en email (backup)
  const isCoordinadorByEmail = finalEmail === 'coord_demo@example.com' || finalEmail === 'coordinador.demo@nodexia.com';

  // Usar primaryRole consistentemente
  const userRole = primaryRole;

  // Mostrar sidebar de carga si no está hidratado o si está cargando
  if (!isHydrated || loading) {
    return (
      <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-[#1b273b] pt-0 pb-6 flex flex-col shadow-lg text-slate-100 min-h-screen transition-all duration-300`}>
        <div className="text-center mb-4 transform -translate-y-6 mx-auto" style={{ width: 'fit-content' }}>
          {!isCollapsed && (
            <>
              <Image 
                src="/logo X gruesa.png" 
                alt="Nodexia Logo" 
                width={100} 
                height={100} 
                className="mx-auto block -mb-8" 
              />
              <span className="text-xl font-bold text-white block">NODEXIA</span>
            </>
          )}
          {isCollapsed && (
            <Image 
              src="/logo X gruesa.png" 
              alt="Nodexia Logo" 
              width={50} 
              height={50} 
              className="mx-auto block" 
            />
          )}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-400">{isCollapsed ? '...' : 'Cargando...'}</div>
        </div>
      </aside>
    );
  }

  // Definir los ítems según el rol
  let navItems: Array<{ name: string; icon: any; href: string; badge?: number | string; highlighted?: boolean }> = [
    { name: 'Inicio', icon: HomeIcon, href: '/dashboard' },
  ];
  
  if (userRole === 'super_admin') {
    // Super Admin de Nodexia - Panel exclusivo
    navItems = [
      { name: '👑 Administrador del panel', icon: HomeIcon, href: '/admin/super-admin-dashboard' },
      { name: '🏢 Empresas', icon: Cog6ToothIcon, href: '/admin/empresas' },
      { name: '💎 Ubicaciones', icon: Cog6ToothIcon, href: '/admin/ubicaciones' },
      { name: '👥 Usuarios', icon: UserCircleIcon, href: '/admin/usuarios' },
      { name: '📋 Solicitudes', icon: ChartBarIcon, href: '/admin/solicitudes' },
      { name: '✅ Validar Documentos', icon: ChartBarIcon, href: '/admin/validacion-documentos' },
      { name: '💳 Suscripciones', icon: ChartBarIcon, href: '/admin/suscripciones' },
      { name: '📊 Analíticas', icon: ChartBarIcon, href: '/admin/analiticas' },
      { name: '🌐 Red Nodexia', icon: Cog6ToothIcon, href: '/admin/red-nodexia' },
      { name: '⚠️ Incidencias', icon: ExclamationTriangleIcon, href: '/incidencias' },
    ];
  } else if (userRole === 'admin_nodexia') {
    // Admin Nodexia - Panel completo igual que super_admin
    navItems = [
      { name: '👑 Admin Nodexia', icon: HomeIcon, href: '/admin/super-admin-dashboard' },
      { name: '🏢 Empresas', icon: BuildingOfficeIcon, href: '/admin/empresas' },
      { name: '💎 Ubicaciones', icon: Cog6ToothIcon, href: '/admin/ubicaciones' },
      { name: '👥 Usuarios', icon: UserCircleIcon, href: '/admin/usuarios' },
      { name: '📋 Solicitudes', icon: ChartBarIcon, href: '/admin/solicitudes' },
      { name: '✅ Validar Documentos', icon: ChartBarIcon, href: '/admin/validacion-documentos' },
      { name: '💳 Suscripciones', icon: ChartBarIcon, href: '/admin/suscripciones' },
      { name: '📊 Analíticas', icon: ChartBarIcon, href: '/admin/analiticas' },
      { name: '🌐 Red Nodexia', icon: Cog6ToothIcon, href: '/admin/red-nodexia' },
      { name: '⚠️ Incidencias', icon: ExclamationTriangleIcon, href: '/incidencias' },
    ];
  } else if (userRole === 'control_acceso') {
    navItems = [
      { name: 'Inicio', icon: HomeIcon, href: '/dashboard' },
      { name: '🚪 Control de Acceso', icon: TruckIcon, href: '/control-acceso' },
      { name: '📊 Estados de Camiones', icon: ChartBarIcon, href: '/estados-camiones' },
      { name: 'Planificación Hoy', icon: CalendarDaysIcon, href: '/planificacion' },      { name: '⚠️ Incidencias', icon: ExclamationTriangleIcon, href: '/incidencias' },    ];
  } else if (userRole === 'supervisor') {
    // Supervisor (contextual según tipo de empresa)
    if (tipoEmpresa === 'transporte') {
      navItems = [
        { name: 'Inicio', icon: HomeIcon, href: '/dashboard' },
        { name: '👷 Supervisor de Flota', icon: TruckIcon, href: '/transporte/dashboard' },
        { name: '📊 Viajes Activos', icon: ChartBarIcon, href: '/transporte/viajes-activos' },
        { name: 'Flota', icon: TruckIcon, href: '/transporte/flota' },
        { name: 'Estadísticas', icon: ChartBarIcon, href: '/estadisticas' },
      ];
    } else {
      navItems = [
        { name: 'Inicio', icon: HomeIcon, href: '/dashboard' },
        { name: '👷 Supervisor de Carga', icon: TruckIcon, href: '/supervisor-carga' },
        { name: '📊 Estados de Camiones', icon: ChartBarIcon, href: '/estados-camiones' },
        { name: 'Planificación', icon: CalendarDaysIcon, href: '/planificacion' },
        { name: '⚠️ Incidencias', icon: ExclamationTriangleIcon, href: '/incidencias' },
        { name: 'Estadísticas', icon: ChartBarIcon, href: '/estadisticas' },
      ];
    }
  } else if (userRole === 'coordinador_integral') {
    // Coordinador Integral (PyME): coordinador + control_acceso + supervisor + administrativo
    if (tipoEmpresa === 'transporte') {
      navItems = [
        { name: '🚚 Dashboard Transporte', icon: HomeIcon, href: '/transporte/dashboard' },
        { name: '📦 Despachos Ofrecidos', icon: TruckIcon, href: '/transporte/despachos-ofrecidos' },
        { name: '🌐 Cargas en Red', icon: BuildingOfficeIcon, href: '/transporte/cargas-en-red' },
        { name: '🚛 Viajes Activos', icon: CalendarDaysIcon, href: '/transporte/viajes-activos' },
        { name: '🚙 Flota', icon: TruckIcon, href: '/transporte/flota', badge: docAlertBadge > 0 ? docAlertBadge : undefined },
        { name: '🗺️ Tracking GPS', icon: ChartBarIcon, href: '/transporte/tracking-flota' },
        { name: '⚙️ Configuración', icon: Cog6ToothIcon, href: '/transporte/configuracion' },
      ];
    } else {
      navItems = [
        { name: '⚡ Panel de control', icon: HomeIcon, href: '/coordinator-dashboard' },
        { name: 'Planificación', icon: CalendarDaysIcon, href: '/planificacion' },
        { name: 'Despachos', icon: TruckIcon, href: '/crear-despacho' },
        { name: '🚪 Control de Acceso', icon: TruckIcon, href: '/control-acceso' },
        { name: '👷 Supervisor de Carga', icon: TruckIcon, href: '/supervisor-carga' },
        { name: '📊 Estados de Camiones', icon: ChartBarIcon, href: '/estados-camiones' },
        { name: '📄 Viajes', icon: CalendarDaysIcon, href: '/viajes' },
        { name: '📄 Documentación', icon: ChartBarIcon, href: '/documentos' },
        { name: '⚠️ Incidencias', icon: ExclamationTriangleIcon, href: '/incidencias' },
        { name: 'Estadísticas', icon: ChartBarIcon, href: '/estadisticas' },
        { name: 'Configuración', icon: Cog6ToothIcon, href: '/configuracion' },
      ];
    }
  } else if (userRole === 'coordinador' || String(userRole).trim().toLowerCase() === 'coordinador' || isCoordinadorByEmail) {
    // Coordinador (contextual según tipo de empresa)
    if (tipoEmpresa === 'transporte') {
      navItems = [
        { name: '🚚 Dashboard Transporte', icon: HomeIcon, href: '/transporte/dashboard' },
        { name: '📦 Despachos Ofrecidos', icon: TruckIcon, href: '/transporte/despachos-ofrecidos' },
        { name: '🌐 Cargas en Red', icon: BuildingOfficeIcon, href: '/transporte/cargas-en-red' },
        { name: '🚛 Viajes Activos', icon: CalendarDaysIcon, href: '/transporte/viajes-activos' },
        { name: '🚙 Flota', icon: TruckIcon, href: '/transporte/flota', badge: docAlertBadge > 0 ? docAlertBadge : undefined },
        { name: '🗺️ Tracking GPS', icon: ChartBarIcon, href: '/transporte/tracking-flota' },
        { name: '⚙️ Configuración', icon: Cog6ToothIcon, href: '/transporte/configuracion' },
      ];
    } else {
      navItems = [
        { name: '⚡ Panel de control', icon: HomeIcon, href: '/coordinator-dashboard' },
        { name: 'Planificación', icon: CalendarDaysIcon, href: '/planificacion' },
        { name: 'Despachos', icon: TruckIcon, href: '/crear-despacho' },
        { name: '⚠️ Incidencias', icon: ExclamationTriangleIcon, href: '/incidencias' },
        { name: 'Estadísticas', icon: ChartBarIcon, href: '/estadisticas' },
        { name: 'Configuración', icon: Cog6ToothIcon, href: '/configuracion' },
      ];
    }
  } else if (userRole === 'administrativo') {
    // Administrativo (contextual)
    navItems = [
      { name: 'Dashboard', icon: HomeIcon, href: '/dashboard' },
      { name: 'Viajes', icon: CalendarDaysIcon, href: '/viajes' },
      { name: 'Documentación', icon: ChartBarIcon, href: '/documentos' },
    ];
  } else if (userRole === 'chofer') {
    navItems = [
      { name: '📱 Vista Móvil', icon: HomeIcon, href: '/chofer-mobile' },
      { name: 'Inicio', icon: HomeIcon, href: '/dashboard' },
      { name: 'Mis Viajes', icon: TruckIcon, href: '/chofer-mobile' },
      { name: 'Perfil', icon: UserCircleIcon, href: '/chofer/perfil' },
    ];
  } else if (userRole === 'visor') {
    navItems = [
      { name: 'Dashboard', icon: HomeIcon, href: '/cliente/dashboard' },
      { name: 'Mis Cargas', icon: TruckIcon, href: '/cliente/cargas' },
    ];
  } else {
    // Si el rol es vacío o desconocido, mostrar navegación básica
    navItems = [
      { name: 'Inicio', icon: HomeIcon, href: '/dashboard' },
      { name: 'Configuración', icon: Cog6ToothIcon, href: '/configuracion' },
    ];
  }

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error: any) {
      console.error('Error al cerrar sesión:', error?.message);
      setLoggingOut(false);
    }
  };

  return (
    <aside 
      className={`${isCollapsed ? 'w-20' : 'w-64'} bg-[#1b273b] pt-0 pb-6 flex flex-col shadow-lg text-slate-100 min-h-screen transition-all duration-300 relative group`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Logo */}
      <div className="text-center mb-4 transform -translate-y-6 mx-auto" style={{ width: 'fit-content' }}>
        {!isCollapsed ? (
          <>
            <Image 
              src="/logo X gruesa.png" 
              alt="Nodexia Logo" 
              width={100} 
              height={100} 
              className="mx-auto block -mb-8" 
            />
            <span className="text-xl font-bold text-white block">NODEXIA</span>
          </>
        ) : (
          <Image 
            src="/logo X gruesa.png" 
            alt="Nodexia Logo" 
            width={50} 
            height={50} 
            className="mx-auto block mt-4" 
          />
        )}
      </div>
      
      {/* Navegación */}
      <nav className="flex-1 mt-8">
        <ul>
          {navItems.map((item) => {
            const isHighlighted = (item as any).highlighted;
            const badge = (item as any).badge;
            const isActive = router.pathname === item.href;
            
            return (
              <li key={item.name} className="mb-3">
                <Link 
                  href={item.href} 
                  className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-3 rounded-lg transition-all duration-200 relative group ${
                    isActive 
                      ? 'bg-[#0e1a2d] text-cyan-400' 
                      : isHighlighted
                        ? 'bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 text-cyan-300 hover:from-cyan-900/50 hover:to-blue-900/50'
                        : 'text-slate-300 hover:bg-[#0e1a2d]'
                  }`}
                  title={isCollapsed ? item.name : ''}
                >
                  <div className="flex items-center">
                    {isHighlighted ? (
                      <NodexiaLogoBadge className={`h-6 w-6 ${isCollapsed ? '' : 'mr-3'}`} />
                    ) : (
                      <item.icon className={`h-6 w-6 ${isCollapsed ? '' : 'mr-3'} ${isHighlighted && !isActive ? 'text-cyan-400' : ''}`} />
                    )}
                    {!isCollapsed && <span className="font-medium">{item.name}</span>}
                  </div>
                  {!isCollapsed && badge && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold rounded-full animate-pulse">
                      {badge}
                    </span>
                  )}
                  {isHighlighted && !isActive && (
                    <div className="absolute -right-1 -top-1 w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer con usuario y logout */}
      <div className="mt-auto pt-6 border-t border-gray-700">
        <div className={`flex items-center p-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <UserCircleIcon className={`h-8 w-8 text-cyan-400 ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && <span className="text-sm font-medium truncate">{displayUserName}</span>}
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className={`flex items-center ${isCollapsed ? 'justify-center' : ''} p-3 mt-2 w-full rounded-lg text-red-400 hover:bg-red-900/30 transition-colors duration-200 ${loggingOut ? 'opacity-50 cursor-wait' : ''}`}
          title={isCollapsed ? 'Cerrar sesión' : ''}
        >
          {loggingOut ? (
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-400 border-t-transparent" />
          ) : (
            <ArrowLeftOnRectangleIcon className={`h-6 w-6 ${isCollapsed ? '' : 'mr-3'}`} />
          )}
          {!isCollapsed && <span className="font-medium">{loggingOut ? 'Cerrando...' : 'Cerrar Sesión'}</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;