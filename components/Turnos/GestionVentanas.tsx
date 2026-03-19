import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Ventana = {
  id: string;
  nombre: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  capacidad: number;
  duracion_turno_minutos: number;
  activa: boolean;
  ocupados?: number;
  disponibles?: number;
};

type Reserva = {
  id: string;
  numero_turno?: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  patente_camion?: string | null;
  chofer_nombre?: string | null;
  observaciones?: string | null;
  despacho_id?: string | null;
  despacho_pedido_id?: string | null;
};

type Slot = {
  ventana_id: string;
  ventana_nombre: string;
  hora_inicio: string;
  hora_fin: string;
  capacidad: number;
  ocupados: number;
  disponibles: number;
};

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const GRID_DIAS: Array<{ label: string; dow: number }> = [
  { label: 'Lun', dow: 1 },
  { label: 'Mar', dow: 2 },
  { label: 'Mie', dow: 3 },
  { label: 'Jue', dow: 4 },
  { label: 'Vie', dow: 5 },
  { label: 'Sab', dow: 6 },
  { label: 'Dom', dow: 0 },
];

async function authFetch(url: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Sesion no disponible');
  }
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Error en request');
  return json;
}

export default function GestionVentanas() {
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [ventanas, setVentanas] = useState<Ventana[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);

  const [form, setForm] = useState({
    nombre: 'Turno Manana',
    dia_semana: 1,
    hora_inicio: '08:00',
    hora_fin: '10:00',
    capacidad: 2,
    duracion_turno_minutos: 60,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [vRes, rRes, sRes] = await Promise.all([
        authFetch(`/api/turnos/ventanas?fecha=${fechaFiltro}`),
        authFetch(`/api/turnos/reservas?fecha=${fechaFiltro}`),
        authFetch(`/api/turnos/ventanas?fecha=${fechaFiltro}&slots=true`),
      ]);
      setVentanas(vRes.data || []);
      setReservas(rRes.data || []);
      setSlots(sRes.data || []);
    } catch (e: any) {
      setError(e.message || 'Error al cargar turnos');
    } finally {
      setLoading(false);
    }
  }, [fechaFiltro]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resumen = useMemo(() => {
    const totalVentanas = ventanas.filter(v => v.activa).length;
    const totalCapacidad = ventanas.reduce((acc, v) => acc + (v.capacidad || 0), 0);
    const totalOcupados = ventanas.reduce((acc, v) => acc + (v.ocupados || 0), 0);
    return { totalVentanas, totalCapacidad, totalOcupados };
  }, [ventanas]);

  const fechaDow = useMemo(() => new Date(fechaFiltro + 'T00:00:00').getUTCDay(), [fechaFiltro]);

  const weeklyGrid = useMemo(() => {
    let minHour = 23, maxHour = 0;
    ventanas.forEach(v => {
      if (!v.activa) return;
      const sH = parseInt(v.hora_inicio.split(':')[0]);
      const eH = parseInt(v.hora_fin.split(':')[0]) + (parseInt(v.hora_fin.split(':')[1]) > 0 ? 1 : 0);
      if (sH < minHour) minHour = sH;
      if (eH > maxHour) maxHour = eH;
    });
    if (minHour > maxHour) { minHour = 6; maxHour = 20; }
    const hours = Array.from({ length: maxHour - minHour }, (_, i) => minHour + i);
    const cells: Record<string, { nombre: string; cap: number }> = {};
    ventanas.forEach(v => {
      if (!v.activa) return;
      const sH = parseInt(v.hora_inicio.split(':')[0]);
      const eH = parseInt(v.hora_fin.split(':')[0]);
      for (let h = sH; h < eH; h++) cells[`${v.dia_semana}-${h}`] = { nombre: v.nombre, cap: v.capacidad };
    });
    return { hours, cells };
  }, [ventanas]);

  const slotsByHour = useMemo(() => {
    const m: Record<string, { ocupados: number; capacidad: number }> = {};
    slots.forEach(s => {
      const hk = s.hora_inicio.slice(0, 2) + ':00';
      if (!m[hk]) m[hk] = { ocupados: 0, capacidad: 0 };
      m[hk].ocupados += s.ocupados;
      m[hk].capacidad += s.capacidad;
    });
    return m;
  }, [slots]);

  const handleCrearVentana = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authFetch('/api/turnos/ventanas', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      await fetchData();
      setForm((prev) => ({ ...prev, nombre: 'Turno Tarde' }));
    } catch (e: any) {
      setError(e.message || 'No se pudo crear la ventana');
    } finally {
      setSaving(false);
    }
  };

  const toggleActiva = async (v: Ventana) => {
    try {
      await authFetch('/api/turnos/ventanas', {
        method: 'PUT',
        body: JSON.stringify({ id: v.id, activa: !v.activa }),
      });
      await fetchData();
    } catch (e: any) {
      setError(e.message || 'No se pudo actualizar la ventana');
    }
  };

  if (loading) {
    return <div className="text-slate-300">Cargando turnos de recepcion...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Turnos de Recepcion</h2>
          <p className="text-sm text-slate-400">Defini ventanas semanales y monitorea ocupacion diaria.</p>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Fecha</label>
          <input
            type="date"
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
          <p className="text-xs text-cyan-200/80">Ventanas activas</p>
          <p className="text-2xl font-bold text-cyan-300">{resumen.totalVentanas}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-xs text-emerald-200/80">Capacidad total</p>
          <p className="text-2xl font-bold text-emerald-300">{resumen.totalCapacidad}</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-xs text-amber-200/80">Turnos ocupados</p>
          <p className="text-2xl font-bold text-amber-300">{resumen.totalOcupados}</p>
        </div>
      </div>

      {ventanas.some(v => v.activa) && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200">Grilla semanal de turnos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left text-slate-400 w-16">Hora</th>
                  {GRID_DIAS.map(d => (
                    <th key={d.dow} className={`px-2 py-1 text-center ${d.dow === fechaDow ? 'text-cyan-300 bg-cyan-500/10' : 'text-slate-400'}`}>
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeklyGrid.hours.map(hour => {
                  const hourStr = `${String(hour).padStart(2, '0')}:00`;
                  return (
                    <tr key={hour}>
                      <td className="px-2 py-1 text-slate-400 font-mono">{hourStr}</td>
                      {GRID_DIAS.map(d => {
                        const cell = weeklyGrid.cells[`${d.dow}-${hour}`];
                        const agg = d.dow === fechaDow ? slotsByHour[hourStr] : null;
                        let bg = 'bg-slate-800/30';
                        let label = '';
                        let title = 'Sin ventana';

                        if (cell) {
                          if (agg) {
                            const pct = agg.capacidad > 0 ? agg.ocupados / agg.capacidad : 0;
                            if (pct >= 1) bg = 'bg-red-500/60';
                            else if (pct >= 0.5) bg = 'bg-amber-500/50';
                            else bg = 'bg-emerald-500/50';
                            label = `${agg.ocupados}/${agg.capacidad}`;
                            title = `${cell.nombre} — ${agg.ocupados}/${agg.capacidad} ocupados`;
                          } else {
                            bg = 'bg-slate-600/30';
                            label = String(cell.cap);
                            title = `${cell.nombre} (cap: ${cell.cap})`;
                          }
                        }

                        return (
                          <td key={d.dow} className="px-0.5 py-0.5">
                            <div className={`rounded h-8 ${bg} flex items-center justify-center`} title={title}>
                              <span className={`text-[10px] font-semibold ${cell ? (agg ? 'text-white' : 'text-slate-400') : ''}`}>{label}</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-4 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/50 inline-block" /> Disponible</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500/50 inline-block" /> Parcial</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/60 inline-block" /> Lleno</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-600/30 inline-block" /> Configurado</span>
          </div>
          {slots.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-300 mb-2">Detalle slots — {DIAS[fechaDow]} {fechaFiltro}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {slots.map((s, i) => {
                  const pct = s.capacidad > 0 ? s.ocupados / s.capacidad : 0;
                  const border = pct >= 1 ? 'border-red-500/40' : pct >= 0.5 ? 'border-amber-500/40' : 'border-emerald-500/40';
                  const bgc = pct >= 1 ? 'bg-red-500/10' : pct >= 0.5 ? 'bg-amber-500/10' : 'bg-emerald-500/10';
                  const bar = pct >= 1 ? 'bg-red-500' : pct >= 0.5 ? 'bg-amber-500' : 'bg-emerald-500';
                  return (
                    <div key={i} className={`rounded-lg border ${border} ${bgc} p-2 text-center`}>
                      <div className="text-sm font-mono font-bold text-slate-100">{s.hora_inicio}-{s.hora_fin}</div>
                      <div className="text-[10px] text-slate-400 truncate">{s.ventana_nombre}</div>
                      <div className="text-xs text-slate-300">{s.ocupados}/{s.capacidad}</div>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                        <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(pct * 100, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleCrearVentana} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 grid grid-cols-1 md:grid-cols-7 gap-3">
        <input
          value={form.nombre}
          onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          placeholder="Nombre"
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
        />
        <select
          value={form.dia_semana}
          onChange={(e) => setForm((f) => ({ ...f, dia_semana: Number(e.target.value) }))}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
        >
          {DIAS.map((d, i) => <option key={d} value={i}>{d}</option>)}
        </select>
        <input
          type="time"
          value={form.hora_inicio}
          onChange={(e) => setForm((f) => ({ ...f, hora_inicio: e.target.value }))}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
        />
        <input
          type="time"
          value={form.hora_fin}
          onChange={(e) => setForm((f) => ({ ...f, hora_fin: e.target.value }))}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
        />
        <input
          type="number"
          min={1}
          value={form.capacidad}
          onChange={(e) => setForm((f) => ({ ...f, capacidad: Number(e.target.value) }))}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
          placeholder="Capacidad"
        />
        <input
          type="number"
          min={15}
          step={15}
          value={form.duracion_turno_minutos}
          onChange={(e) => setForm((f) => ({ ...f, duracion_turno_minutos: Number(e.target.value) }))}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
          placeholder="Duracion"
        />
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Crear ventana'}
        </button>
      </form>

      <div className="rounded-xl border border-slate-700 bg-slate-900/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/90 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left">Ventana</th>
              <th className="px-3 py-2 text-left">Dia</th>
              <th className="px-3 py-2 text-left">Horario</th>
              <th className="px-3 py-2 text-left">Capacidad</th>
              <th className="px-3 py-2 text-left">Ocupacion</th>
              <th className="px-3 py-2 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {ventanas.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">No hay ventanas configuradas.</td></tr>
            )}
            {ventanas.map((v) => (
              <tr key={v.id} className="border-t border-slate-800">
                <td className="px-3 py-2 text-slate-200">{v.nombre}</td>
                <td className="px-3 py-2 text-slate-300">{DIAS[v.dia_semana] || '-'}</td>
                <td className="px-3 py-2 text-slate-300">{v.hora_inicio.slice(0, 5)} - {v.hora_fin.slice(0, 5)}</td>
                <td className="px-3 py-2 text-slate-300">{v.capacidad}</td>
                <td className="px-3 py-2 text-slate-300">{v.ocupados || 0} / {v.capacidad}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => toggleActiva(v)}
                    className={`px-2 py-1 rounded text-xs font-semibold ${v.activa ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-300'}`}
                  >
                    {v.activa ? 'Activa' : 'Inactiva'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 text-slate-200 font-semibold">Reservas del dia</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-800/90 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left">N° Turno</th>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Horario</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-left">Patente</th>
              <th className="px-3 py-2 text-left">Chofer</th>
              <th className="px-3 py-2 text-left">Despacho</th>
            </tr>
          </thead>
          <tbody>
            {reservas.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">No hay reservas para esta fecha.</td></tr>
            )}
            {reservas.map((r) => (
              <tr key={r.id} className="border-t border-slate-800">
                <td className="px-3 py-2 font-mono font-bold text-cyan-300">{r.numero_turno || '-'}</td>
                <td className="px-3 py-2 text-slate-300">{r.fecha}</td>
                <td className="px-3 py-2 text-slate-300">{r.hora_inicio.slice(0, 5)} - {r.hora_fin.slice(0, 5)}</td>
                <td className="px-3 py-2 text-slate-300">{r.estado}</td>
                <td className="px-3 py-2 text-slate-300">{r.patente_camion || '-'}</td>
                <td className="px-3 py-2 text-slate-300">{r.chofer_nombre || '-'}</td>
                <td className="px-3 py-2 text-slate-300">{r.despacho_pedido_id || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
