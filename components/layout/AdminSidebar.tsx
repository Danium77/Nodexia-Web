// components/layout/AdminSidebar.tsx
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import {
    UsersIcon,
    ClipboardDocumentListIcon,
    TagIcon,
    ArrowLeftOnRectangleIcon,
    HomeIcon
} from '@heroicons/react/24/outline';

const AdminSidebar = () => {
    const router = useRouter();

    const navItems = [
        { name: 'Dashboard', href: '/admin', icon: HomeIcon },
        { name: 'Perfiles', href: '/admin/perfiles', icon: ClipboardDocumentListIcon },
        { name: 'Usuarios', href: '/admin/usuarios', icon: UsersIcon },
        // Podríamos agregar 'Roles' aquí en el futuro si es necesario gestionarlos
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <aside className="w-64 bg-[#1b273b] text-slate-100 flex flex-col p-4">
            <div className="text-center py-4 mb-4">
                <h1 className="text-xl font-bold text-white">Admin Panel</h1>
            </div>
            <nav className="flex-1">
                <ul>
                    {navItems.map((item) => (
                        <li key={item.name} className="mb-2">
                            <Link href={item.href} className={`flex items-center p-3 rounded-lg transition-colors ${router.pathname === item.href ? 'bg-cyan-500 text-white' : 'hover:bg-[#0e1a2d]'}`}>
                                <item.icon className="h-6 w-6 mr-3" />
                                <span>{item.name}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="mt-auto">
                <button onClick={handleLogout} className="flex items-center p-3 w-full rounded-lg text-red-400 hover:bg-red-900/30 transition-colors">
                    <ArrowLeftOnRectangleIcon className="h-6 w-6 mr-3" />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;
