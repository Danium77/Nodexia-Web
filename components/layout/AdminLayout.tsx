// components/layout/AdminLayout.tsx
import React from 'react';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import AdminSidebar from './AdminSidebar';
import Sidebar from './Sidebar';
import { useAutoReload, useHMRStatus } from '../../lib/hooks/useAutoReload';

interface AdminLayoutProps {
    children: React.ReactNode;
    pageTitle: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, pageTitle }) => {
    const { user, primaryRole, loading, error, hasRole } = useUserRole();
    
    // Hooks para manejar problemas de HMR y reconexión
    useAutoReload();
    const { isConnected } = useHMRStatus();

    // Show loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-lg">Cargando...</div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-red-400 text-lg">Error: {error}</div>
            </div>
        );
    }

    // Redirect to login if no user
    if (!user) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-lg">Redirigiendo...</div>
            </div>
        );
    }

    const isAdmin = hasRole('admin');

    return (
        <div className="min-h-screen bg-gray-900 flex">
            {isAdmin ? (
                <AdminSidebar />
            ) : (
                <Sidebar 
                    userName={user.user_metadata?.name || user.email || ''}
                />
            )}
            <main className="flex-1 overflow-auto">
                {/* Indicador de estado de conexión (solo en desarrollo) */}
                {process.env.NODE_ENV === 'development' && !isConnected && (
                    <div className="bg-yellow-500 text-black px-4 py-2 text-sm text-center">
                        ⚠️ Conexión HMR perdida - considera recargar la página (F5)
                    </div>
                )}
                
                <div className="p-8">
                    <h1 className="text-3xl font-bold text-white mb-8">{pageTitle}</h1>
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
