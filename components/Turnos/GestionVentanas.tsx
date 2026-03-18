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
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  patente_camion?: string | null;
  chofer_nombre?: string | null;
  observaciones?: string | null;
  despacho_id?: string | null;
};

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

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
      const [vRes, rRes] = await Promise.all([
        authFetch(`/api/turnos/ventanas?fecha=${fechaFiltro}`),
        authFetch(`/api/turnos/reservas?fecha=${fechaFiltro}`),
      ]);
      setVentanas(vRes.data || []);
      setReservas(rRes.data || []);
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
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">No hay reservas para esta fecha.</td></tr>
            )}
            {reservas.map((r) => (
              <tr key={r.id} className="border-t border-slate-800">
                <td className="px-3 py-2 text-slate-300">{r.fecha}</td>
                <td className="px-3 py-2 text-slate-300">{r.hora_inicio.slice(0, 5)} - {r.hora_fin.slice(0, 5)}</td>
                <td className="px-3 py-2 text-slate-300">{r.estado}</td>
                <td className="px-3 py-2 text-slate-300">{r.patente_camion || '-'}</td>
                <td className="px-3 py-2 text-slate-300">{r.chofer_nombre || '-'}</td>
                <td className="px-3 py-2 text-slate-300">{r.despacho_id || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
