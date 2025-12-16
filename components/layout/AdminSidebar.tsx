// components/layout/AdminSidebar.tsx
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import {
    UsersIcon,
    // ClipboardDocumentListIcon,
    ArrowLeftOnRectangleIcon,
    HomeIcon,
    CogIcon,
    BuildingOfficeIcon,
    CreditCardIcon,
    UserGroupIcon,
    InboxIcon
} from '@heroicons/react/24/outline';

const AdminSidebar = () => {
    const router = useRouter();

    const navItems = [
        { 
            name: 'Dashboard', 
            href: '/admin', 
            icon: HomeIcon,
            description: 'Panel principal con KPIs y resumen'
        },
        { 
            name: 'Clientes', 
            href: '/admin/clientes', 
            icon: BuildingOfficeIcon,
            description: 'Gestión de empresas cliente'
        },
        { 
            name: 'Planes', 
            href: '/admin/planes', 
            icon: CreditCardIcon,
            description: 'Planes de suscripción y límites'
        },
        { 
            name: 'Roles', 
            href: '/admin/roles', 
            icon: UserGroupIcon,
            description: 'Catálogo maestro de roles'
        },
        { 
            name: 'Usuarios', 
            href: '/admin/usuarios', 
            icon: UsersIcon,
            description: 'Gestión de usuarios por cliente'
        },
        { 
            name: 'Solicitudes', 
            href: '/admin/solicitudes', 
            icon: InboxIcon,
            description: 'Centro de solicitudes y aprobaciones'
        },
        { 
            name: 'Configuración', 
            href: '/admin/configuracion', 
            icon: CogIcon,
            description: 'Configuración del sistema'
        },
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <aside className="w-72 bg-[#1b273b] text-slate-100 flex flex-col p-4">
            <div className="text-center py-4 mb-6">
                <h1 className="text-xl font-bold text-white">Nodexia Admin</h1>
                <p className="text-sm text-slate-400 mt-1">Sistema de gestión centralizada</p>
            </div>
            <nav className="flex-1">
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = router.pathname === item.href || 
                                       (item.href !== '/admin' && router.pathname.startsWith(item.href));
                        return (
                            <li key={item.name}>
                                <Link 
                                    href={item.href} 
                                    className={`flex items-start p-3 rounded-lg transition-all duration-200 group ${
                                        isActive 
                                            ? 'bg-cyan-500 text-white shadow-lg' 
                                            : 'hover:bg-[#0e1a2d] hover:translate-x-1'
                                    }`}
                                >
                                    <item.icon className={`h-5 w-5 mr-3 mt-0.5 flex-shrink-0 ${
                                        isActive ? 'text-white' : 'text-slate-300'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                        <span className="font-medium text-sm block">{item.name}</span>
                                        <span className={`text-xs block mt-0.5 ${
                                            isActive ? 'text-cyan-100' : 'text-slate-400'
                                        }`}>
                                            {item.description}
                                        </span>
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
            <div className="mt-auto pt-4 border-t border-slate-600">
                <button 
                    onClick={handleLogout} 
                    className="flex items-center p-3 w-full rounded-lg text-red-400 hover:bg-red-900/30 transition-colors"
                >
                    <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-3" />
                    <span className="font-medium">Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;
