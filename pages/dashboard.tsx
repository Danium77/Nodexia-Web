import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useUserRole } from '../lib/contexts/UserRoleContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';

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
      setHasRedirected(true);
      router.replace('/login');
      return;
    }

    // Sin rol → esperar
    if (!primaryRole) return;

    // Para roles contextuales, esperar a que cargue tipoEmpresa
    if ((primaryRole === 'coordinador' || primaryRole === 'coordinador_integral' || primaryRole === 'supervisor') && !tipoEmpresa) return;

    // Redirigir según rol
    switch (primaryRole) {
      case 'super_admin':
        setHasRedirected(true);
        router.replace('/admin/super-admin-dashboard');
        break;
      
      case 'admin_nodexia':
        setHasRedirected(true);
        router.replace('/admin/super-admin-dashboard');
        break;
      
      case 'coordinador':
      case 'coordinador_integral':
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
  return <LoadingSpinner text="Cargando..." fullScreen />;
};

export default Dashboard;
