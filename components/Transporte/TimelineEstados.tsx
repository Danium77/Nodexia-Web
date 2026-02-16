// components/Transporte/TimelineEstados.tsx
// Componente para mostrar el historial de cambios de estado de un viaje

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Clock, 
  User, 
  AlertCircle,
  CheckCircle2,
  Truck,
  Package,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui/shadcn-compat';
import { 
  getLabelEstadoUnidad, 
  getColorEstadoUnidad,
  getLabelEstadoCarga,
  getColorEstadoCarga 
} from '@/lib/helpers/estados-helpers';

interface EstadoHistorial {
  id: number;
  tipo_estado: 'unidad' | 'carga';
  estado_anterior: string | null;
  estado_nuevo: string;
  fecha_cambio: string;
  usuario_email: string | null;
  usuario_nombre: string | null;
  notas: string | null;
  metadata: any;
}

interface TimelineEstadosProps {
  viajeId: number;
  className?: string;
}

export function TimelineEstados({ viajeId, className = '' }: TimelineEstadosProps) {
  const [historial, setHistorial] = useState<EstadoHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistorial();
  }, [viajeId]);

  const loadHistorial = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc(
        'get_viaje_estados_historial',
        { viaje_id_param: viajeId }
      );

      if (rpcError) throw rpcError;

      setHistorial(data || []);
    } catch (err: any) {
      console.error('Error al cargar historial:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };



  const getEstadoInfo = (tipo: 'unidad' | 'carga', estado: string) => {
    if (tipo === 'unidad') {
      return {
        label: getLabelEstadoUnidad(estado as any),
        color: getColorEstadoUnidad(estado as any)
      };
    } else {
      return {
        label: getLabelEstadoCarga(estado as any),
        color: getColorEstadoCarga(estado as any)
      };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <p>Error al cargar historial: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (historial.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Historial de Estados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-center py-8">
            No hay cambios de estado registrados para este viaje
          </p>
        </CardContent>
      </Card>
    );
  }

  // Agrupar por tipo de estado
  const unidadChanges = historial.filter(h => h.tipo_estado === 'unidad');
  const cargaChanges = historial.filter(h => h.tipo_estado === 'carga');

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Historial de Estados ({historial.length} cambios)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timeline de Estado de Unidad */}
          {unidadChanges.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-4 text-blue-400">
                <Truck className="w-4 h-4" />
                Estado de Unidad
              </h3>
              <div className="space-y-4">
                {unidadChanges.map((cambio, index) => {
                  const estadoInfo = getEstadoInfo('unidad', cambio.estado_nuevo);
                  const isFirst = index === 0;
                  
                  return (
                    <div key={cambio.id} className="relative">
                      {/* Línea conectora */}
                      {index < unidadChanges.length - 1 && (
                        <div className="absolute left-[15px] top-8 bottom-[-16px] w-0.5 bg-gray-600" />
                      )}
                      
                      <div className="flex gap-3">
                        {/* Indicador circular */}
                        <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full ${estadoInfo.color} flex items-center justify-center ${isFirst ? 'ring-4 ring-blue-200' : ''}`}>
                          {isFirst ? (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          ) : (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 pb-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              {cambio.estado_anterior && (
                                <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                                  <span>{getEstadoInfo('unidad', cambio.estado_anterior).label}</span>
                                  <ArrowRight className="w-3 h-3" />
                                </div>
                              )}
                              <span className={`font-semibold ${isFirst ? 'text-blue-400' : 'text-gray-200'}`}>
                                {estadoInfo.label}
                              </span>
                            </div>
                            {isFirst && (
                              <Badge variant="default" className="text-xs">
                                Actual
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(cambio.fecha_cambio)}
                          </div>

                          {cambio.usuario_nombre && (
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                              <User className="w-3 h-3" />
                              {cambio.usuario_nombre}
                            </div>
                          )}

                          {cambio.notas && (
                            <p className="text-xs text-gray-300 mt-2 italic">
                              {cambio.notas}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timeline de Estado de Carga */}
          {cargaChanges.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-4 text-green-400">
                <Package className="w-4 h-4" />
                Estado de Carga
              </h3>
              <div className="space-y-4">
                {cargaChanges.map((cambio, index) => {
                  const estadoInfo = getEstadoInfo('carga', cambio.estado_nuevo);
                  const isFirst = index === 0;
                  
                  return (
                    <div key={cambio.id} className="relative">
                      {/* Línea conectora */}
                      {index < cargaChanges.length - 1 && (
                        <div className="absolute left-[15px] top-8 bottom-[-16px] w-0.5 bg-gray-600" />
                      )}
                      
                      <div className="flex gap-3">
                        {/* Indicador circular */}
                        <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full ${estadoInfo.color} flex items-center justify-center ${isFirst ? 'ring-4 ring-green-200' : ''}`}>
                          {isFirst ? (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          ) : (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 pb-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              {cambio.estado_anterior && (
                                <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                                  <span>{getEstadoInfo('carga', cambio.estado_anterior).label}</span>
                                  <ArrowRight className="w-3 h-3" />
                                </div>
                              )}
                              <span className={`font-semibold ${isFirst ? 'text-green-400' : 'text-gray-200'}`}>
                                {estadoInfo.label}
                              </span>
                            </div>
                            {isFirst && (
                              <Badge variant="default" className="text-xs bg-green-600">
                                Actual
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(cambio.fecha_cambio)}
                          </div>

                          {cambio.usuario_nombre && (
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                              <User className="w-3 h-3" />
                              {cambio.usuario_nombre}
                            </div>
                          )}

                          {cambio.metadata?.peso_real_nuevo && (
                            <div className="text-xs text-gray-300 mt-2">
                              Peso real: {cambio.metadata.peso_real_nuevo} kg
                            </div>
                          )}

                          {cambio.notas && (
                            <p className="text-xs text-gray-300 mt-2 italic">
                              {cambio.notas}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
