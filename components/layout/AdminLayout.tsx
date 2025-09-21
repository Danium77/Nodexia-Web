// components/layout/AdminLayout.tsx
import React from 'react';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import AdminSidebar from './AdminSidebar';
import Sidebar from './Sidebar';

interface AdminLayoutProps {
    children: React.ReactNode;
    pageTitle: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, pageTitle }) => {
    const { user, primaryRole, loading, error, hasRole } = useUserRole();

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
                <div className="p-8">
                    <h1 className="text-3xl font-bold text-white mb-8">{pageTitle}</h1>
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
