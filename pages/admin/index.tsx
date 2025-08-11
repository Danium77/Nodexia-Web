// pages/admin/index.tsx
import React from 'react';
import Link from 'next/link';
import AdminLayout from '../../components/layout/AdminLayout';
import {
    UsersIcon,
    ClipboardDocumentListIcon,
    TagIcon,
} from '@heroicons/react/24/outline';

const AdminDashboardPage = () => {
    const cards = [
        {
            name: 'Gestionar Perfiles',
            href: '/admin/perfiles', // Crearemos esta página después
            icon: ClipboardDocumentListIcon,
            description: 'Crear, editar y administrar plantas, transportes, etc.',
        },
        {
            name: 'Gestionar Usuarios',
            href: '/admin/usuarios',
            icon: UsersIcon,
            description: 'Dar de alta y administrar los usuarios de la plataforma.',
        },
        // {
        //     name: 'Gestionar Roles',
        //     href: '/admin/roles',
        //     icon: TagIcon,
        //     description: 'Ver y administrar los roles disponibles.',
        // },
    ];

    return (
        <AdminLayout pageTitle="Dashboard de Administración">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => (
                    <Link key={card.name} href={card.href} className="bg-[#1b273b] p-6 rounded-lg shadow-lg hover:bg-cyan-800/50 transition-all duration-300 transform hover:-translate-y-1">
                        <card.icon className="h-10 w-10 text-cyan-400 mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">{card.name}</h3>
                        <p className="text-slate-400 text-sm">{card.description}</p>
                    </Link>
                ))}
            </div>
        </AdminLayout>
    );
};

export default AdminDashboardPage;
