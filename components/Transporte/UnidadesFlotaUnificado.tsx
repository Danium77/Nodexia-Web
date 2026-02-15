import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import { useRouter } from 'next/router';
import FormCard from '../ui/FormCard';
import CrearUnidadModal from './CrearUnidadModal';
import {
  TruckIcon,
  UserIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PencilIcon,
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

interface UnidadOperativa {
  id: string;
  codigo: string;
  nombre: string;
  chofer_id: string;
  camion_id: string;
  acoplado_id?: string;
  activo: boolean;
  horas_conducidas_hoy: number;
  necesita_descanso_obligatorio: boolean;
  notas?: string;
  chofer_nombre?: string;
  chofer_apellido?: string;
  chofer_telefono?: string;
  camion_patente?: string;
  camion_marca?: string;
  camion_modelo?: string;
  acoplado_patente?: string;
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

  // Unidades Operativas
  const [unidadesOp, setUnidadesOp] = useState<UnidadOperativa[]>([]);
  const [showCrearUnidad, setShowCrearUnidad] = useState(false);

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

      const [camRes, acoRes, choRes, uniRes] = await Promise.all([
        supabase.from('camiones').select('id, patente, marca, modelo, anio, foto_url').eq('empresa_id', ue.empresa_id).order('fecha_alta', { ascending: false }),
        supabase.from('acoplados').select('id, patente, marca, modelo, anio, foto_url').eq('empresa_id', ue.empresa_id).order('fecha_alta', { ascending: false }),
        supabase.from('choferes').select('id, nombre, apellido, dni, telefono, foto_url, usuario_id').eq('empresa_id', ue.empresa_id).order('nombre', { ascending: true }),
        supabase.from('vista_disponibilidad_unidades').select('*').eq('empresa_id', ue.empresa_id).order('codigo', { ascending: true }),
      ]);

      setCamiones(camRes.data || []);
      setAcoplados(acoRes.data || []);
      setChoferes(choRes.data || []);
      setUnidadesOp(uniRes.data || []);
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

  const getEstadoBadge = (u: UnidadOperativa) => {
    if (!u.activo) return { text: 'Inactiva', color: 'bg-gray-500/20 text-gray-400', icon: '❌' };
    if (u.necesita_descanso_obligatorio) return { text: 'Descanso', color: 'bg-red-500/20 text-red-400', icon: '🛑' };
    if (u.horas_conducidas_hoy >= 7) return { text: 'Cerca límite', color: 'bg-yellow-500/20 text-yellow-400', icon: '⚠️' };
    return { text: 'Disponible', color: 'bg-green-500/20 text-green-400', icon: '✅' };
  };

  const toggleActivo = async (unidadId: string, nuevoEstado: boolean) => {
    try {
      await supabase.from('unidades_operativas').update({ activo: nuevoEstado }).eq('id', unidadId);
      loadAll();
    } catch (err: any) {
      console.error('Error al actualizar unidad:', err);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* ═══════════ UNIDADES OPERATIVAS ═══════════ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <TruckIcon className="h-5 w-5 text-indigo-400" />
            Unidades Operativas
            <span className="text-xs font-normal text-gray-400">({unidadesOp.length})</span>
          </h3>
          <button
            onClick={() => setShowCrearUnidad(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-xs font-medium hover:from-indigo-700 hover:to-indigo-800 transition-all shadow"
          >
            <PlusIcon className="h-4 w-4" />
            Nueva Unidad
          </button>
        </div>

        {unidadesOp.length === 0 ? (
          <div className="bg-gray-800/40 border border-dashed border-gray-600 rounded-xl p-6 text-center">
            <TruckIcon className="mx-auto h-10 w-10 text-gray-600 mb-2" />
            <p className="text-gray-400 text-sm">No hay unidades operativas creadas</p>
            <p className="text-gray-500 text-xs mt-1">Una unidad operativa combina un chofer + camión + acoplado (opcional) para asignar a despachos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unidadesOp.map(u => {
              const badge = getEstadoBadge(u);
              return (
                <div key={u.id} className={`bg-gray-800/60 border rounded-xl p-4 transition-all ${
                  u.activo ? 'border-gray-700 hover:border-indigo-500/50' : 'border-gray-700/50 opacity-60'
                }`}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{u.nombre}</h4>
                      {u.codigo && <p className="text-[10px] text-gray-500 font-mono">{u.codigo}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badge.color} flex-shrink-0`}>
                      {badge.icon} {badge.text}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-4">👤</span>
                      <span className="text-gray-300">{u.chofer_nombre} {u.chofer_apellido}</span>
                      {u.chofer_telefono && <span className="text-gray-500 text-[10px]">📞 {u.chofer_telefono}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-4">🚛</span>
                      <span className="text-gray-300 font-mono">{u.camion_patente}</span>
                      <span className="text-gray-500 text-[10px]">{u.camion_marca} {u.camion_modelo}</span>
                    </div>
                    {u.acoplado_patente && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-4">🔗</span>
                        <span className="text-gray-300 font-mono">{u.acoplado_patente}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-4">⏱️</span>
                      <span className={`font-medium ${
                        u.horas_conducidas_hoy >= 8 ? 'text-red-400' :
                        u.horas_conducidas_hoy >= 6 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {u.horas_conducidas_hoy.toFixed(1)}h / 9h
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 pt-2 border-t border-gray-700/50 flex items-center gap-2">
                    <button
                      onClick={() => toggleActivo(u.id, !u.activo)}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                        u.activo
                          ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                          : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                      }`}
                    >
                      {u.activo ? '⏸ Desactivar' : '▶ Activar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Crear Unidad */}
      {empresaId && (
        <CrearUnidadModal
          isOpen={showCrearUnidad}
          onClose={() => setShowCrearUnidad(false)}
          onSuccess={() => { setShowCrearUnidad(false); loadAll(); }}
          empresaId={empresaId}
        />
      )}

      {/* ═══════════ INVENTARIO DE FLOTA ═══════════ */}
      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-base font-bold text-white mb-3">Inventario de Flota</h3>
      </div>

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
