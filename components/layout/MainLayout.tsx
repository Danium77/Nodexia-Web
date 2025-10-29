 // components/layout/MainLayout.tsx
// Layout principal que evita re-renders innecesarios del Sidebar

import { ReactNode } from 'react';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import Sidebar from './Sidebar';
import Header from './Header';
import LoadingSkeleton from '../ui/LoadingSkeleton';

interface MainLayoutProps {
  children: ReactNode;
  pageTitle: string;
}

export default function MainLayout({ children, pageTitle }: MainLayoutProps) {
  const { user, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#0e1a2d]">
        {/* Sidebar skeleton */}
        <div className="w-64 bg-[#0a1628] border-r border-slate-700/50 p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-slate-700/50 rounded-lg"></div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-slate-700/50 rounded-md"></div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Main content skeleton */}
        <div className="flex-1 flex flex-col">
          {/* Header skeleton */}
          <div className="h-16 bg-[#0a1628] border-b border-slate-700/50 px-6 flex items-center justify-between">
            <div className="animate-pulse h-6 bg-slate-700/50 rounded w-48"></div>
            <div className="animate-pulse h-8 bg-slate-700/50 rounded-full w-32"></div>
          </div>
          
          {/* Page content skeleton */}
          <div className="flex-1 p-6">
            <LoadingSkeleton type="dashboard" />
          </div>
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
      <Sidebar userEmail={user.email || ''} />
      
      <div className="flex-1 flex flex-col">
        <Header 
          pageTitle={pageTitle}
          userName={user.email?.split('@')[0] || 'Usuario'} 
          userEmail={user.email || ''}
        />
        
        <main className="flex-1 p-6 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}