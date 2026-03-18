import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useUserRole } from '@/lib/contexts/UserRoleContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ReporteDashboard from '@/components/Dashboard/ReporteDashboard';

const EstadisticasPage = () => {
  const { user, name, loading } = useUserRole();

  if (loading || !user) return <LoadingSpinner text="Cargando..." fullScreen />;

  return (
    <div className="flex min-h-screen bg-[#0e1a2d]">
      <Sidebar userEmail={user.email || ''} userName={name} />
      <div className="flex-1 flex flex-col">
        <Header userEmail={user.email || ''} userName={name} pageTitle="Reportes Gerenciales" />
        <main className="flex-1 p-4">
          <ReporteDashboard />
        </main>
      </div>
    </div>
  );
};

export default EstadisticasPage;
