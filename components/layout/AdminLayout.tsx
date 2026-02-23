// components/layout/AdminLayout.tsx
import React from 'react';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import AdminSidebar from './AdminSidebar';
import Sidebar from './Sidebar';
import NotificacionesDropdown from '../ui/NotificacionesDropdown';
import { useAutoReload, useHMRStatus } from '../../lib/hooks/useAutoReload';

interface AdminLayoutProps {
    children: React.ReactNode;
    pageTitle: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, pageTitle }) => {
    const { user, loading, error, hasRole, empresaNombre } = useUserRole(); // primaryRole removed (not used)
    
    // Hooks para manejar problemas de HMR y reconexión
    useAutoReload();
    useHMRStatus(); // Monitor connection status

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
                {/* Indicador de estado de conexión deshabilitado */}
                {/* {process.env.NODE_ENV === 'development' && !isConnected && (
                    <div className="bg-yellow-500 text-black px-4 py-2 text-sm text-center">
                        ⚠️ Conexión HMR perdida - considera recargar la página (F5)
                    </div>
                )} */}
                
                {/* Header con notificaciones */}
                <div className="bg-[#0a0e1a] border-b border-gray-800 px-8 py-4 flex justify-between items-center sticky top-0 z-40">
                    <h1 className="text-2xl font-bold text-white">{pageTitle}</h1>
                    <div className="flex items-center gap-4">
                        <NotificacionesDropdown />
                        <div className="text-gray-400 text-sm">
                            {empresaNombre || user.email}
                        </div>
                    </div>
                </div>
                
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
