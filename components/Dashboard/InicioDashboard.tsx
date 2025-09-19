import React from 'react';
import KPICards from './KPICards';
import MapaDespachos from './MapaDespachos';
import MiniAgenda from './MiniAgenda';
import UltimasIncidencias from './UltimasIncidencias';
import Alertas from './Alertas';
import useDispatches from '../../lib/hooks/useDispatches';
import useIncidencias from '../../lib/hooks/useIncidencias';

// NOTE: This file assumes your project exposes shadcn/ui primitives under the module name 'ui'.
// If your setup uses a different path (for example '@/components/ui' or './ui'), update imports accordingly.

interface Dispatch {
  id: string;
  destino?: string;
  scheduled_at?: string;
  estado?: string;
  transporte_data?: { nombre?: string } | null;
}

interface Incidence {
  id: string;
  tipo: string;
  severidad: 'info' | 'alerta' | 'critica';
  despacho_id?: string;
}

interface Props {
  // real data can be passed here from Supabase; for now we accept dispatches and use internal mocks
  dispatches?: Dispatch[];
}

const mockIncidencias: Incidence[] = [
  { id: 'i1', tipo: 'Documento faltante', severidad: 'alerta', despacho_id: 'd1' },
  { id: 'i2', tipo: 'Carga dañada', severidad: 'critica', despacho_id: 'd3' },
  { id: 'i3', tipo: 'Retraso por tráfico', severidad: 'info', despacho_id: 'd2' },
  { id: 'i4', tipo: 'Chofer no asignado', severidad: 'alerta', despacho_id: 'd4' },
  { id: 'i5', tipo: 'Incidente menor', severidad: 'info', despacho_id: 'd5' },
];

const InicioDashboard: React.FC<Props> = ({ dispatches: initial = [] }) => {
  // use hooks for real data; fallback to initial dispatches prop
  const { dispatches: liveDispatches, loading: loadingD } = useDispatches();
  const { incidencias: liveIncidencias, loading: loadingI } = useIncidencias();

  const dispatches = (liveDispatches && liveDispatches.length) ? liveDispatches : initial;

  return (
    <div className="w-full">
      <Alertas />

      <section className="grid gap-6">
        <div>
          <KPICards />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <MapaDespachos />
          </div>
          <div className="flex flex-col gap-6">
            <MiniAgenda dispatches={dispatches} />
            <UltimasIncidencias incidencias={liveIncidencias.length ? liveIncidencias : mockIncidencias} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default InicioDashboard;
