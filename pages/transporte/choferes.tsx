import React, { useState, useRef } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useChoferes } from '../../lib/hooks/useChoferes';
import { supabase } from '../../lib/supabaseClient';

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
  const { choferes, loading: loadingChoferes, error: errorChoferes, fetchChoferes, addChofer, deleteChofer } = useChoferes();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    let foto_url = null;
    try {
      if (foto) {
        const fileExt = foto.name.split('.').pop();
        const fileName = `${dni.replace(/\s/g, '_')}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('flota').upload(fileName, foto);
        if (uploadError) throw uploadError;
        foto_url = supabase.storage.from('flota').getPublicUrl(fileName).data.publicUrl;
      }
      await addChofer({
        nombre,
        apellido,
        dni,
        telefono,
        foto_url,
        id_transporte: '00000000-0000-0000-0000-000000000000', // Reemplazar por el id real
        usuario_alta: null // Reemplazar por el id real si está disponible
      });
      setNombre(''); setApellido(''); setDni(''); setTelefono(''); setFoto(null);
      if (fotoInputRef.current) fotoInputRef.current.value = '';
      fetchChoferes();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout pageTitle="Gestión de Choferes">
      <div className="max-w-5xl mx-auto px-2 py-6">
        <h2 className="text-3xl font-bold text-yellow-400 mb-2">Gestión de Choferes</h2>
        {/* Formulario alineado igual que flota */}
        <div className="mb-6">
          <form onSubmit={handleSubmit} className="w-full bg-gray-700 p-6 rounded-lg flex flex-col md:flex-row md:items-end md:gap-6 gap-4 shadow-md">
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
              <input id="foto-chofer" type="file" accept="image/*" ref={fotoInputRef} onChange={e => setFoto(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-600 file:text-white hover:file:bg-yellow-600" />
            </div>
            <div className="flex flex-col md:w-auto mt-2 md:mt-0">
              <label className="block invisible mb-1">Agregar</label>
              <button type="submit" disabled={loading} className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded font-bold shadow">{loading ? 'Guardando...' : 'Agregar'}</button>
            </div>
          </form>
          {error && <div className="text-red-400 mt-2">{error}</div>}
        </div>
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
                choferes.map((v: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-700 transition">
                    <td className="p-3">{v.nombre}</td>
                    <td className="p-3">{v.apellido}</td>
                    <td className="p-3 font-mono text-yellow-200">{v.dni}</td>
                    <td className="p-3">{v.telefono}</td>
                    <td className="p-3 flex gap-2">
                      <button
                        className="text-yellow-400 underline hover:text-yellow-300"
                        onClick={() => window.location.href = `/choferes/${v.id}`}
                      >
                        Ver detalle
                      </button>
                      <button className="text-red-400 hover:text-red-300" onClick={() => deleteChofer(v.id)}>Eliminar</button>
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
}
