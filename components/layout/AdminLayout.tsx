// components/layout/AdminLayout.tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
    children: React.ReactNode;
    pageTitle: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, pageTitle }) => {
    const router = useRouter();
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.replace('/login');
                return;
            }

            // Usamos la función RPC que creamos en Supabase
            const { data: isAdmin, error } = await supabase.rpc('is_admin');

            if (error || !isAdmin) {
                console.warn('Acceso no autorizado a la zona de administración.');
                router.replace('/dashboard'); // Redirige a los no-admin
            } else {
                setIsVerified(true); // El usuario es un admin verificado
            }
        };

        checkAdmin();
    }, [router]);

    if (!isVerified) {
        // Muestra un loader o una pantalla en blanco mientras se verifica
        return <div className="bg-[#0e1a2d] min-h-screen flex items-center justify-center text-white">Verificando acceso...</div>;
    }

    return (
        <div className="flex min-h-screen bg-[#0e1a2d]">
            <AdminSidebar />
            <main className="flex-1 p-8">
                <h1 className="text-3xl font-bold text-white mb-8">{pageTitle}</h1>
                {children}
            </main>
        </div>
    );
};

export default AdminLayout;
