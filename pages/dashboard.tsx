import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useUserRole } from '../lib/contexts/UserRoleContext';

/**
 * Dashboard Principal - REDIRECTOR ONLY
 * 
 * Este componente NO renderiza contenido.
 * Solo redirige a los dashboards específicos según el rol:
 * - super_admin → /admin/super-admin-dashboard
 * - coordinador → /coordinator-dashboard
 */

const Dashboard = () => {
  const router = useRouter();
  const { user, primaryRole, loading } = useUserRole();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Prevenir múltiples redirects
    if (hasRedirected || loading) return;

    // Sin usuario → login
    if (!user) {
      console.log('🔒 [dashboard] No user, redirecting to login');
      setHasRedirected(true);
      router.replace('/login');
      return;
    }

    // Sin rol → esperar
    if (!primaryRole) {
      console.log('⏳ [dashboard] Waiting for role...');
      return;
    }

    // Redirigir según rol
    console.log(`🎯 [dashboard] Role detected: ${primaryRole}`);
    
    switch (primaryRole) {
      case 'super_admin':
        console.log('👑 [dashboard] Redirecting to super-admin-dashboard');
        setHasRedirected(true);
        router.replace('/admin/super-admin-dashboard');
        break;
      
      case 'coordinador':
        console.log('📊 [dashboard] Redirecting to coordinator-dashboard (planta)');
        setHasRedirected(true);
        router.replace('/coordinator-dashboard');
        break;
      
      case 'coordinador_transporte':
        console.log('🚚 [dashboard] Redirecting to transporte dashboard');
        setHasRedirected(true);
        router.replace('/transporte/dashboard');
        break;
      
      case 'chofer':
        console.log('🚗 [dashboard] Redirecting to chofer dashboard');
        setHasRedirected(true);
        router.replace('/chofer-mobile');
        break;
      
      case 'administrativo':
        console.log('📋 [dashboard] Redirecting to transporte dashboard (administrativo)');
        setHasRedirected(true);
        router.replace('/transporte/dashboard');
        break;
      
      case 'control_acceso':
        console.log('🚪 [dashboard] Redirecting to control-acceso');
        setHasRedirected(true);
        router.replace('/control-acceso');
        break;
      
      case 'supervisor_carga':
        console.log('👷 [dashboard] Redirecting to supervisor-carga');
        setHasRedirected(true);
        router.replace('/supervisor-carga');
        break;
      
      case 'visor':
        console.log('👁️ [dashboard] Redirecting to cliente dashboard');
        setHasRedirected(true);
        router.replace('/cliente/dashboard');
        break;
      
      default:
        console.warn(`⚠️ [dashboard] Unknown role: ${primaryRole}`);
        setHasRedirected(true);
        router.replace('/login');
    }
  }, [user, primaryRole, loading, hasRedirected, router]);

  // Mostrar loading mientras se determina la redirección
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0e1a]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto mb-4"></div>
        <p className="text-slate-400 text-lg">Cargando...</p>
      </div>
    </div>
  );
};

export default Dashboard;
