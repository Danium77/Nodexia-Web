 // components/layout/MainLayout.tsx
// Layout principal que evita re-renders innecesarios del Sidebar

import { ReactNode } from 'react';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import Sidebar from './Sidebar';
import Header from './Header';

interface MainLayoutProps {
  children: ReactNode;
  pageTitle: string;
}

export default function MainLayout({ children, pageTitle }: MainLayoutProps) {
  const { user, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1a2d] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-100">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0e1a2d] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-100">
            Acceso restringido.{' '}
            <a href="/login" className="text-cyan-400 hover:text-cyan-300">
              Iniciar sesión
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0e1a2d]">
      <Sidebar userEmail={user.email} />
      
      <div className="flex-1 flex flex-col">
        <Header 
          pageTitle={pageTitle}
          userName={user.email.split('@')[0]} 
          userEmail={user.email}
        />
        
        <main className="flex-1 p-6 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}