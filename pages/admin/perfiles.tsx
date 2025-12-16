// pages/admin/perfiles.tsx
import React, { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/layout/AdminLayout';

interface Profile {
    id: string;
    name: string;
    type: string | null;
    cuit: string | null;
}

const GestionPerfilesPage = () => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [newProfileName, setNewProfileName] = useState('');
    const [newProfileType, setNewProfileType] = useState('planta');
    const [newProfileCuit, setNewProfileCuit] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingProfiles, setLoadingProfiles] = useState(true);

    // Estados para el modal de edición
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
    const [editedName, setEditedName] = useState('');
    const [editedCuit, setEditedCuit] = useState('');
    const [editedType, setEditedType] = useState('planta');

    const fetchProfiles = async () => {
        const { data, error } = await supabase.from('profiles').select('id, name, type, cuit').order('name');
        if (data) setProfiles(data);
        if (error) setMessage(`Error al cargar perfiles: ${error.message}`);
    };

    const initialFetch = async () => {
        setLoadingProfiles(true);
        fetchProfiles();
        setLoadingProfiles(false);
    };

    const handleCreateProfile = async (e: FormEvent) => {
        e.preventDefault();
        if (!newProfileName || !newProfileCuit) return;

        setLoading(true);
        setMessage('');

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setMessage('Error: No estás autenticado.');
            setLoading(false);
            return;
        }

        const response = await fetch('/api/admin/crear-perfil', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ name: newProfileName, type: newProfileType, cuit: newProfileCuit }),
        });

        const data = await response.json();

        if (response.ok) {
            setMessage(`Perfil "${data.name}" creado con éxito.`);
            setNewProfileName('');
            setNewProfileCuit('');
            setNewProfileType('planta');
            fetchProfiles(); // Refrescar la lista
        } else {
            setMessage(`Error: ${data.error}`);
        }
        setLoading(false);
    };

    const handleOpenEditModal = (profile: Profile) => {
        setEditingProfile(profile);
        setEditedName(profile.name);
        setEditedCuit(profile.cuit || '');
        setEditedType(profile.type || 'planta');
        setIsModalOpen(true);
        setMessage(''); // Limpiar mensajes anteriores
    };

    const handleCloseEditModal = () => {
        setIsModalOpen(false);
        setEditingProfile(null);
    };

    const handleUpdateProfile = async (e: FormEvent) => {
        e.preventDefault();
        if (!editingProfile) return;

        setLoading(true);
        setMessage('');

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setMessage('Error: Sesión expirada, por favor vuelve a iniciar sesión.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/admin/editar-perfil', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    profileId: editingProfile.id,
                    name: editedName,
                    cuit: editedCuit,
                    type: editedType,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Error al actualizar el perfil.');
            }

            setMessage('Perfil actualizado con éxito.');
            handleCloseEditModal();
            fetchProfiles(); // Refrescar la lista
        } catch (error: any) {
            setMessage(`Error: ${error.message}`);
        }
        setLoading(false);
    };

    useEffect(() => {
        initialFetch();
    }, []);

    return (
        <AdminLayout pageTitle="Gestión de Perfiles">
            <div className="bg-[#1b273b] p-2 rounded shadow-lg max-w-4xl mx-auto">
                <h2 className="text-sm font-bold mb-2 text-cyan-400">Crear Nuevo Perfil</h2>
                <form onSubmit={handleCreateProfile} className="grid md:grid-cols-4 gap-2 items-end mb-2">
                    <input type="text" value={newProfileName} onChange={e => setNewProfileName(e.target.value)} placeholder="Nombre del Perfil (ej: Planta A)" required className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-cyan-500 focus:border-cyan-500" />
                    <input
                        type="text"
                        value={newProfileCuit}
                        onChange={(e) => {
                            const val = e.target.value;
                            // Permitir solo números y limitar la longitud a 11
                            if (/^\d*$/.test(val) && val.length <= 11) {
                                setNewProfileCuit(val);
                            }
                        }}
                        placeholder="CUIT (11 dígitos)"
                        maxLength={11}
                        pattern="\d{11}"
                        title="El CUIT debe contener 11 dígitos numéricos."
                        required
                        className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-cyan-500 focus:border-cyan-500" />
                    <select value={newProfileType} onChange={e => setNewProfileType(e.target.value)} className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-cyan-500 focus:border-cyan-500">
                        <option value="planta">Planta</option>
                        <option value="transporte">Transporte</option>
                        <option value="otro">Otro</option>
                    </select>
                    <button type="submit" disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-500 transition-colors">
                        {loading ? 'Creando...' : 'Crear Perfil'}
                    </button>
                </form>
                {message && <p className={`mb-4 text-sm ${message.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>{message}</p>}

                {/* Modal de Edición de Perfil */}
                {isModalOpen && editingProfile && (
                    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
                        <div className="bg-[#1b273b] p-8 rounded-lg shadow-2xl w-full max-w-md border border-yellow-700">
                            <h3 className="text-2xl font-bold mb-4 text-yellow-400">Editar Perfil</h3>
                            <p className="text-slate-400 mb-6">Editando: <span className="font-semibold text-white">{editingProfile.name}</span></p>
                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div>
                                    <label htmlFor="edit-profile-name" className="block text-sm font-medium text-slate-300 mb-1">Nombre del Perfil</label>
                                    <input id="edit-profile-name" type="text" value={editedName} onChange={(e) => setEditedName(e.target.value)} required className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-yellow-500 focus:border-yellow-500" />
                                </div>
                                <div>
                                    <label htmlFor="edit-profile-cuit" className="block text-sm font-medium text-slate-300 mb-1">CUIT</label>
                                    <input
                                        id="edit-profile-cuit"
                                        type="text"
                                        value={editedCuit}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (/^\d*$/.test(val) && val.length <= 11) setEditedCuit(val);
                                        }}
                                        maxLength={11}
                                        pattern="\d{11}"
                                        required
                                        className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-yellow-500 focus:border-yellow-500" />
                                </div>
                                <div>
                                    <label htmlFor="edit-profile-type" className="block text-sm font-medium text-slate-300 mb-1">Tipo</label>
                                    <select id="edit-profile-type" value={editedType} onChange={(e) => setEditedType(e.target.value)} className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-yellow-500 focus:border-yellow-500">
                                        <option value="planta">Planta</option>
                                        <option value="transporte">Transporte</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                </div>
                                <div className="flex justify-end gap-4 pt-4">
                                    <button type="button" onClick={handleCloseEditModal} className="px-4 py-2 rounded text-slate-300 hover:bg-gray-600 transition-colors">Cancelar</button>
                                    <button type="submit" disabled={loading} className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:bg-gray-500 transition-colors">
                                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <h3 className="text-lg font-semibold mt-8 mb-2">Perfiles Existentes</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-[#0e1a2d]">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase">Nombre</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase">CUIT</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase">Tipo</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {loadingProfiles ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-4">Cargando perfiles...</td>
                                </tr>
                            ) : (
                                profiles.map(profile => (
                                    <tr key={profile.id}>
                                        <td className="px-4 py-2 whitespace-nowrap">{profile.name}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{profile.cuit || 'No asignado'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap capitalize">{profile.type}</td>
                                        <td className="px-4 py-2">
                                            <button onClick={() => handleOpenEditModal(profile)} className="text-yellow-400 hover:underline text-xs">Editar</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
};

export default GestionPerfilesPage;

