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

    // Para roles contextuales, esperar a que cargue tipoEmpresa
    if ((primaryRole === 'coordinador' || primaryRole === 'supervisor') && !tipoEmpresa) {
      console.log('⏳ [dashboard] Waiting for tipoEmpresa to load...');
      return;
    }

    // Redirigir según rol
    console.log(`🎯 [dashboard] Role detected: ${primaryRole}, tipoEmpresa: ${tipoEmpresa}`);
    
    switch (primaryRole) {
      case 'super_admin':
        console.log('👑 [dashboard] Redirecting to super-admin-dashboard');
        setHasRedirected(true);
        router.replace('/admin/super-admin-dashboard');
        break;
      
      case 'admin_nodexia':
        console.log('👑 [dashboard] Redirecting to admin dashboard');
        setHasRedirected(true);
        router.replace('/admin/super-admin-dashboard');
        break;
      
      case 'coordinador':
        // Coordinador es contextual - redirige según tipo de empresa
        console.log(`📊 [dashboard] Redirecting coordinador - tipo_empresa: ${tipoEmpresa}`);
        setHasRedirected(true);
        if (tipoEmpresa === 'transporte') {
          console.log('🚚 [dashboard] → Coordinador de Transporte');
          router.replace('/transporte/dashboard');
        } else {
          console.log('🏭 [dashboard] → Coordinador de Planta');
          router.replace('/coordinator-dashboard');
        }
        break;
      
      case 'chofer':
        console.log('🚗 [dashboard] Redirecting to chofer dashboard');
        setHasRedirected(true);
        router.replace('/chofer-mobile');
        break;
      
      case 'administrativo':
        console.log('📋 [dashboard] Redirecting to dashboard (administrativo)');
        setHasRedirected(true);
        router.replace('/dashboard');
        break;
      
      case 'control_acceso':
        console.log('🚪 [dashboard] Redirecting to control-acceso');
        setHasRedirected(true);
        router.replace('/control-acceso');
        break;
      
      case 'supervisor':
        // Supervisor es contextual - redirige según tipo de empresa
        console.log(`👷 [dashboard] Redirecting supervisor - tipo_empresa: ${tipoEmpresa}`);
        setHasRedirected(true);
        if (tipoEmpresa === 'transporte') {
          console.log('🚚 [dashboard] → Supervisor de Flota');
          router.replace('/transporte/dashboard');
        } else {
          console.log('🏭 [dashboard] → Supervisor de Carga');
          router.replace('/supervisor-carga');
        }
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
