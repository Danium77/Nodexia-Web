
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import FormCard from '../ui/FormCard';
// import { useChoferes } from '../../lib/hooks/useChoferes';

export default function FlotaGestion() {
  const router = useRouter();
  const { user } = useUserRole();
  const initialTab = typeof window !== 'undefined' && router.query.tab && ['camion','acoplado'].includes(router.query.tab as string)
    ? router.query.tab as 'camion' | 'acoplado'
    : 'camion';
  const [tab, setTab] = useState<'camion' | 'acoplado'>(initialTab === 'acoplado' ? 'acoplado' : 'camion');

  // Sincronizar tab si cambia la query string
  React.useEffect(() => {
    if (router.query.tab && ['camion','acoplado'].includes(router.query.tab as string)) {
      setTab(router.query.tab as 'camion' | 'acoplado');
    }
  }, [router.query.tab]);
  // Estados para formulario camión
  const [patente, setPatente] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [foto, setFoto] = useState<File|null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [camiones, setCamiones] = useState<Array<{ id?: string; patente?: string; marca?: string; modelo?: string; anio?: number }>>([]);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  // Estados para formulario acoplado
  const [patenteA, setPatenteA] = useState('');
  const [marcaA, setMarcaA] = useState('');
  const [modeloA, setModeloA] = useState('');
  const [anioA, setAnioA] = useState('');
  const [fotoA, setFotoA] = useState<File|null>(null);
  const [loadingA, setLoadingA] = useState(false);
  const [errorA, setErrorA] = useState<string|null>(null);
  const [acoplados, setAcoplados] = useState<Array<{ id?: string; patente?: string; marca?: string; modelo?: string; anio?: number }>>([]);
  const fotoInputRefA = useRef<HTMLInputElement>(null);
  // ...existing code...

  // Cargar camiones/acoplados al montar
  React.useEffect(() => {
    if (tab === 'camion') fetchCamiones();
    if (tab === 'acoplado') fetchAcoplados();
  }, [tab]);

  async function fetchCamiones() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userEmpresa } = await supabase
      .from('usuarios_empresa')
      .select('empresa_id')
      .eq('user_id', user.id)
      .eq('activo', true)
      .single();

    if (!userEmpresa) return;

    const { data, error } = await supabase
      .from('camiones')
      .select('*')
      .eq('id_transporte', userEmpresa.empresa_id)
      .order('fecha_alta', { ascending: false });
      
    if (!error) setCamiones(data || []);
  }

  async function fetchAcoplados() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userEmpresa } = await supabase
      .from('usuarios_empresa')
      .select('empresa_id')
      .eq('user_id', user.id)
      .eq('activo', true)
      .single();

    if (!userEmpresa) return;

    const { data, error } = await supabase
      .from('acoplados')
      .select('*')
      .eq('id_transporte', userEmpresa.empresa_id)
      .order('fecha_alta', { ascending: false });
      
    if (!error) setAcoplados(data || []);
  }

  async function handleSubmitCamion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    if (!user) {
      setError('Usuario no autenticado');
      setLoading(false);
      return;
    }
    
    let foto_url = null;
    try {
      if (foto) {
        const fileExt = foto.name.split('.').pop();
        const fileName = `${patente.replace(/\s/g, '_')}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('flota').upload(fileName, foto);
        if (uploadError) throw uploadError;
        foto_url = supabase.storage.from('flota').getPublicUrl(fileName).data.publicUrl;
      }
      
      // Obtener empresa del usuario
      const { data: userEmpresa } = await supabase
        .from('usuarios_empresa')
        .select('empresa_id')
        .eq('user_id', user.id)
        .eq('activo', true)
        .single();

      if (!userEmpresa) {
        throw new Error('No se encontró empresa asociada');
      }
      
      const { error: insertError } = await supabase.from('camiones').insert([
        {
          patente,
          marca,
          modelo,
          anio: anio ? parseInt(anio) : null,
          foto_url,
          id_transporte: userEmpresa.empresa_id,
          usuario_alta: user.id
        }
      ]);
      if (insertError) throw insertError;
      setPatente(''); setMarca(''); setModelo(''); setAnio(''); setFoto(null);
      if (fotoInputRef.current) fotoInputRef.current.value = '';
      fetchCamiones();
    } catch (err: unknown) {
      console.error('Error al agregar camión:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        setError((err as any).message);
      } else {
        setError('Error al guardar camión');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitAcoplado(e: React.FormEvent) {
    e.preventDefault();
    setErrorA(null);
    setLoadingA(true);
    
    if (!user) {
      setErrorA('Usuario no autenticado');
      setLoadingA(false);
      return;
    }
    
    let foto_url = null;
    try {
      if (fotoA) {
        const fileExt = fotoA.name.split('.').pop();
        const fileName = `${patenteA.replace(/\s/g, '_')}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('flota').upload(fileName, fotoA);
        if (uploadError) throw uploadError;
        foto_url = supabase.storage.from('flota').getPublicUrl(fileName).data.publicUrl;
      }
      
      // Obtener empresa del usuario
      const { data: userEmpresa } = await supabase
        .from('usuarios_empresa')
        .select('empresa_id')
        .eq('user_id', user.id)
        .eq('activo', true)
        .single();

      if (!userEmpresa) {
        throw new Error('No se encontró empresa asociada');
      }
      
      const { error: insertError } = await supabase.from('acoplados').insert([
        {
          patente: patenteA,
          marca: marcaA,
          modelo: modeloA,
          anio: anioA ? parseInt(anioA) : null,
          foto_url,
          id_transporte: userEmpresa.empresa_id,
          usuario_alta: user.id
        }
      ]);
      if (insertError) throw insertError;
      setPatenteA(''); setMarcaA(''); setModeloA(''); setAnioA(''); setFotoA(null);
      if (fotoInputRefA.current) fotoInputRefA.current.value = '';
      fetchAcoplados();
    } catch (err: unknown) {
      console.error('Error al agregar acoplado:', err);
      if (err instanceof Error) {
        setErrorA(err.message);
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        setErrorA((err as any).message);
      } else {
        setErrorA('Error al guardar acoplado');
      }
    } finally {
      setLoadingA(false);
    }
  }

    return (
    <div>
      <h3 className="text-lg font-bold text-green-300 mb-4">Gestión de Camiones y Acoplados</h3>
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          className={`px-4 py-2 rounded-t ${tab === 'camion' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-200'}`}
          onClick={() => setTab('camion')}
        >
          Camiones
        </button>
        <button
          className={`px-4 py-2 rounded-t ${tab === 'acoplado' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-200'}`}
          onClick={() => setTab('acoplado')}
        >
          Acoplados
        </button>
      </div>
      {/* Formulario y listado según tab */}
      {tab === 'camion' ? (
        <>
          {/* Formulario camión */}
          <div className="mb-6">
            <FormCard>
              <form onSubmit={handleSubmitCamion} className="w-full flex flex-col md:flex-row md:items-end md:gap-6 gap-4">
              <div className="flex-1 flex flex-col">
                <label className="block text-gray-200 mb-1 font-semibold">Patente</label>
                <input type="text" className="rounded p-2 border border-gray-600 bg-gray-800 text-white" placeholder="Ej: ABC123" value={patente} onChange={e => setPatente(e.target.value)} required />
              </div>
              <div className="flex-1 flex flex-col">
                <label className="block text-gray-200 mb-1 font-semibold">Marca</label>
                <input type="text" className="rounded p-2 border border-gray-600 bg-gray-800 text-white" placeholder="Ej: Mercedes" value={marca} onChange={e => setMarca(e.target.value)} required />
              </div>
              <div className="flex-1 flex flex-col">
                <label className="block text-gray-200 mb-1 font-semibold">Modelo</label>
                <input type="text" className="rounded p-2 border border-gray-600 bg-gray-800 text-white" placeholder="Ej: Actros" value={modelo} onChange={e => setModelo(e.target.value)} required />
              </div>
              <div className="flex-1 flex flex-col">
                <label className="block text-gray-200 mb-1 font-semibold">Año</label>
                <input type="number" className="rounded p-2 border border-gray-600 bg-gray-800 text-white" placeholder="Ej: 2022" min="1900" max="2100" value={anio} onChange={e => setAnio(e.target.value)} />
              </div>
              <div className="flex-1 flex flex-col">
                <label className="block text-gray-200 mb-1 font-semibold">Foto</label>
                <input id="foto-camion" type="file" accept="image/*" ref={fotoInputRef} onChange={e => setFoto(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-600 file:text-white hover:file:bg-green-600" />
              </div>
              <div className="flex flex-col md:w-auto mt-2 md:mt-0">
                <label className="block invisible mb-1">Agregar</label>
                <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold shadow">{loading ? 'Guardando...' : 'Agregar'}</button>
              </div>
              </form>
            </FormCard>
            {error && <div className="text-red-400 mt-2">{error}</div>}
          </div>
          {/* Listado camiones */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-bold text-green-300">Listado de camiones</h4>
              <button className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-1 rounded shadow font-semibold transition text-sm" onClick={() => router.push('/transporte/configuracion')}>← Volver a tarjetas</button>
            </div>
            <div className="bg-gray-800 rounded-xl shadow p-0 md:p-2 border border-gray-700">
              <table className="w-full text-gray-200">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="p-3 text-left">Patente</th>
                    <th className="p-3 text-left">Marca</th>
                    <th className="p-3 text-left">Modelo</th>
                    <th className="p-3 text-left">Año</th>
                    <th className="p-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {camiones && camiones.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center p-6 text-gray-400">Sin camiones cargados.</td>
                    </tr>
                  ) : (
                    camiones && camiones.map((v, i) => (
                      <tr key={i} className="hover:bg-gray-700 transition">
                        <td className="p-3 font-mono text-green-200">{v.patente}</td>
                        <td className="p-3">{v.marca}</td>
                        <td className="p-3">{v.modelo}</td>
                        <td className="p-3">{v.anio}</td>
                        <td className="p-3 flex gap-2">
                          <button className="text-green-400 underline hover:text-green-300" onClick={() => router.push(`/camiones/${v.id}`)}>Ver detalle</button>
                          <button className="text-red-400 hover:text-red-300">Eliminar</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Formulario acoplado */}
          <div className="mb-6">
            <FormCard>
              <form onSubmit={handleSubmitAcoplado} className="w-full flex flex-col md:flex-row md:items-end md:gap-6 gap-4">
              <div className="flex-1 flex flex-col">
                <label className="block text-gray-200 mb-1 font-semibold">Patente</label>
                <input type="text" className="rounded p-2 border border-gray-600 bg-gray-800 text-white" placeholder="Ej: ABC123" value={patenteA} onChange={e => setPatenteA(e.target.value)} required />
              </div>
              <div className="flex-1 flex flex-col">
                <label className="block text-gray-200 mb-1 font-semibold">Marca</label>
                <input type="text" className="rounded p-2 border border-gray-600 bg-gray-800 text-white" placeholder="Ej: Salto" value={marcaA} onChange={e => setMarcaA(e.target.value)} required />
              </div>
              <div className="flex-1 flex flex-col">
                <label className="block text-gray-200 mb-1 font-semibold">Modelo</label>
                <input type="text" className="rounded p-2 border border-gray-600 bg-gray-800 text-white" placeholder="Ej: 2020" value={modeloA} onChange={e => setModeloA(e.target.value)} required />
              </div>
              <div className="flex-1 flex flex-col">
                <label className="block text-gray-200 mb-1 font-semibold">Año</label>
                <input type="number" className="rounded p-2 border border-gray-600 bg-gray-800 text-white" placeholder="Ej: 2022" min="1900" max="2100" value={anioA} onChange={e => setAnioA(e.target.value)} />
              </div>
              <div className="flex-1 flex flex-col">
                <label className="block text-gray-200 mb-1 font-semibold">Foto</label>
                <input id="foto-acoplado" type="file" accept="image/*" ref={fotoInputRefA} onChange={e => setFotoA(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-600 file:text-white hover:file:bg-green-600" />
              </div>
              <div className="flex flex-col md:w-auto mt-2 md:mt-0">
                <label className="block invisible mb-1">Agregar</label>
                <button type="submit" disabled={loadingA} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold shadow">{loadingA ? 'Guardando...' : 'Agregar'}</button>
              </div>
              </form>
            </FormCard>
            {errorA && <div className="text-red-400 mt-2">{errorA}</div>}
          </div>
          {/* Listado acoplados */}
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-lg font-bold text-green-300">Listado de acoplados</h4>
            <button className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-1 rounded shadow font-semibold transition text-sm" onClick={() => router.push('/transporte/configuracion')}>← Volver a tarjetas</button>
          </div>
          <div className="bg-gray-800 rounded-xl shadow p-0 md:p-2 border border-gray-700">
            <table className="w-full text-gray-200">
              <thead>
                <tr className="bg-gray-700">
                  <th className="p-3 text-left">Patente</th>
                  <th className="p-3 text-left">Marca</th>
                  <th className="p-3 text-left">Modelo</th>
                  <th className="p-3 text-left">Año</th>
                  <th className="p-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {acoplados && acoplados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-6 text-gray-400">Sin acoplados cargados.</td>
                  </tr>
                ) : (
                  acoplados && acoplados.map((v, i) => (
                    <tr key={i} className="hover:bg-gray-700 transition">
                      <td className="p-3 font-mono text-green-200">{v.patente}</td>
                      <td className="p-3">{v.marca}</td>
                      <td className="p-3">{v.modelo}</td>
                      <td className="p-3">{v.anio}</td>
                      <td className="p-3 flex gap-2">
                        <button className="text-green-400 underline hover:text-green-300" onClick={() => router.push(`/acoplados/${v.id}`)}>Ver detalle</button>
                        <button className="text-red-400 hover:text-red-300">Eliminar</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
