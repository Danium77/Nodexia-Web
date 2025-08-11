import React, { useState, useEffect, FormEvent } from 'react';
import type { GetServerSideProps } from 'next';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/layout/AdminLayout';

interface User {
    id: string;
    email: string;
    full_name: string;
    dni: string;
    profile_id: string | null;
    profile_name: string;
    role_id: number | null;
    role_name: string;
}

interface Profile {
    id: string;
    name: string;
}

interface Role {
    id: number;
    name: string;
}

const GestionUsuariosPage = () => {
    // Estados para el formulario de alta
    const [email, setEmail] = useState('');
    const [selectedProfile, setSelectedProfile] = useState('');
    const [selectedRole, setSelectedRole] = useState('');

    // Estados para la UI y datos
    const [users, setUsers] = useState<User[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [mensaje, setMensaje] = useState('');
    const [cargando, setCargando] = useState(false);
    const [cargandoUsuarios, setCargandoUsuarios] = useState(true);

    // Estados para el modal de edición
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [selectedProfileForEdit, setSelectedProfileForEdit] = useState('');
    const [selectedRoleForEdit, setSelectedRoleForEdit] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);

    const fetchUsers = async () => {
        setCargandoUsuarios(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return; // No hacer nada si no hay sesión

            const response = await fetch('/api/admin/listar-usuarios', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error al cargar usuarios');
            }

            const data = await response.json();
            setUsers(data);
        } catch (error: any) {
            console.error("Error al cargar usuarios:", error);
            setMensaje(`Error al cargar usuarios: ${error.message}`);
        }
        setCargandoUsuarios(false);
    };

    useEffect(() => {
        const fetchData = async () => {
            const [profilesResponse, rolesResponse] = await Promise.all([
                supabase.from('profiles').select('id, name'),
                supabase.from('roles').select('id, name')
            ]);

            if (profilesResponse.data) setProfiles(profilesResponse.data);
            if (rolesResponse.data) setRoles(rolesResponse.data);

            if (profilesResponse.data && profilesResponse.data.length > 0) {
                setSelectedProfile(profilesResponse.data[0].id);
            }
            if (rolesResponse.data && rolesResponse.data.length > 0) {
                setSelectedRole(String(rolesResponse.data[0].id));
            }
        };

        fetchData();
        fetchUsers();
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setCargando(true);
        setMensaje('');

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setMensaje('Error: No estás autenticado.');
            setCargando(false);
            return;
        }

        try {
            const response = await fetch('/api/admin/invitar-usuario', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ email, profileId: selectedProfile, roleId: selectedRole }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ocurrió un error al enviar la invitación.');
            }

            setMensaje(`Invitación enviada a ${email} con éxito.`);
            setEmail(''); // Limpiar el campo de email
            fetchUsers(); // Refrescar la lista para mostrar el nuevo usuario invitado
        } catch (error: any) {
            setMensaje(`Error: ${error.message}`);
        }
        setCargando(false);
    };

    const handleOpenModal = (user: User) => {
        setEditingUser(user);
        setSelectedProfileForEdit(user.profile_id || '');
        setSelectedRoleForEdit(user.role_id ? String(user.role_id) : '');
        setIsModalOpen(true);
        setMensaje(''); // Limpiar mensajes anteriores
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setIsEditMode(false);
    };

    const handleUpdateUser = async (e: FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        setCargando(true);
        setMensaje('');

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setMensaje('Error: Sesión expirada, por favor vuelve a iniciar sesión.');
            setCargando(false);
            return;
        }

        try {
            const response = await fetch('/api/admin/editar-usuario', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    userId: editingUser.id,
                    profileId: selectedProfileForEdit,
                    roleId: selectedRoleForEdit,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Error al actualizar el usuario.');
            }

            setMensaje('Usuario actualizado con éxito.');
            handleCloseModal();
            fetchUsers(); // Refrescar la lista
        } catch (error: any) {
            setMensaje(`Error: ${error.message}`);
        }
        setCargando(false);
    };

    const handleDeleteUser = async () => {
        if (!editingUser) return;
        if (!window.confirm('¿Seguro que deseas eliminar este usuario?')) return;
        setCargando(true);
        setMensaje('');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setMensaje('Error: Sesión expirada, por favor vuelve a iniciar sesión.');
            setCargando(false);
            return;
        }
        try {
            const response = await fetch('/api/admin/editar-usuario', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ userId: editingUser.id }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Error al eliminar el usuario.');
            }
            setMensaje('Usuario eliminado con éxito.');
            handleCloseModal();
            fetchUsers();
        } catch (error: any) {
            setMensaje(`Error: ${error.message}`);
        }
        setCargando(false);
    };

    return (
        <AdminLayout pageTitle="Gestión de Usuarios">
            <div className="bg-[#1b273b] p-6 rounded-lg shadow-lg max-w-2xl mx-auto mb-8">
                <h2 className="text-2xl font-bold mb-6 text-cyan-400">Invitar Nuevo Usuario</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@ejemplo.com" required className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-cyan-500 focus:border-cyan-500" />
                    </div>
                    <div>
                        <label htmlFor="profile" className="block text-sm font-medium text-slate-300 mb-1">Perfil de Empresa</label>
                        <select id="profile" value={selectedProfile} onChange={(e) => setSelectedProfile(e.target.value)} className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-cyan-500 focus:border-cyan-500">
                            {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-slate-300 mb-1">Rol de Usuario</label>
                        <select id="role" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-cyan-500 focus:border-cyan-500">
                            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                    <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded">Invitar Usuario</button>
                </form>
                {mensaje && <div className="mt-4 text-center text-cyan-400">{mensaje}</div>}
            </div>
            {/* Aquí iría la tabla de usuarios y el modal de detalles, etc. */}
        </AdminLayout>
    );
};

export default GestionUsuariosPage;

export const getServerSideProps: GetServerSideProps = async (context) => {
    return {
        props: {},
    };
};
