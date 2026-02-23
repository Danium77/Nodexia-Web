import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import { useTransports, useSearch } from '../../lib/hooks';
import { SearchInput, Button } from '../ui';

interface TransportOption {
  id: string;
  nombre: string;
  tipo: string;
  capacidad?: string;
  ubicacion?: string;
  disponible: boolean;
}

interface AssignTransportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispatch: {
    id: string;
    pedido_id: string;
    origen: string;
    destino: string;
    fecha_despacho: string;
    tipo_carga: string;
    prioridad: string;
    unidad_type: string;
    cantidad_viajes_solicitados?: number;
  };
  onAssignSuccess: () => void;
}

const AssignTransportModal: React.FC<AssignTransportModalProps> = ({
  isOpen,
  onClose,
  dispatch,
  onAssignSuccess
}) => {
  // 🔥 REFACTORIZADO: Usar contexto y hooks
  const { empresaId, user } = useUserRole();
  const { transports, loading: loadingTransports, error: transportsError, reload } = useTransports(empresaId);
  const { searchTerm, setSearchTerm, filteredItems: filteredTransports, clearSearch, resultsCount } = useSearch({
    items: transports,
    searchFields: ['nombre', 'tipo'] as (keyof TransportOption)[]
  });

  const [selectedTransport, setSelectedTransport] = useState<string>('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [cantidadViajesAsignar, setCantidadViajesAsignar] = useState<number>(1);
  const [viajesDisponibles, setViajesDisponibles] = useState<number>(1);
  const [viajesYaAsignados, setViajesYaAsignados] = useState<number>(0); // 🔥 NUEVO
  const [loading, setLoading] = useState(false);
  const [loadingViajes, setLoadingViajes] = useState(true); // Nuevo estado
  const [error, setError] = useState('');

  // Calcular viajes disponibles cuando se abre el modal
  useEffect(() => {
    if (isOpen && dispatch.id) {
      setLoadingViajes(true);
      const calcularViajesDisponibles = async () => {
        try {
          // Obtener valor original de BD
          const { data: despachoActual } = await supabase
            .from('despachos')
            .select('cantidad_viajes_solicitados')
            .eq('id', dispatch.id)
            .single();

          const cantidadOriginal = despachoActual?.cantidad_viajes_solicitados || dispatch.cantidad_viajes_solicitados || 1;

          // 🔥 CORREGIDO: Contar solo viajes realmente asignados (estado = 'asignado')
          const { data: viajesAsignados } = await supabase
            .from('viajes_despacho')
            .select('id, estado')
            .eq('despacho_id', dispatch.id)
            .eq('estado', 'asignado'); // Solo viajes con estado asignado

          // Contar todos los viajes (para calcular disponibles)
          const { data: viajesExistentes } = await supabase
            .from('viajes_despacho')
            .select('id')
            .eq('despacho_id', dispatch.id);

          const yaAsignados = viajesAsignados?.length || 0;
          const totalViajes = viajesExistentes?.length || 0;
          const disponibles = cantidadOriginal - totalViajes;

          console.log(`📊 Cálculo inicial: ${cantidadOriginal} total - ${totalViajes} existentes = ${disponibles} disponibles (${yaAsignados} ya asignados)`);

          setViajesYaAsignados(yaAsignados); // 🔥 NUEVO
          setViajesDisponibles(disponibles);
          setCantidadViajesAsignar(disponibles);
        } catch (error) {
          console.error('⚠️ Error calculando viajes disponibles:', error);
        } finally {
          setLoadingViajes(false);
        }
      };

      calcularViajesDisponibles();
    }
  }, [isOpen, dispatch.id]);

  // Resetear SOLO cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      console.log('🎬 Modal abierto - reseteando estado');
      setSelectedTransport('');
      setAssignmentNotes('');
      setError('');
    }
  }, [isOpen]);

  const handleAssign = async () => {
    if (!selectedTransport) {
      setError('Por favor selecciona un transporte');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔄 Asignando transporte...');
      console.log('Despacho:', dispatch.id);
      console.log('Transporte seleccionado:', selectedTransport);
      console.log('Cantidad de viajes a asignar:', cantidadViajesAsignar);

      // 🔥 OBTENER EL VALOR REAL Y ACTUALIZADO DE LA BD
      const { data: despachoActual, error: despachoError } = await supabase
        .from('despachos')
        .select('cantidad_viajes_solicitados')
        .eq('id', dispatch.id)
        .single();

      if (despachoError) {
        console.error('❌ Error obteniendo despacho actual:', despachoError);
        throw despachoError;
      }

      const cantidadOriginalViajes = despachoActual?.cantidad_viajes_solicitados || dispatch.cantidad_viajes_solicitados || 1;
      console.log(`📊 Cantidad original de viajes (desde BD): ${cantidadOriginalViajes}`);

      // VALIDACIÓN PREVIA: Verificar cuántos viajes ya existen (excluyendo cancelados)
      const { data: viajesExistentesCheck, error: checkError } = await supabase
        .from('viajes_despacho')
        .select('id, numero_viaje, estado')
        .eq('despacho_id', dispatch.id)
        .neq('estado', 'cancelado_por_transporte');

      if (checkError) {
        console.error('❌ Error verificando viajes existentes:', checkError);
        throw checkError;
      }

      const viajesYaAsignados = viajesExistentesCheck?.length || 0;
      console.log(`🔍 Pre-validación: ${viajesYaAsignados} viajes ya asignados`);
      console.log(`🔍 Intentando asignar: ${cantidadViajesAsignar} viajes adicionales`);
      console.log(`🔍 Total después de asignación: ${viajesYaAsignados + cantidadViajesAsignar}`);
      console.log(`🔍 Cantidad original de viajes: ${cantidadOriginalViajes}`);
      console.log(`🔍 Viajes realmente pendientes: ${cantidadOriginalViajes - viajesYaAsignados}`);

      // Calcular cuántos viajes REALMENTE quedan disponibles
      const viajesRealmenteDisponibles = cantidadOriginalViajes - viajesYaAsignados;

      // Validar que no se exceda el límite
      if (cantidadViajesAsignar > viajesRealmenteDisponibles) {
        const errorMsg = `⚠️ Solo quedan ${viajesRealmenteDisponibles} viajes pendientes. No puedes asignar ${cantidadViajesAsignar}.`;
        console.error(errorMsg);
        setError(errorMsg);
        setLoading(false);
        return;
      }

      // Si el despacho tiene múltiples viajes, crear registros en viajes_despacho
      if (dispatch.cantidad_viajes_solicitados && dispatch.cantidad_viajes_solicitados > 1) {
        console.log('📋 Creando registros de viajes individuales...');
        console.log('📊 Estado inicial del despacho:', {
          cantidad_viajes_solicitados: dispatch.cantidad_viajes_solicitados,
          cantidadViajesAsignar: cantidadViajesAsignar
        });
        
        // Primero, obtener TODOS los viajes existentes para este despacho (excluyendo cancelados)
        const { data: viajesExistentes, error: countError } = await supabase
          .from('viajes_despacho')
          .select('numero_viaje, estado')
          .eq('despacho_id', dispatch.id)
          .neq('estado', 'cancelado_por_transporte')
          .order('numero_viaje', { ascending: false });

        if (countError) {
          console.error('❌ Error contando viajes existentes:', countError);
          throw countError;
        }

        const cantidadViajesYaAsignados = viajesExistentes?.length || 0;
        
        // Calcular el próximo número de viaje
        const ultimoNumeroViaje = viajesExistentes && viajesExistentes.length > 0 && viajesExistentes[0]
          ? viajesExistentes[0].numero_viaje 
          : 0;
        
        console.log(`📊 Viajes ya asignados: ${cantidadViajesYaAsignados}`);
        console.log(`📊 Último número de viaje: ${ultimoNumeroViaje}`);
        console.log(`📊 Creando viajes desde el ${ultimoNumeroViaje + 1} hasta el ${ultimoNumeroViaje + cantidadViajesAsignar}`);
        
        // Crear los viajes asignados a este transporte
        const viajesData = [];
        for (let i = 0; i < cantidadViajesAsignar; i++) {
          viajesData.push({
            despacho_id: dispatch.id,
            numero_viaje: ultimoNumeroViaje + i + 1,
            id_transporte: selectedTransport,
            estado: 'transporte_asignado',
            observaciones: assignmentNotes || `Viaje ${ultimoNumeroViaje + i + 1} - Asignado a transporte`
          });
        }

        const { error: viajesError } = await supabase
          .from('viajes_despacho')
          .insert(viajesData);

        if (viajesError) {
          console.error('❌ Error creando viajes:', viajesError);
          throw viajesError;
        }

        console.log(`✅ ${cantidadViajesAsignar} viajes creados exitosamente (números ${ultimoNumeroViaje + 1} a ${ultimoNumeroViaje + cantidadViajesAsignar})`);
        
        // Calcular cuántos viajes quedan pendientes usando el valor ORIGINAL de la BD
        const totalViajesAsignadosAhora = cantidadViajesYaAsignados + cantidadViajesAsignar;
        const viajesPendientes = cantidadOriginalViajes - totalViajesAsignadosAhora;
        
        console.log(`📊 Total viajes asignados ahora: ${totalViajesAsignadosAhora} (anteriores: ${cantidadViajesYaAsignados} + nuevos: ${cantidadViajesAsignar})`);
        console.log(`📊 Total viajes asignados ahora: ${totalViajesAsignadosAhora} (anteriores: ${cantidadViajesYaAsignados} + nuevos: ${cantidadViajesAsignar})`);
        console.log(`📊 Cantidad original de viajes: ${cantidadOriginalViajes}`);
        console.log(`📊 Viajes pendientes: ${viajesPendientes}`);
        
        if (viajesPendientes > 0) {
          // Aún quedan viajes por asignar
          // Solo actualizamos el comentario (NO viajes_generados)
          const { error: updateError } = await supabase
            .from('despachos')
            .update({
              comentarios: `${dispatch.pedido_id} - ${totalViajesAsignadosAhora}/${cantidadOriginalViajes} viajes asignados, ${viajesPendientes} pendiente(s)`
            })
            .eq('id', dispatch.id);

          if (updateError) {
            console.error('❌ Error actualizando despacho:', updateError);
            throw updateError;
          }
          
          console.log(`✅ Despacho actualizado: quedan ${viajesPendientes} viajes pendientes`);
        } else if (viajesPendientes === 0) {
          // Todos los viajes fueron asignados
          const { error: updateError } = await supabase
            .from('despachos')
            .update({
              transport_id: selectedTransport,
              estado: 'transporte_asignado',
              comentarios: `${dispatch.pedido_id} - Todos los viajes asignados (${totalViajesAsignadosAhora}/${cantidadOriginalViajes})`
            })
            .eq('id', dispatch.id);

          if (updateError) {
            console.error('❌ Error actualizando despacho:', updateError);
            throw updateError;
          }
          
          console.log('✅ Todos los viajes asignados, despacho completado');
        } else {
          // viajesPendientes < 0 - ERROR! Se asignaron más de los solicitados
          console.error('❌ ERROR: Se intentaron asignar más viajes de los solicitados!');
          throw new Error(`No se pueden asignar ${cantidadViajesAsignar} viajes. Solo quedan ${viajesRealmenteDisponibles} disponibles.`);
        }

        // 🔥 REGISTRAR EN HISTORIAL
        const transporteNombre = transports.find(t => t.id === selectedTransport)?.nombre || 'Transporte';
        await supabase
          .from('historial_despachos')
          .insert({
            despacho_id: dispatch.id,
            accion: 'transporte_asignado',
            descripcion: `${cantidadViajesAsignar} viaje(s) asignado(s) a ${transporteNombre}`,
            usuario_id: user?.id || null,
            metadata: {
              transporte_id: selectedTransport,
              transporte_nombre: transporteNombre,
              cantidad_viajes: cantidadViajesAsignar,
              total_viajes_asignados: totalViajesAsignadosAhora,
              viajes_pendientes: viajesPendientes
            }
          });
        
      } else {
        // Despacho simple (1 solo viaje o sin especificar)
        console.log('📋 Despacho simple - Creando viaje en viajes_despacho...');
        
        // Primero, verificar si ya existe un viaje para este despacho (incluyendo cancelados)
        const { data: viajeExistente, error: checkViajeError } = await supabase
          .from('viajes_despacho')
          .select('id, estado')
          .eq('despacho_id', dispatch.id)
          .maybeSingle();

        if (checkViajeError) {
          console.error('❌ Error verificando viaje existente:', checkViajeError);
          throw checkViajeError;
        }

        if (!viajeExistente) {
          // Crear viaje en viajes_despacho
          console.log('📝 Insertando viaje:', {
            despacho_id: dispatch.id,
            numero_viaje: 1,
            id_transporte: selectedTransport,
            estado: 'transporte_asignado'
          });

          const { data: viajeCreado, error: viajeError } = await supabase
            .from('viajes_despacho')
            .insert({
              despacho_id: dispatch.id,
              numero_viaje: 1,
              id_transporte: selectedTransport,
              estado: 'transporte_asignado',
              observaciones: assignmentNotes || `Viaje único - Asignado a transporte`
            })
            .select();

          if (viajeError) {
            console.error('❌ Error creando viaje:', viajeError);
            console.error('❌ Detalle del error:', JSON.stringify(viajeError, null, 2));
            throw viajeError;
          }
          
          console.log('✅ Viaje creado en viajes_despacho:', viajeCreado);
        } else {
          console.log('ℹ️ Ya existe un viaje para este despacho, actualizándolo...');
          
          // Actualizar el viaje existente (limpiar datos de cancelación si existían)
          const { error: updateViajeError } = await supabase
            .from('viajes_despacho')
            .update({
              id_transporte: selectedTransport,
              estado: 'transporte_asignado',
              observaciones: assignmentNotes || `Viaje único - Asignado a transporte`,
              motivo_cancelacion: null,
              fecha_cancelacion: null,
              cancelado_por: null,
              id_transporte_cancelado: null
            })
            .eq('id', viajeExistente.id);

          if (updateViajeError) {
            console.error('❌ Error actualizando viaje:', updateViajeError);
            throw updateViajeError;
          }
          
          console.log('✅ Viaje actualizado en viajes_despacho');
        }

        // Actualizar despacho
        const updateData = {
          transport_id: selectedTransport,
          estado: 'transporte_asignado',
          comentarios: assignmentNotes || `${dispatch.pedido_id} - Transporte asignado`
        };

        const { error: updateError } = await supabase
          .from('despachos')
          .update(updateData)
          .eq('id', dispatch.id);

        if (updateError) {
          console.error('❌ Error actualizando despacho:', updateError);
          throw updateError;
        }
        
        console.log('✅ Despacho simple asignado exitosamente');

        // 🔥 REGISTRAR EN HISTORIAL
        const transporteNombre = transports.find(t => t.id === selectedTransport)?.nombre || 'Transporte';
        await supabase
          .from('historial_despachos')
          .insert({
            despacho_id: dispatch.id,
            accion: 'transporte_asignado',
            descripcion: `Transporte ${transporteNombre} asignado al despacho`,
            usuario_id: user?.id || null,
            metadata: {
              transporte_id: selectedTransport,
              transporte_nombre: transporteNombre,
              observaciones: assignmentNotes || null
            }
          });
      }

      console.log('✅ Asignación completada');
      
      // Cerrar modal y refrescar lista
      onClose();
      onAssignSuccess();

    } catch (error) {
      console.error('💥 Error en asignación:', error);
      setError('Error al asignar transporte. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedTransport('');
    setAssignmentNotes('');
    setCantidadViajesAsignar(1);
    setError('');
    setLoading(false);
    clearSearch();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center">
            🚚 Asignar Transporte
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Información del Despacho */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-3">📦 Información del Despacho</h3>
          <div className="bg-gray-700 rounded-lg p-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-400">Código:</span>
              <span className="text-white ml-2 font-medium">{dispatch.pedido_id}</span>
            </div>
            <div>
              <span className="text-gray-400">Fecha:</span>
              <span className="text-white ml-2">{dispatch.fecha_despacho}</span>
            </div>
            <div>
              <span className="text-gray-400">Origen:</span>
              <span className="text-white ml-2">{dispatch.origen}</span>
            </div>
            <div>
              <span className="text-gray-400">Destino:</span>
              <span className="text-white ml-2">{dispatch.destino}</span>
            </div>
            <div>
              <span className="text-gray-400">Tipo de Carga:</span>
              <span className="text-white ml-2">{dispatch.tipo_carga}</span>
            </div>
            <div>
              <span className="text-gray-400">Prioridad:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                dispatch.prioridad === 'Urgente' ? 'bg-red-600 text-red-100' :
                dispatch.prioridad === 'Alta' ? 'bg-orange-600 text-orange-100' :
                'bg-yellow-600 text-yellow-100'
              }`}>
                {dispatch.prioridad}
              </span>
            </div>
            {dispatch.cantidad_viajes_solicitados && dispatch.cantidad_viajes_solicitados > 1 && (
              <div className="col-span-2 border-t border-gray-600 pt-3 mt-2">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <span className="text-gray-400">🚛 Cantidad de viajes solicitados:</span>
                    <span className="text-blue-400 ml-2 font-bold text-lg">
                      {dispatch.cantidad_viajes_solicitados}
                    </span>
                  </div>
                  {viajesYaAsignados > 0 && (
                    <div className="text-green-400 text-sm">
                      ✅ {viajesYaAsignados} ya asignado{viajesYaAsignados > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <div className="bg-gray-900 p-3 rounded">
                  {loadingViajes ? (
                    <div className="text-center py-4 text-gray-400">
                      <div className="animate-pulse">Calculando viajes disponibles...</div>
                    </div>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        ¿Cuántos viajes asignar?
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          value={cantidadViajesAsignar}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            console.log('📝 Input changed to:', val, 'type:', typeof val);
                            setCantidadViajesAsignar(val);
                          }}
                          min={1}
                          max={viajesDisponibles}
                          step={1}
                          autoComplete="off"
                          className="w-24 px-4 py-2 bg-[#1b273b] border border-slate-600 rounded-lg text-slate-50 text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                        <span className="text-gray-400 text-sm">
                          de {viajesDisponibles} viajes disponibles
                        </span>
                      </div>
                      {cantidadViajesAsignar < viajesDisponibles && (
                        <div className="mt-2 text-yellow-400 text-xs">
                          ℹ️ Quedarán {viajesDisponibles - cantidadViajesAsignar} viajes pendientes para asignar a otro transporte
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {(error || transportsError) && (
          <div className="mb-4 p-3 bg-red-900 border border-red-600 rounded-lg text-red-200 text-sm">
            <div className="mb-2">{error || transportsError}</div>
            <Button 
              onClick={reload}
              variant="danger"
              size="sm"
              disabled={loadingTransports}
            >
              🔄 Reintentar
            </Button>
          </div>
        )}

        {/* Selección de Transporte */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-3">🚚 Transportes Disponibles</h3>
          
          {/* Buscador */}
          {transports.length > 0 && !loadingTransports && (
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="🔍 Buscar por nombre o tipo..."
              onClear={clearSearch}
              resultsCount={resultsCount}
              className="mb-4"
            />
          )}
          
          {loadingTransports ? (
            <div className="text-center py-8 text-gray-400">
              <div className="mb-3">Cargando transportes disponibles...</div>
            </div>
          ) : transports.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="mb-3">No hay transportes disponibles</div>
              <Button onClick={reload} variant="primary" size="sm">
                🔄 Reintentar Carga
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransports.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="mb-3">No se encontraron transportes con "{searchTerm}"</div>
                  <Button onClick={clearSearch} variant="primary" size="sm">
                    Limpiar búsqueda
                  </Button>
                </div>
              ) : (
                filteredTransports.map((transport) => (
                  <label
                    key={transport.id}
                    className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedTransport === transport.id
                        ? 'border-cyan-500 bg-cyan-900/20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="transport"
                      value={transport.id}
                      checked={selectedTransport === transport.id}
                      autoComplete="off"
                      onChange={(e) => {
                        console.log('🚛 Radio changed');
                        console.log('  - transport.id (original):', transport.id, 'type:', typeof transport.id);
                        console.log('  - e.target.value:', e.target.value, 'type:', typeof e.target.value);
                        console.log('  - Are they equal?', transport.id === e.target.value);
                        setSelectedTransport(transport.id);  // ← FIX: Usar transport.id directamente, no e.target.value
                        console.log('🚛 selectedTransport set to:', transport.id);
                      }}
                      className="sr-only"
                    />
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-white">{transport.nombre}</h4>
                        <p className="text-sm text-gray-400 mt-1">
                          {transport.tipo} - {transport.capacidad}
                        </p>
                        <p className="text-sm text-gray-500">{transport.ubicacion}</p>
                      </div>
                      <div className="flex items-center">
                        {transport.disponible && (
                          <span className="text-green-400 text-sm">✓ Disponible</span>
                        )}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        {/* Notas de Asignación */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-3">📝 Notas de Asignación (Opcional)</h3>
          <textarea
            value={assignmentNotes}
            onChange={(e) => setAssignmentNotes(e.target.value)}
            placeholder="Instrucciones especiales, contacto, horarios, etc..."
            className="w-full h-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
            autoComplete="off"
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-3">
          <Button
            onClick={handleClose}
            variant="secondary"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAssign}
            variant="primary"
            disabled={!selectedTransport || loading}
            loading={loading}
          >
            ✓ Confirmar Asignación
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssignTransportModal;