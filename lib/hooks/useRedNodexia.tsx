// ============================================================================
// HOOK: useRedNodexia
// Gestión completa de la Red Nodexia
// ============================================================================

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  ViajeRedNodexia,
  ViajeRedCompleto,
  OfertaRedNodexia,
  OfertaRedCompleta,
  CrearViajeRedDTO,
  CrearOfertaDTO,
  FiltrosViajesRed,
  EstadisticasRedNodexia
} from '@/types/red-nodexia';

export function useRedNodexia() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // VIAJES EN RED
  // ============================================================================

  /**
   * Obtener viajes abiertos en la red (para transportes)
   */
  const obtenerViajesAbiertos = useCallback(async (filtros?: FiltrosViajesRed): Promise<ViajeRedCompleto[]> => {
    try {
      setLoading(true);
      setError(null);

      // 🔥 Cache-busting: agregar timestamp para forzar fresh data
      const cacheBuster = Date.now();
      console.log(`🔄 [useRedNodexia] obtenerViajesAbiertos - cache buster: ${cacheBuster}`);

      let query = supabase
        .from('viajes_red_nodexia')
        .select(`
          *,
          requisitos:requisitos_viaje_red(*),
          ofertas:ofertas_red_nodexia(
            id,
            transporte_id,
            estado_oferta,
            fecha_oferta
          ),
          empresa_solicitante:empresas!empresa_solicitante_id(id, nombre, tipo_empresa),
          viaje:viajes_despacho!viaje_id(
            id,
            numero_viaje,
            despacho:despachos!despacho_id(
              origen,
              destino,
              scheduled_local_date,
              scheduled_local_time
            )
          )
        `)
        .in('estado_red', ['abierto', 'con_ofertas'])
        .order('fecha_publicacion', { ascending: false});

      // Aplicar filtros
      if (filtros?.tipo_carga?.length) {
        // Filtrar por tipo de carga en requisitos
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      console.log(`✅ [useRedNodexia] Query completada, viajes recibidos: ${data?.length || 0}`);
      
      // 🔥 Log detallado de cada viaje para debugging
      data?.forEach(viaje => {
        console.log(`📦 [useRedNodexia] Viaje ${viaje.id}: estado_red="${viaje.estado_red}"`);
      });

      return data as ViajeRedCompleto[];
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtener viajes publicados por mi empresa (para plantas)
   */
  const obtenerMisViajesPublicados = useCallback(async (empresaId: string): Promise<ViajeRedCompleto[]> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('viajes_red_nodexia')
        .select(`
          *,
          requisitos:requisitos_viaje_red(*),
          ofertas:ofertas_red_nodexia(
            *,
            transporte:empresas!transporte_id(id, nombre, telefono, email)
          ),
          transporte_asignado:empresas!transporte_asignado_id(id, nombre),
          viaje:viajes_despacho!viaje_id(
            id,
            numero_viaje,
            despacho:despachos!despacho_id(
              origen,
              destino,
              scheduled_local_date,
              scheduled_local_time
            )
          )
        `)
        .eq('empresa_solicitante_id', empresaId)
        .order('fecha_publicacion', { ascending: false });

      if (queryError) throw queryError;

      return data as ViajeRedCompleto[];
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 🔥 NUEVO: Obtener viajes asignados a mi empresa desde Red Nodexia (para transportes)
   * Estos son viajes donde acepté una oferta y ahora debo asignar chofer/camión
   */
  const obtenerMisViajesAsignados = useCallback(async (empresaId: string): Promise<ViajeRedCompleto[]> => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🔍 [useRedNodexia] obtenerMisViajesAsignados - empresaId: ${empresaId}`);

      const { data, error: queryError } = await supabase
        .from('viajes_red_nodexia')
        .select(`
          *,
          requisitos:requisitos_viaje_red(*),
          ofertas:ofertas_red_nodexia(
            id,
            transporte_id,
            estado_oferta,
            fecha_oferta,
            fecha_respuesta
          ),
          empresa_solicitante:empresas!empresa_solicitante_id(id, nombre, tipo_empresa, telefono),
          viaje:viajes_despacho!viaje_id(*)
        `)
        .eq('estado_red', 'asignado')
        .eq('transporte_asignado_id', empresaId)
        .order('fecha_asignacion', { ascending: false });

      if (queryError) {
        console.error('❌ [useRedNodexia] Error en query obtenerMisViajesAsignados:', queryError);
        throw queryError;
      }

      console.log(`📦 [useRedNodexia] Query base retornó ${data?.length || 0} viajes asignados`);
      if (data && data.length > 0) {
        console.log('📦 [useRedNodexia] Viajes encontrados:', data.map(v => ({
          id: v.id,
          viaje_id: v.viaje_id,
          estado_red: v.estado_red,
          transporte_asignado_id: v.transporte_asignado_id
        })));
      }

      // Enriquecer con datos de despacho, camiones y choferes
      if (data && data.length > 0) {
        for (const viajeRed of data) {
          if (viajeRed.viaje) {
            // Obtener despacho
            const { data: despacho } = await supabase
              .from('despachos')
              .select('origen, destino, scheduled_local_date, scheduled_local_time, type')
              .eq('id', viajeRed.viaje.despacho_id)
              .is('deleted_at', null)
              .single();
            
            if (despacho) {
              (viajeRed.viaje as any).despacho = despacho;
            }

            // Obtener camión si existe
            if (viajeRed.viaje.id_camion) {
              const { data: camion } = await supabase
                .from('camiones')
                .select('id, patente, marca, modelo, tipo')
                .eq('id', viajeRed.viaje.id_camion)
                .is('deleted_at', null)
                .single();
              
              if (camion) {
                (viajeRed.viaje as any).camiones = camion;
              }
            }

            // Obtener chofer si existe
            if (viajeRed.viaje.chofer_id) {
              const { data: chofer } = await supabase
                .from('choferes')
                .select('id, nombre, apellido, dni, telefono')
                .eq('id', viajeRed.viaje.chofer_id)
                .is('deleted_at', null)
                .single();
              
              if (chofer) {
                (viajeRed.viaje as any).choferes = chofer;
              }
            }
          }
        }
      }

      return data as ViajeRedCompleto[];
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Publicar un viaje en la Red Nodexia
   */
  const publicarViajeEnRed = useCallback(async (
    dto: CrearViajeRedDTO,
    empresaId: string,
    usuarioId: string
  ): Promise<ViajeRedNodexia> => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 useRedNodexia.publicarViajeEnRed - Iniciando...', {
        dto,
        empresaId,
        usuarioId
      });

      // 1. Crear el viaje en red
      const viajeRedData = {
        viaje_id: dto.viaje_id,
        empresa_solicitante_id: empresaId,
        tarifa_ofrecida: dto.tarifa_ofrecida,
        descripcion_carga: dto.descripcion_carga,
        estado_red: 'abierto',
        publicado_por: usuarioId
      };

      console.log('📤 Insertando en viajes_red_nodexia:', viajeRedData);

      const { data: viajeRed, error: viajeError } = await supabase
        .from('viajes_red_nodexia')
        .insert(viajeRedData)
        .select()
        .single();

      if (viajeError) {
        console.error('❌ Error al insertar viaje_red:', viajeError);
        throw viajeError;
      }

      console.log('✅ Viaje red creado:', viajeRed);

      // 2. Crear los requisitos
      const requisitosData = {
        viaje_red_id: viajeRed.id,
        ...dto.requisitos
      };

      console.log('📤 Insertando requisitos:', requisitosData);

      const { error: requisitosError } = await supabase
        .from('requisitos_viaje_red')
        .insert(requisitosData);

      if (requisitosError) {
        console.error('❌ Error al insertar requisitos:', requisitosError);
        throw requisitosError;
      }

      console.log('✅ Requisitos creados exitosamente');

      // 3. 🔥 NUEVO: Actualizar el despacho con origen_asignacion = 'red_nodexia'
      // Primero obtenemos el despacho_id desde viajes_despacho
      const { data: viajeDespacho, error: viajeError2 } = await supabase
        .from('viajes_despacho')
        .select('despacho_id')
        .eq('id', dto.viaje_id)
        .single();

      if (!viajeError2 && viajeDespacho?.despacho_id) {
        console.log('📤 Actualizando despacho con origen_asignacion=red_nodexia:', viajeDespacho.despacho_id);
        
        const { error: despachoError } = await supabase
          .from('despachos')
          .update({ origen_asignacion: 'red_nodexia' })
          .eq('id', viajeDespacho.despacho_id);

        if (despachoError) {
          console.error('⚠️ Error actualizando origen_asignacion del despacho:', despachoError);
          // No lanzamos error, solo logging
        } else {
          console.log('✅ Despacho actualizado con origen_asignacion=red_nodexia');
        }
      }

      return viajeRed;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cancelar publicación en red
   */
  const cancelarViajeRed = useCallback(async (viajeRedId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('viajes_red_nodexia')
        .update({
          estado_red: 'cancelado',
          fecha_cierre: new Date().toISOString()
        })
        .eq('id', viajeRedId);

      if (updateError) throw updateError;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // OFERTAS
  // ============================================================================

  /**
   * Crear oferta para un viaje en red
   */
  const crearOferta = useCallback(async (
    dto: CrearOfertaDTO,
    transporteId: string,
    usuarioId: string
  ): Promise<OfertaRedNodexia> => {
    try {
      setLoading(true);
      setError(null);

      // Verificar si ya existe una oferta PENDIENTE de este transporte para este viaje
      const { data: ofertaExistente, error: checkError } = await supabase
        .from('ofertas_red_nodexia')
        .select('id, estado_oferta')
        .eq('viaje_red_id', dto.viaje_red_id)
        .eq('transporte_id', transporteId)
        .eq('estado_oferta', 'pendiente') // Solo bloquear si hay una pendiente
        .maybeSingle();

      console.log('🔍 Verificando oferta pendiente:', { 
        viajeRedId: dto.viaje_red_id, 
        transporteId, 
        ofertaExistente,
        checkError 
      });

      if (ofertaExistente) {
        throw new Error(`Ya tienes una oferta pendiente para este viaje. Espera la respuesta de la planta.`);
      }

      const { data, error: insertError } = await supabase
        .from('ofertas_red_nodexia')
        .insert({
          viaje_red_id: dto.viaje_red_id,
          transporte_id: transporteId,
          mensaje: dto.mensaje,
          camion_propuesto_id: dto.camion_propuesto_id,
          chofer_propuesto_id: dto.chofer_propuesto_id,
          estado_oferta: 'pendiente',
          ofertado_por: usuarioId
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Actualizar estado del viaje a 'con_ofertas'
      await supabase
        .from('viajes_red_nodexia')
        .update({ estado_red: 'con_ofertas' })
        .eq('id', dto.viaje_red_id);

      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtener ofertas de un viaje
   */
  const obtenerOfertasViaje = useCallback(async (viajeRedId: string): Promise<OfertaRedCompleta[]> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('ofertas_red_nodexia')
        .select(`
          *,
          transporte:empresas!transporte_id(
            id, 
            nombre, 
            cuit, 
            telefono, 
            email, 
            localidad, 
            provincia
          )
        `)
        .eq('viaje_red_id', viajeRedId)
        .order('fecha_oferta', { ascending: false });

      if (queryError) throw queryError;

      return data as OfertaRedCompleta[];
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Aceptar oferta y asignar transporte
   */
  const aceptarOferta = useCallback(async (
    ofertaId: string,
    viajeRedId: string,
    transporteId: string,
    usuarioId: string
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // 1. Actualizar estado de la oferta aceptada
      const { error: ofertaError } = await supabase
        .from('ofertas_red_nodexia')
        .update({
          estado_oferta: 'aceptada',
          fecha_respuesta: new Date().toISOString()
        })
        .eq('id', ofertaId);

      if (ofertaError) throw ofertaError;

      // 2. Rechazar las demás ofertas
      const { error: rechazarError } = await supabase
        .from('ofertas_red_nodexia')
        .update({
          estado_oferta: 'rechazada',
          fecha_respuesta: new Date().toISOString()
        })
        .eq('viaje_red_id', viajeRedId)
        .neq('id', ofertaId);

      if (rechazarError) throw rechazarError;

      // 3. Actualizar el viaje en red
      const { error: viajeError } = await supabase
        .from('viajes_red_nodexia')
        .update({
          estado_red: 'asignado',
          transporte_asignado_id: transporteId,
          oferta_aceptada_id: ofertaId,
          fecha_asignacion: new Date().toISOString(),
          asignado_por: usuarioId
        })
        .eq('id', viajeRedId);

      if (viajeError) throw viajeError;

      // 4. Actualizar el viaje original para asignar el transporte
      // (esto se hará en el componente que llame a esta función)

    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Rechazar oferta
   */
  const rechazarOferta = useCallback(async (ofertaId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('ofertas_red_nodexia')
        .update({
          estado_oferta: 'rechazada',
          fecha_respuesta: new Date().toISOString()
        })
        .eq('id', ofertaId);

      if (updateError) throw updateError;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Retirar oferta (por parte del transporte)
   */
  const retirarOferta = useCallback(async (ofertaId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('ofertas_red_nodexia')
        .update({
          estado_oferta: 'retirada',
          fecha_respuesta: new Date().toISOString()
        })
        .eq('id', ofertaId);

      if (updateError) throw updateError;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // ESTADÍSTICAS
  // ============================================================================

  /**
   * Obtener estadísticas de la red
   */
  const obtenerEstadisticas = useCallback(async (): Promise<EstadisticasRedNodexia> => {
    try {
      setLoading(true);
      setError(null);

      // Consultas en paralelo
      const [abiertos, conOfertas, asignados, ofertas] = await Promise.all([
        supabase.from('viajes_red_nodexia').select('id', { count: 'exact', head: true }).eq('estado_red', 'abierto'),
        supabase.from('viajes_red_nodexia').select('id', { count: 'exact', head: true }).eq('estado_red', 'con_ofertas'),
        supabase.from('viajes_red_nodexia').select('id', { count: 'exact', head: true }).eq('estado_red', 'asignado'),
        supabase.from('ofertas_red_nodexia').select('id', { count: 'exact', head: true }).eq('estado_oferta', 'pendiente')
      ]);

      return {
        total_viajes_abiertos: abiertos.count || 0,
        total_viajes_con_ofertas: conOfertas.count || 0,
        total_viajes_asignados: asignados.count || 0,
        total_ofertas_pendientes: ofertas.count || 0,
        promedio_ofertas_por_viaje: 0, // Calcular con query más compleja
        tiempo_promedio_asignacion_horas: 0 // Calcular con query más compleja
      };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    // Viajes
    obtenerViajesAbiertos,
    obtenerMisViajesPublicados,
    obtenerMisViajesAsignados, // 🔥 NUEVO
    publicarViajeEnRed,
    cancelarViajeRed,
    // Ofertas
    crearOferta,
    obtenerOfertasViaje,
    aceptarOferta,
    rechazarOferta,
    retirarOferta,
    // Estadísticas
    obtenerEstadisticas
  };
}
