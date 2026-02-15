import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import { useRouter } from 'next/router';
import FormCard from '../ui/FormCard';
import {
  TruckIcon,
  UserIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

type FiltroTipo = 'todos' | 'camiones' | 'acoplados' | 'choferes';

interface Camion {
  id: string;
  patente: string;
  marca: string;
  modelo: string;
  anio?: number;
  foto_url?: string;
}

interface Acoplado {
  id: string;
  patente: string;
  marca: string;
  modelo: string;
  anio?: number;
  foto_url?: string;
}

interface Chofer {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono?: string;
  foto_url?: string;
  usuario_id?: string;
}

export default function UnidadesFlotaUnificado() {
  const { user, userEmpresas } = useUserRole();
  const router = useRouter();
  const [filtro, setFiltro] = useState<FiltroTipo>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [camiones, setCamiones] = useState<Camion[]>([]);
  const [acoplados, setAcoplados] = useState<Acoplado[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  // Formulario agregar
  const [showAgregar, setShowAgregar] = useState(false);
  const [tipoAgregar, setTipoAgregar] = useState<'camion' | 'acoplado'>('camion');
  const [formPatente, setFormPatente] = useState('');
  const [formMarca, setFormMarca] = useState('');
  const [formModelo, setFormModelo] = useState('');
  const [formAnio, setFormAnio] = useState('');
  const [formFoto, setFormFoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const fotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAll();
  }, [user, userEmpresas]);

  const loadAll = async () => {
    try {
      setLoading(true);

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { data: ue } = await supabase
        .from('usuarios_empresa')
        .select('empresa_id')
        .eq('user_id', currentUser.id)
        .eq('activo', true)
        .single();

      if (!ue) return;
      setEmpresaId(ue.empresa_id);

      const [camRes, acoRes, choRes] = await Promise.all([
        supabase.from('camiones').select('id, patente, marca, modelo, anio, foto_url').eq('empresa_id', ue.empresa_id).order('fecha_alta', { ascending: false }),
        supabase.from('acoplados').select('id, patente, marca, modelo, anio, foto_url').eq('empresa_id', ue.empresa_id).order('fecha_alta', { ascending: false }),
        supabase.from('choferes').select('id, nombre, apellido, dni, telefono, foto_url, usuario_id').eq('empresa_id', ue.empresa_id).order('nombre', { ascending: true }),
      ]);

      setCamiones(camRes.data || []);
      setAcoplados(acoRes.data || []);
      setChoferes(choRes.data || []);
    } catch (err) {
      console.error('Error cargando flota:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAgregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !empresaId) return;
    setSaving(true);
    setFormError('');

    try {
      let foto_url = null;
      if (formFoto) {
        const ext = formFoto.name.split('.').pop();
        const fileName = `${formPatente.replace(/\s/g, '_')}_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('flota').upload(fileName, formFoto);
        if (upErr) throw upErr;
        foto_url = supabase.storage.from('flota').getPublicUrl(fileName).data.publicUrl;
      }

      const tabla = tipoAgregar === 'camion' ? 'camiones' : 'acoplados';
      const { error: insErr } = await supabase.from(tabla).insert([{
        patente: formPatente,
        marca: formMarca,
        modelo: formModelo,
        anio: formAnio ? parseInt(formAnio) : null,
        foto_url,
        empresa_id: empresaId,
        usuario_alta: user.id
      }]);
      if (insErr) throw insErr;

      setFormPatente(''); setFormMarca(''); setFormModelo(''); setFormAnio(''); setFormFoto(null);
      if (fotoRef.current) fotoRef.current.value = '';
      setShowAgregar(false);
      loadAll();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Filtrar y buscar
  const matchBusqueda = (text: string) => text.toLowerCase().includes(busqueda.toLowerCase());

  const camionesFilt = camiones.filter(c =>
    (filtro === 'todos' || filtro === 'camiones') &&
    (!busqueda || matchBusqueda(c.patente) || matchBusqueda(c.marca) || matchBusqueda(c.modelo))
  );
  const acopladosFilt = acoplados.filter(a =>
    (filtro === 'todos' || filtro === 'acoplados') &&
    (!busqueda || matchBusqueda(a.patente) || matchBusqueda(a.marca) || matchBusqueda(a.modelo))
  );
  const choferesFilt = choferes.filter(ch =>
    (filtro === 'todos' || filtro === 'choferes') &&
    (!busqueda || matchBusqueda(ch.nombre) || matchBusqueda(ch.apellido) || matchBusqueda(ch.dni))
  );

  const totalFilt = camionesFilt.length + acopladosFilt.length + choferesFilt.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" />
        <p className="ml-4 text-gray-400">Cargando flota...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-xs uppercase">Total</p>
          <p className="text-2xl font-bold text-white">{camiones.length + acoplados.length + choferes.length}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-900/20 to-gray-900 rounded-xl p-4 border border-blue-700/30">
          <p className="text-gray-400 text-xs uppercase">🚛 Camiones</p>
          <p className="text-2xl font-bold text-blue-400">{camiones.length}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-900/20 to-gray-900 rounded-xl p-4 border border-purple-700/30">
          <p className="text-gray-400 text-xs uppercase">🔗 Acoplados</p>
          <p className="text-2xl font-bold text-purple-400">{acoplados.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-900/20 to-gray-900 rounded-xl p-4 border border-green-700/30">
          <p className="text-gray-400 text-xs uppercase">👥 Choferes</p>
          <p className="text-2xl font-bold text-green-400">{choferes.length}</p>
        </div>
      </div>

      {/* Filtros + Busqueda + Agregar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'todos', label: 'Todos', count: camiones.length + acoplados.length + choferes.length },
            { key: 'camiones', label: '🚛 Camiones', count: camiones.length },
            { key: 'acoplados', label: '🔗 Acoplados', count: acoplados.length },
            { key: 'choferes', label: '👥 Choferes', count: choferes.length },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filtro === f.key
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar patente, nombre..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowAgregar(!showAgregar)}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-all"
          >
            {showAgregar ? <ChevronUpIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
            Agregar
          </button>
        </div>
      </div>

      {/* Formulario agregar colapsable */}
      {showAgregar && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setTipoAgregar('camion')}
              className={`px-3 py-1 rounded text-xs font-medium ${tipoAgregar === 'camion' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              🚛 Camión
            </button>
            <button
              onClick={() => setTipoAgregar('acoplado')}
              className={`px-3 py-1 rounded text-xs font-medium ${tipoAgregar === 'acoplado' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              🔗 Acoplado
            </button>
          </div>
          <form onSubmit={handleAgregar} className="flex flex-col md:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">Patente</label>
              <input type="text" required value={formPatente} onChange={e => setFormPatente(e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-white" placeholder="ABC123" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">Marca</label>
              <input type="text" required value={formMarca} onChange={e => setFormMarca(e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-white" placeholder="Mercedes" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">Modelo</label>
              <input type="text" required value={formModelo} onChange={e => setFormModelo(e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-white" placeholder="Actros" />
            </div>
            <div className="w-24">
              <label className="text-xs text-gray-400 mb-1 block">Año</label>
              <input type="number" min="1900" max="2100" value={formAnio} onChange={e => setFormAnio(e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-white" placeholder="2022" />
            </div>
            <button type="submit" disabled={saving}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium disabled:opacity-50">
              {saving ? 'Guardando...' : 'Agregar'}
            </button>
          </form>
          {formError && <p className="text-red-400 text-sm mt-2">{formError}</p>}
          <p className="text-xs text-gray-500 mt-2">Para agregar choferes, búscalos por DNI en la sección Admin Nodexia.</p>
        </div>
      )}

      {/* Grid de Cards */}
      {totalFilt === 0 ? (
        <div className="text-center py-12">
          <TruckIcon className="mx-auto h-16 w-16 text-gray-600" />
          <p className="mt-4 text-gray-400">No hay unidades registradas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* Camiones */}
          {camionesFilt.map(c => (
            <div
              key={`cam-${c.id}`}
              className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 hover:border-blue-500/50 transition-all group cursor-pointer"
              onClick={() => router.push(`/camiones/${c.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-400">
                  🚛 Camión
                </span>
              </div>
              <p className="text-lg font-bold text-white font-mono tracking-wider">{c.patente}</p>
              <p className="text-sm text-gray-400 mt-1">{c.marca} {c.modelo}</p>
              {c.anio && <p className="text-xs text-gray-500">Año {c.anio}</p>}
            </div>
          ))}

          {/* Acoplados */}
          {acopladosFilt.map(a => (
            <div
              key={`aco-${a.id}`}
              className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 hover:border-purple-500/50 transition-all group cursor-pointer"
              onClick={() => router.push(`/acoplados/${a.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-400">
                  🔗 Acoplado
                </span>
              </div>
              <p className="text-lg font-bold text-white font-mono tracking-wider">{a.patente}</p>
              <p className="text-sm text-gray-400 mt-1">{a.marca} {a.modelo}</p>
              {a.anio && <p className="text-xs text-gray-500">Año {a.anio}</p>}
            </div>
          ))}

          {/* Choferes */}
          {choferesFilt.map(ch => (
            <div
              key={`cho-${ch.id}`}
              className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 hover:border-green-500/50 transition-all group cursor-pointer"
              onClick={() => router.push(`/choferes/${ch.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-500/20 text-green-400">
                  👥 Chofer
                </span>
              </div>
              <p className="text-lg font-bold text-white">{ch.nombre} {ch.apellido}</p>
              <p className="text-sm text-gray-400 mt-1 font-mono">DNI: {ch.dni}</p>
              {ch.telefono && <p className="text-xs text-gray-500">📞 {ch.telefono}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
