// components/layout/AdminLayout.tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import AdminSidebar from './AdminSidebar';
import Sidebar from './Sidebar';

interface AdminLayoutProps {
    children: React.ReactNode;
    pageTitle: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, pageTitle }) => {
    const router = useRouter();
    const [isVerified, setIsVerified] = useState(false);
    const [userData, setUserData] = useState<{ email: string; name: string; role: string }>({ email: '', name: '', role: '' });
    const [loadingRole, setLoadingRole] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAccess = async () => {
            setLoadingRole(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace('/login');
                return;
            }
            let userRole = '';
            // Consultar roles del usuario
            const { data: profileUser, error } = await supabase
                .from('profile_users')
                .select('roles(name)')
                .eq('user_id', user.id)
                .single();
                    if (profileUser && profileUser.roles) {
                            console.log('profileUser:', profileUser);
                            const roles = Array.isArray(profileUser.roles) ? profileUser.roles : [profileUser.roles];
                            console.log('roles extraídos:', roles);
                            // Prioridad: admin > coordinador > transporte
                            if (roles.some((role: any) => role.name === 'admin')) {
                                userRole = 'admin';
                            } else if (roles.some((role: any) => role.name === 'coordinador')) {
                                userRole = 'coordinador';
                            } else if (roles.some((role: any) => role.name === 'transporte')) {
                                userRole = 'transporte';
                            } else {
                                userRole = roles[0]?.name || '';
                            }
                            console.log('Rol detectado para Sidebar:', userRole);
                    }
            setUserData({
                email: user.email,
                name: user.user_metadata?.nombre_completo || user.email.split('@')[0] || 'Usuario',
                role: userRole,
            });
            setLoadingRole(false);
            if (error || !profileUser || !profileUser.roles) {
                console.warn('Acceso no autorizado a la zona de administración.');
                router.replace('/dashboard');
                return;
            }
            const roles = Array.isArray(profileUser.roles) ? profileUser.roles : [profileUser.roles];
            const isAdminRole = roles.some((role: any) => role.name === 'admin');
            const isCoordinadorRole = roles.some((role: any) => role.name === 'coordinador');
            if (isAdminRole || isCoordinadorRole || roles.some((role: any) => role.name === 'transporte')) {
                setIsAdmin(isAdminRole);
                setIsVerified(true);
            } else {
                console.warn('Acceso no autorizado a la zona de administración.');
                router.replace('/dashboard');
            }
        };
        checkAccess();
    }, [router.pathname]);

    if (!isVerified || loadingRole || !userData.role) {
        // Muestra un loader o una pantalla en blanco mientras se verifica o si el rol aún no está disponible
        return <div className="bg-[#0e1a2d] min-h-screen flex items-center justify-center text-white">Verificando acceso...</div>;
    }

    return (
        <div className="flex min-h-screen bg-[#0e1a2d]">
            {isAdmin ? (
                <AdminSidebar />
            ) : (
                <Sidebar />
            )}
            <main className="flex-1 p-8">
                <h1 className="text-3xl font-bold text-white mb-8">{pageTitle}</h1>
                {children}
            </main>
        </div>
    );
};

export default AdminLayout;
