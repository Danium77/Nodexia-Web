import { withAuth } from '@/lib/middleware/withAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface TrackingData {
  chofer_id?: string; // Ahora opcional — se verifica contra el token
  latitud: number;
  longitud: number;
  timestamp?: string;
  velocidad?: number;
  rumbo?: number;
  precision_metros?: number;
  bateria_porcentaje?: number;
  app_version?: string;
}

export default withAuth(async (req, res, authCtx) => {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const data: TrackingData = req.body;

    // Obtener chofer_id del usuario autenticado
    const { data: chofer } = await supabaseAdmin
      .from('choferes')
      .select('id')
      .eq('user_id', authCtx.userId)
      .single();

    const chofer_id = chofer?.id || data.chofer_id;

    if (!chofer_id) {
      return res.status(400).json({ error: 'No se pudo determinar el chofer' });
    }

    if (typeof data.latitud !== 'number' || typeof data.longitud !== 'number') {
      return res.status(400).json({ error: 'latitud y longitud deben ser números' });
    }

    // Validar rango de coordenadas (Argentina: lat -55 a -21, lon -73 a -53)
    if (data.latitud < -55 || data.latitud > -21) {
      return res.status(400).json({
        error: `Latitud fuera del rango de Argentina: ${data.latitud}`
      });
    }

    if (data.longitud < -73 || data.longitud > -53) {
      return res.status(400).json({
        error: `Longitud fuera del rango de Argentina: ${data.longitud}`
      });
    }

    // Validaciones opcionales
    if (data.velocidad !== undefined) {
      if (data.velocidad < 0 || data.velocidad > 200) {
        return res.status(400).json({
          error: 'Velocidad debe estar entre 0 y 200 km/h'
        });
      }
    }

    if (data.rumbo !== undefined) {
      if (data.rumbo < 0 || data.rumbo > 360) {
        return res.status(400).json({ error: 'Rumbo debe estar entre 0 y 360 grados' });
      }
    }

    if (data.bateria_porcentaje !== undefined) {
      if (data.bateria_porcentaje < 0 || data.bateria_porcentaje > 100) {
        return res.status(400).json({
          error: 'Batería debe estar entre 0 y 100%'
        });
      }
    }

    // Insertar en tracking_gps
    const insertData: any = {
      chofer_id,
      latitud: data.latitud,
      longitud: data.longitud,
      timestamp: data.timestamp || new Date().toISOString(),
      velocidad: data.velocidad || null,
      rumbo: data.rumbo || null,
      precision_metros: data.precision_metros || null,
      bateria_porcentaje: data.bateria_porcentaje || null,
      app_version: data.app_version || null
    };

    const { data: trackingData, error: insertError } = await supabaseAdmin
      .from('tracking_gps')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({
        error: 'Error al guardar ubicación',
        details: insertError.message
      });
    }

    // Verificar si el chofer está en viaje activo
    const { data: viajeActivo, error: viajeError } = await supabaseAdmin
      .from('viajes_despacho')
      .select('id, estado, despacho_id')
      .eq('chofer_id', chofer_id)
      .in('estado', [
        'confirmado_chofer',
        'en_transito_origen',
        'ingresado_origen',
        'llamado_carga',
        'cargando',
        'cargado',
        'egreso_origen',
        'en_transito_destino'
      ])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (viajeError) {
      // Error no crítico, continuar
    }

    // 🔥 NUEVO: Si hay viaje activo, también insertar en ubicaciones_choferes
    if (viajeActivo) {
      const ubicacionData = {
        chofer_id,
        viaje_id: viajeActivo.id,
        latitude: data.latitud,
        longitude: data.longitud,
        accuracy: data.precision_metros || null,
        velocidad: data.velocidad || null,
        heading: data.rumbo || null,
        timestamp: data.timestamp || new Date().toISOString()
      };

      const { error: ubicacionError } = await supabaseAdmin
        .from('ubicaciones_choferes')
        .insert(ubicacionData);

      if (ubicacionError) {
        // No fallar la request, error no crítico
      }
    }

    // Cargar datos del despacho para detectar estados
    const { data: viajeConDespacho } = viajeActivo ? await supabaseAdmin
      .from('viajes_despacho')
      .select('id, estado, despacho_id, despachos(origen_id, destino_id, ubicaciones_origen:origen_id(latitud, longitud), ubicaciones_destino:destino_id(latitud, longitud))')
      .eq('id', viajeActivo.id)
      .single()
      : { data: null };

    let estado_detectado: string | null = null;

    if (viajeConDespacho && viajeConDespacho.despachos) {
      const despacho = viajeConDespacho.despachos as any;

      // Calcular distancia a origen y destino usando Haversine
      const calcularDistancia = (
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
      ): number => {
        const R = 6371; // Radio de la Tierra en km
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      // Radio de proximidad: 500 metros
      const RADIO_PROXIMIDAD_KM = 0.5;

      // Si está en tránsito al origen y se acerca, marcar arribo
      if (
        viajeConDespacho.estado === 'en_transito_origen' &&
        despacho.ubicaciones_origen?.latitud &&
        despacho.ubicaciones_origen?.longitud
      ) {
        const distanciaOrigen = calcularDistancia(
          data.latitud,
          data.longitud,
          despacho.ubicaciones_origen.latitud,
          despacho.ubicaciones_origen.longitud
        );

        if (distanciaOrigen <= RADIO_PROXIMIDAD_KM) {
          estado_detectado = 'ingresado_origen';

          // Actualizar estado del viaje
          await supabaseAdmin
            .from('viajes_despacho')
            .update({
              estado: 'ingresado_origen',
              updated_at: new Date().toISOString()
            })
            .eq('id', viajeConDespacho.id);
        }
      }

      // Si está en tránsito al destino y se acerca, marcar arribo
      if (
        viajeConDespacho.estado === 'en_transito_destino' &&
        despacho.ubicaciones_destino?.latitud &&
        despacho.ubicaciones_destino?.longitud
      ) {
        const distanciaDestino = calcularDistancia(
          data.latitud,
          data.longitud,
          despacho.ubicaciones_destino.latitud,
          despacho.ubicaciones_destino.longitud
        );

        if (distanciaDestino <= RADIO_PROXIMIDAD_KM) {
          estado_detectado = 'ingresado_destino';

          // Actualizar estado del viaje
          await supabaseAdmin
            .from('viajes_despacho')
            .update({
              estado: 'ingresado_destino',
              updated_at: new Date().toISOString()
            })
            .eq('id', viajeConDespacho.id);

          // Actualizar estado del despacho también
          await supabaseAdmin
            .from('despachos')
            .update({
              estado: 'ingresado_destino',
              updated_at: new Date().toISOString()
            })
            .eq('id', viajeConDespacho.despacho_id);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Ubicación actualizada correctamente',
      data: {
        id: trackingData.id,
        timestamp: trackingData.timestamp,
        estado_detectado
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});
