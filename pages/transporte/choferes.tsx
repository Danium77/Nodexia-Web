 import React, { useState, useRef, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import FormCard from '../../components/ui/FormCard';
import { useChoferes } from '../../lib/hooks/useChoferes';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';

export default function ChoferesGestion() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  // Eliminado campo email
  const [foto, setFoto] = useState<File|null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [currentUserId, setCurrentUserId] = useState<string|null>(null);
  const { choferes, loading: loadingChoferes, fetchChoferes, addChofer, deleteChofer } = useChoferes();
  const router = useRouter();

  // Get current user ID on component mount
  useEffect(() => {
    async function getCurrentUser() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error getting user:', error);
          setError('Error al obtener usuario actual');
          return;
        }
        if (user) {
          setCurrentUserId(user.id);
        } else {
          setError('Usuario no encontrado');
        }
      } catch (err) {
        console.error('Exception getting user:', err);
        setError('Error al cargar datos del usuario');
      }
    }
    getCurrentUser();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    // Validate required fields
    if (!nombre.trim() || !apellido.trim() || !dni.trim()) {
      setError('Nombre, apellido y DNI son obligatorios');
      setLoading(false);
      return;
    }

    if (!currentUserId) {
      setError('No se pudo obtener el usuario actual');
      setLoading(false);
      return;
    }

    let foto_url = null;
    try {
      // Subir foto si fue proporcionada
      if (foto) {
        try {
          const fileExt = foto.name.split('.').pop();
          const fileName = `choferes/${dni.replace(/\s/g, '_')}_${Date.now()}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('flota')
            .upload(fileName, foto, {
              cacheControl: '3600',
              upsert: false
            });
            
          if (uploadError) {
            console.error('Error al subir foto:', uploadError);
            // Continuar sin foto si falla la subida
            setError(`Advertencia: No se pudo subir la foto. El chofer se guardará sin foto.`);
          } else if (uploadData) {
            const { data: urlData } = supabase.storage.from('flota').getPublicUrl(fileName);
            foto_url = urlData.publicUrl;
          }
        } catch (photoError) {
          console.error('Error en subida de foto:', photoError);
          setError('Advertencia: No se pudo subir la foto. El chofer se guardará sin foto.');
        }
      }
      
      const choferData = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni: dni.trim(),
        telefono: telefono.trim() || null,
        foto_url,
        id_transporte: currentUserId,
        usuario_alta: currentUserId
      };

      if (!currentUserId) {
        throw new Error('No se pudo obtener el ID del usuario actual');
      }
      
      await addChofer(choferData);
      
      // Limpiar el formulario después del éxito
      setNombre(''); 
      setApellido(''); 
      setDni(''); 
      setTelefono(''); 
      setFoto(null);
      if (fotoInputRef.current) fotoInputRef.current.value = '';
      
      // Recargar la lista de choferes
      fetchChoferes();
      
      // Limpiar errores previos
      setError(null);
    } catch (err: unknown) {
      console.error('Error al agregar chofer:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error inesperado al guardar el chofer');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout pageTitle="Gestión de Choferes">
      <div className="w-full bg-gray-800 rounded-lg shadow-md p-8 mt-8">
        <h2 className="text-2xl font-bold text-yellow-400 mb-6">Gestión de Choferes</h2>
        {/* Formulario alineado igual que flota */}
        <div className="mb-6">
          <FormCard>
            <form onSubmit={handleSubmit} className="w-full flex flex-col md:flex-row md:items-end md:gap-6 gap-4">
            <div className="flex-1 flex flex-col">
              <label className="block text-gray-200 mb-1 font-semibold">Nombre</label>
              <input type="text" className="rounded p-2 border border-gray-600 bg-gray-800 text-white" placeholder="Ej: Juan" value={nombre} onChange={e => setNombre(e.target.value)} required />
            </div>
            <div className="flex-1 flex flex-col">
              <label className="block text-gray-200 mb-1 font-semibold">Apellido</label>
              <input type="text" className="rounded p-2 border border-gray-600 bg-gray-800 text-white" placeholder="Ej: Pérez" value={apellido} onChange={e => setApellido(e.target.value)} required />
            </div>
            <div className="flex-1 flex flex-col">
              <label className="block text-gray-200 mb-1 font-semibold">DNI</label>
              <input type="text" className="rounded p-2 border border-gray-600 bg-gray-800 text-white" placeholder="Ej: 30123456" value={dni} onChange={e => setDni(e.target.value)} required />
            </div>
            <div className="flex-1 flex flex-col">
              <label className="block text-gray-200 mb-1 font-semibold">Teléfono</label>
              <input type="text" className="rounded p-2 border border-gray-600 bg-gray-800 text-white" placeholder="Ej: 1122334455" value={telefono} onChange={e => setTelefono(e.target.value)} />
            </div>
            <div className="flex-1 flex flex-col">
              <label className="block text-gray-200 mb-1 font-semibold">Foto</label>
              <input 
                id="foto-chofer" 
                type="file" 
                accept="image/*" 
                ref={fotoInputRef} 
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file) {
                    // Validate file size (max 5MB)
                    if (file.size > 5 * 1024 * 1024) {
                      setError('La foto no puede ser mayor a 5MB');
                      e.target.value = '';
                      return;
                    }
                    // Validate file type
                    if (!file.type.startsWith('image/')) {
                      setError('Solo se permiten archivos de imagen');
                      e.target.value = '';
                      return;
                    }
                  }
                  setFoto(file);
                  setError(null); // Clear any previous file-related errors
                }} 
                className="block w-full text-sm text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-600 file:text-white hover:file:bg-yellow-600" 
              />
              {foto && (
                <div className="text-xs text-green-400 mt-1">
                  ✓ {foto.name}
                </div>
              )}
            </div>
            <div className="flex flex-col md:w-auto mt-2 md:mt-0">
              <label className="block invisible mb-1">Agregar</label>
              <button type="submit" disabled={loading} className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded font-bold shadow">{loading ? 'Guardando...' : 'Agregar'}</button>
            </div>
            </form>
          </FormCard>
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mt-4">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>
        <div className="mt-6">
          <div className="bg-gray-800 rounded-xl shadow p-0 md:p-2 border border-gray-700">
          <table className="w-full text-gray-200">
            <thead>
              <tr className="bg-gray-700">
                <th className="p-3 text-left">Nombre</th>
                <th className="p-3 text-left">Apellido</th>
                <th className="p-3 text-left">DNI</th>
                <th className="p-3 text-left">Teléfono</th>
                <th className="p-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loadingChoferes ? (
                <tr><td colSpan={5} className="text-center p-6 text-gray-400">Cargando...</td></tr>
              ) : choferes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-6 text-gray-400">Sin choferes cargados.</td>
                </tr>
              ) : (
                choferes.map((v: { id?: string; nombre?: string; apellido?: string; dni?: string; telefono?: string }, i: number) => (
                  <tr key={v.id || i} className="hover:bg-gray-700 transition">
                    <td className="p-3">{v.nombre}</td>
                    <td className="p-3">{v.apellido}</td>
                    <td className="p-3 font-mono text-yellow-200">{v.dni}</td>
                    <td className="p-3">{v.telefono}</td>
                    <td className="p-3 flex gap-2">
                      <button className="text-yellow-400 underline hover:text-yellow-300" onClick={() => router.push(`/choferes/${v.id}`)}>Ver detalle</button>
                      <button className="text-red-400 hover:text-red-300" onClick={() => deleteChofer(v.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </AdminLayout>
  );
}
