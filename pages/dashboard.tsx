import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useUserRole } from '../lib/contexts/UserRoleContext';

/**
 * Dashboard Principal - REDIRECTOR ONLY
 * 
 * Este componente NO renderiza contenido.
 * Solo redirige a los dashboards específicos según el rol Y tipo de empresa:
 * - admin_nodexia → /admin/super-admin-dashboard
 * - coordinador (transporte) → /transporte/dashboard
 * - coordinador (planta) → /coordinator-dashboard
 * - supervisor (transporte) → /transporte/dashboard
 * - supervisor (planta) → /supervisor-carga
 */

const Dashboard = () => {
  const router = useRouter();
  const { user, primaryRole, loading, tipoEmpresa } = useUserRole();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    console.log('🔄 [Dashboard] Effect triggered:', { hasRedirected, loading, user: !!user, primaryRole, tipoEmpresa });
    
    // Prevenir múltiples redirects
    if (hasRedirected || loading) {
      console.log('⏸️ [Dashboard] Skipping:', { hasRedirected, loading });
      return;
    }

    // Sin usuario → login
    if (!user) {
      console.log('🚪 [Dashboard] No user, redirecting to login');
      setHasRedirected(true);
      router.replace('/login');
      return;
    }

    // Sin rol → esperar
    if (!primaryRole) {
      console.log('⏳ [Dashboard] No primaryRole yet');
      return;
    }

    // Para roles contextuales, esperar a que cargue tipoEmpresa
    if ((primaryRole === 'coordinador' || primaryRole === 'supervisor') && !tipoEmpresa) {
      console.log('⏳ [Dashboard] Waiting for tipoEmpresa');
      return;
    }

    // Redirigir según rol
    console.log('🎯 [Dashboard] Redirecting for role:', primaryRole);
    
    switch (primaryRole) {
      case 'super_admin':
        console.log('✅ [Dashboard] Redirecting to /admin/super-admin-dashboard');
        setHasRedirected(true);
        router.replace('/admin/super-admin-dashboard');
        break;
      
      case 'admin_nodexia':
        setHasRedirected(true);
        router.replace('/admin/super-admin-dashboard');
        break;
      
      case 'coordinador':
        // Coordinador es contextual - redirige según tipo de empresa
        setHasRedirected(true);
        if (tipoEmpresa === 'transporte') {
          router.replace('/transporte/dashboard');
        } else {
          router.replace('/coordinator-dashboard');
        }
        break;
      
      case 'chofer':
        setHasRedirected(true);
        router.replace('/chofer-mobile');
        break;
      
      case 'administrativo':
        setHasRedirected(true);
        router.replace('/administrativo/dashboard');
        break;
      
      case 'control_acceso':
        setHasRedirected(true);
        router.replace('/control-acceso');
        break;
      
      case 'supervisor':
        // Supervisor es contextual - redirige según tipo de empresa
        setHasRedirected(true);
        if (tipoEmpresa === 'transporte') {
          router.replace('/transporte/dashboard');
        } else {
          router.replace('/supervisor-carga');
        }
        break;
      
      case 'visor':
        setHasRedirected(true);
        router.replace('/cliente/dashboard');
        break;
      
      default:
        setHasRedirected(true);
        router.replace('/login');
    }
  }, [user, primaryRole, tipoEmpresa, loading, hasRedirected, router]);

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
