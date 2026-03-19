import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserRole } from '@/lib/contexts/UserRoleContext';

type Planta = { id: string; nombre: string };

type Slot = {
  ventana_id: string;
  ventana_nombre: string;
  hora_inicio: string;
  hora_fin: string;
  capacidad: number;
  ocupados: number;
  disponibles: number;
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
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [despachos, setDespachos] = useState<Array<{ id: string; pedido_id: string }>>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
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

  const loadSlots = useCallback(async () => {
    if (!plantId) return;
    const res = await authFetch(`/api/turnos/ventanas?empresa_planta_id=${plantId}&fecha=${fecha}&slots=true`);
    setSlots(res.data || []);
    setSelectedSlot(null);
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
    loadSlots().catch((e: any) => setError(e.message || 'No se pudieron cargar slots'));
  }, [loadSlots]);

  const canReserve = useMemo(() => {
    return !!selectedSlot && selectedSlot.disponibles > 0;
  }, [selectedSlot]);

  const reservar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (!selectedSlot) {
        throw new Error('Selecciona un slot horario');
      }
      await authFetch('/api/turnos/reservas', {
        method: 'POST',
        body: JSON.stringify({
          ventana_id: selectedSlot.ventana_id,
          fecha,
          slot_hora_inicio: selectedSlot.hora_inicio,
          slot_hora_fin: selectedSlot.hora_fin,
          despacho_id: selectedDespacho || null,
          patente_camion: patente || null,
          chofer_nombre: chofer || null,
        }),
      });
      setSelectedSlot(null);
      setSelectedDespacho('');
      setPatente('');
      setChofer('');
      await Promise.all([loadSlots(), loadReservas()]);
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
      await Promise.all([loadSlots(), loadReservas()]);
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

      <form onSubmit={reservar} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={plantId} onChange={(e) => setPlantId(e.target.value)} className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100">
            {plantas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100" />
          <select value={selectedDespacho} onChange={(e) => setSelectedDespacho(e.target.value)} className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100">
            <option value="">Despacho (opcional)</option>
            {despachos.map((d) => <option key={d.id} value={d.id}>{d.pedido_id}</option>)}
          </select>
          <div className="flex gap-2">
            <input value={patente} onChange={(e) => setPatente(e.target.value)} placeholder="Patente" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100" />
            <input value={chofer} onChange={(e) => setChofer(e.target.value)} placeholder="Chofer" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100" />
          </div>
        </div>

        {slots.length === 0 && (
          <p className="text-sm text-slate-400">No hay slots disponibles para la fecha seleccionada.</p>
        )}

        {slots.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-2">Selecciona un horario disponible:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {slots.map((s, i) => {
                const pct = s.capacidad > 0 ? s.ocupados / s.capacidad : 0;
                const full = pct >= 1;
                const isSelected = selectedSlot?.hora_inicio === s.hora_inicio && selectedSlot?.ventana_id === s.ventana_id;
                const border = isSelected ? 'border-cyan-400 ring-1 ring-cyan-400' : full ? 'border-red-500/40' : pct >= 0.5 ? 'border-amber-500/40' : 'border-emerald-500/40';
                const bgc = isSelected ? 'bg-cyan-500/20' : full ? 'bg-red-500/10' : pct >= 0.5 ? 'bg-amber-500/10' : 'bg-emerald-500/10';
                const bar = full ? 'bg-red-500' : pct >= 0.5 ? 'bg-amber-500' : 'bg-emerald-500';
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={full}
                    onClick={() => setSelectedSlot(s)}
                    className={`rounded-lg border ${border} ${bgc} p-2 text-center transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110`}
                  >
                    <div className="text-sm font-mono font-bold text-slate-100">{s.hora_inicio}-{s.hora_fin}</div>
                    <div className="text-[10px] text-slate-400 truncate">{s.ventana_nombre}</div>
                    <div className="text-xs text-slate-300">{s.disponibles} disp.</div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(pct * 100, 100)}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={!canReserve} className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold disabled:opacity-50">
            Reservar {selectedSlot ? `${selectedSlot.hora_inicio}-${selectedSlot.hora_fin}` : ''}
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-700 bg-slate-900/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 text-slate-200 font-semibold">Mis reservas</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-800/90 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left">N° Turno</th>
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
              <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">No hay reservas aun.</td></tr>
            )}
            {reservas.map((r) => (
              <tr key={r.id} className="border-t border-slate-800">
                <td className="px-3 py-2 font-mono font-bold text-cyan-300">{(r as any).numero_turno || '-'}</td>
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
