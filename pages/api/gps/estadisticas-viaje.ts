// pages/api/gps/estadisticas-viaje.ts
// API endpoint para calcular estadísticas de un viaje basado en GPS

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Función para calcular distancia entre dos puntos en kilómetros (fórmula de Haversine)
function calcularDistancia(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { viaje_id } = req.query;

    if (!viaje_id || typeof viaje_id !== 'string') {
      return res.status(400).json({ error: 'viaje_id es requerido' });
    }

    // Obtener todas las ubicaciones del viaje
    const { data: ubicaciones, error: ubicacionesError } = await supabaseAdmin
      .from('ubicaciones_choferes')
      .select('latitude, longitude, velocidad, timestamp')
      .eq('viaje_id', viaje_id)
      .order('timestamp', { ascending: true });

    if (ubicacionesError || !ubicaciones || ubicaciones.length === 0) {
      return res.status(200).json({
        viaje_id,
        tiene_datos: false,
        distancia_total_km: 0,
        velocidad_promedio_kmh: 0,
        velocidad_maxima_kmh: 0,
        tiempo_total_horas: 0,
        total_puntos: 0,
        primer_registro: null,
        ultimo_registro: null
      });
    }

    // Calcular distancia total recorrida
    let distanciaTotal = 0;
    for (let i = 1; i < ubicaciones.length; i++) {
      const dist = calcularDistancia(
        ubicaciones[i - 1].latitude,
        ubicaciones[i - 1].longitude,
        ubicaciones[i].latitude,
        ubicaciones[i].longitude
      );
      distanciaTotal += dist;
    }

    // Calcular velocidades
    const velocidades = ubicaciones
      .map(u => u.velocidad)
      .filter(v => v !== null && v !== undefined && v > 0);
    
    const velocidadPromedio = velocidades.length > 0
      ? velocidades.reduce((sum, v) => sum + v, 0) / velocidades.length
      : 0;
    
    const velocidadMaxima = velocidades.length > 0
      ? Math.max(...velocidades)
      : 0;

    // Calcular tiempo total
    const primerRegistro = new Date(ubicaciones[0].timestamp);
    const ultimoRegistro = new Date(ubicaciones[ubicaciones.length - 1].timestamp);
    const tiempoTotalMs = ultimoRegistro.getTime() - primerRegistro.getTime();
    const tiempoTotalHoras = tiempoTotalMs / (1000 * 60 * 60);

    return res.status(200).json({
      viaje_id,
      tiene_datos: true,
      distancia_total_km: Math.round(distanciaTotal * 100) / 100,
      velocidad_promedio_kmh: Math.round(velocidadPromedio * 100) / 100,
      velocidad_maxima_kmh: Math.round(velocidadMaxima * 100) / 100,
      tiempo_total_horas: Math.round(tiempoTotalHoras * 100) / 100,
      total_puntos: ubicaciones.length,
      primer_registro: ubicaciones[0].timestamp,
      ultimo_registro: ubicaciones[ubicaciones.length - 1].timestamp
    });

  } catch (error: any) {
    console.error('Error calculando estadísticas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
