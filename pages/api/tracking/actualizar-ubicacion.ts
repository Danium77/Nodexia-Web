import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Usar service role para bypass RLS (la app móvil enviará token JWT propio)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

interface TrackingData {
  chofer_id: string;
  latitud: number;
  longitud: number;
  timestamp?: string;
  velocidad?: number;
  rumbo?: number;
  precision_metros?: number;
  bateria_porcentaje?: number;
  app_version?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🚀 [Tracking API] Inicio de request');
  
  // Solo permitir POST
  if (req.method !== 'POST') {
    console.log('❌ [Tracking API] Método no permitido:', req.method);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const data: TrackingData = req.body;
    console.log('📦 [Tracking API] Data recibida:', {
      chofer_id: data.chofer_id,
      latitud: data.latitud,
      longitud: data.longitud,
      timestamp: data.timestamp
    });

    // Validaciones básicas
    if (!data.chofer_id) {
      return res.status(400).json({ error: 'chofer_id es requerido' });
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

    // Validar que el chofer exista
    const { data: chofer, error: choferError } = await supabaseAdmin
      .from('choferes')
      .select('id')
      .eq('id', data.chofer_id)
      .single();

    if (choferError || !chofer) {
      console.error('❌ Chofer no encontrado:', data.chofer_id, choferError);
      return res.status(404).json({ error: 'Chofer no encontrado' });
    }

    console.log('✅ Chofer validado:', chofer.id);

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
      chofer_id: data.chofer_id,
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
      console.error('Error al insertar tracking:', insertError);
      return res.status(500).json({
        error: 'Error al guardar ubicación',
        details: insertError.message
      });
    }

    console.log('✅ Ubicación insertada en tracking_gps:', trackingData.id);

    // Verificar si el chofer está en viaje activo
    const { data: viajeActivo, error: viajeError } = await supabaseAdmin
      .from('viajes_despacho')
      .select('id, estado, despacho_id')
      .eq('chofer_id', data.chofer_id)
      .in('estado', [
        'confirmado_chofer',
        'en_transito_origen',
        'arribo_origen',
        'carga_completada',
        'en_transito_destino'
      ])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (viajeError) {
      console.error('❌ Error buscando viaje activo:', viajeError);
    }

    // 🔥 NUEVO: Si hay viaje activo, también insertar en ubicaciones_choferes
    if (viajeActivo) {
      console.log('🚛 Viaje activo encontrado:', viajeActivo.id, '- Insertando en ubicaciones_choferes');
      
      const ubicacionData = {
        chofer_id: data.chofer_id,
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
        console.error('❌ Error insertando en ubicaciones_choferes:', ubicacionError);
        // No fallar la request, solo logear el error
      } else {
        console.log('✅ Ubicación también insertada en ubicaciones_choferes');
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
          estado_detectado = 'arribo_origen';

          // Actualizar estado del viaje
          await supabaseAdmin
            .from('viajes_despacho')
            .update({
              estado: 'arribo_origen',
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
          estado_detectado = 'arribo_destino';

          // Actualizar estado del viaje
          await supabaseAdmin
            .from('viajes_despacho')
            .update({
              estado: 'arribo_destino',
              updated_at: new Date().toISOString()
            })
            .eq('id', viajeConDespacho.id);

          // Actualizar estado del despacho también
          await supabaseAdmin
            .from('despachos')
            .update({
              estado: 'arribo_destino',
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
    console.error('Error en actualizar-ubicacion:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
}
