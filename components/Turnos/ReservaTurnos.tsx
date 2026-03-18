import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserRole } from '@/lib/contexts/UserRoleContext';

type Planta = { id: string; nombre: string };

type Ventana = {
  id: string;
  nombre: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  capacidad: number;
  ocupados?: number;
  disponibles?: number;
  activa: boolean;
};

type Reserva = {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  ventana_id: string;
  despacho_id?: string | null;
  patente_camion?: string | null;
  chofer_nombre?: string | null;
};

async function authFetch(url: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sesion no disponible');
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Error de API');
  return json;
}

export default function ReservaTurnos() {
  const { empresaId } = useUserRole();
  const [plantas, setPlantas] = useState<Planta[]>([]);
  const [plantId, setPlantId] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [ventanas, setVentanas] = useState<Ventana[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [despachos, setDespachos] = useState<Array<{ id: string; pedido_id: string }>>([]);
  const [selectedVentana, setSelectedVentana] = useState('');
  const [selectedDespacho, setSelectedDespacho] = useState('');
  const [patente, setPatente] = useState('');
  const [chofer, setChofer] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlantas = useCallback(async () => {
    const { data, error } = await supabase
      .from('empresas')
      .select('id, nombre')
      .eq('tipo_empresa', 'planta')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) throw new Error(error.message);
    const list = data || [];
    setPlantas(list as Planta[]);
    if (list.length > 0) {
      setPlantId((prev) => prev || list[0].id);
    }
  }, []);

  const loadDespachos = useCallback(async () => {
    if (!empresaId) return;
    const { data, error } = await supabase
      .from('despachos')
      .select('id, pedido_id')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    setDespachos((data || []) as Array<{ id: string; pedido_id: string }>);
  }, [empresaId]);

  const loadReservas = useCallback(async () => {
    const res = await authFetch('/api/turnos/reservas');
    setReservas(res.data || []);
  }, []);

  const loadVentanas = useCallback(async () => {
    if (!plantId) return;
    const res = await authFetch(`/api/turnos/ventanas?empresa_planta_id=${plantId}&fecha=${fecha}`);
    const activas = (res.data || []).filter((v: Ventana) => v.activa);
    setVentanas(activas);
  }, [plantId, fecha]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadPlantas(), loadDespachos(), loadReservas()]);
    } catch (e: any) {
      setError(e.message || 'No se pudo cargar datos');
    } finally {
      setLoading(false);
    }
  }, [loadPlantas, loadDespachos, loadReservas]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    loadVentanas().catch((e: any) => setError(e.message || 'No se pudieron cargar ventanas'));
  }, [loadVentanas]);

  const canReserve = useMemo(() => {
    const target = ventanas.find(v => v.id === selectedVentana);
    return !!target && (target.disponibles || 0) > 0;
  }, [ventanas, selectedVentana]);

  const reservar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (!selectedVentana) {
        throw new Error('Selecciona una ventana');
      }
      await authFetch('/api/turnos/reservas', {
        method: 'POST',
        body: JSON.stringify({
          ventana_id: selectedVentana,
          fecha,
          despacho_id: selectedDespacho || null,
          patente_camion: patente || null,
          chofer_nombre: chofer || null,
        }),
      });
      setSelectedVentana('');
      setSelectedDespacho('');
      setPatente('');
      setChofer('');
      await Promise.all([loadVentanas(), loadReservas()]);
    } catch (e: any) {
      setError(e.message || 'No se pudo reservar turno');
    }
  };

  const cancelar = async (id: string) => {
    try {
      await authFetch('/api/turnos/reservas', {
        method: 'PATCH',
        body: JSON.stringify({ id, estado: 'cancelado' }),
      });
      await Promise.all([loadVentanas(), loadReservas()]);
    } catch (e: any) {
      setError(e.message || 'No se pudo cancelar turno');
    }
  };

  if (loading) {
    return <div className="text-slate-300">Cargando agenda de turnos...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Reservar Turno de Recepcion</h2>
        <p className="text-sm text-slate-400">Selecciona planta, fecha y ventana con cupo disponible.</p>
      </div>

      {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 px-4 py-3 text-sm">{error}</div>}

      <form onSubmit={reservar} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
        <select value={plantId} onChange={(e) => setPlantId(e.target.value)} className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100">
          {plantas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>

        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100" />

        <select value={selectedVentana} onChange={(e) => setSelectedVentana(e.target.value)} className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100">
          <option value="">Ventana</option>
          {ventanas.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nombre} ({v.hora_inicio.slice(0, 5)}-{v.hora_fin.slice(0, 5)}) - cupo {v.disponibles}/{v.capacidad}
            </option>
          ))}
        </select>

        <select value={selectedDespacho} onChange={(e) => setSelectedDespacho(e.target.value)} className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100">
          <option value="">Despacho (opcional)</option>
          {despachos.map((d) => <option key={d.id} value={d.id}>{d.pedido_id}</option>)}
        </select>

        <input value={patente} onChange={(e) => setPatente(e.target.value)} placeholder="Patente" className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100" />
        <div className="flex gap-2">
          <input value={chofer} onChange={(e) => setChofer(e.target.value)} placeholder="Chofer" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100" />
          <button type="submit" disabled={!canReserve} className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold disabled:opacity-50">
            Reservar
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-700 bg-slate-900/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 text-slate-200 font-semibold">Mis reservas</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-800/90 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Horario</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-left">Patente</th>
              <th className="px-3 py-2 text-left">Chofer</th>
              <th className="px-3 py-2 text-left">Accion</th>
            </tr>
          </thead>
          <tbody>
            {reservas.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">No hay reservas aun.</td></tr>
            )}
            {reservas.map((r) => (
              <tr key={r.id} className="border-t border-slate-800">
                <td className="px-3 py-2 text-slate-300">{r.fecha}</td>
                <td className="px-3 py-2 text-slate-300">{r.hora_inicio.slice(0, 5)} - {r.hora_fin.slice(0, 5)}</td>
                <td className="px-3 py-2 text-slate-300">{r.estado}</td>
                <td className="px-3 py-2 text-slate-300">{r.patente_camion || '-'}</td>
                <td className="px-3 py-2 text-slate-300">{r.chofer_nombre || '-'}</td>
                <td className="px-3 py-2 text-slate-300">
                  {r.estado !== 'cancelado' && (
                    <button onClick={() => cancelar(r.id)} className="px-2 py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30">
                      Cancelar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
