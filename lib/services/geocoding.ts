// lib/services/geocoding.ts
/**
 * Servicio de Geocoding usando Nominatim (OpenStreetMap)
 * 100% GRATUITO - Sin API Key
 * Rate limit: 1 request/segundo (suficiente para nuestro caso)
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodingResult {
  coordinates: Coordinates | null;
  displayName: string;
  error?: string;
}

// Cache en memoria para evitar requests repetidos
const geocodeCache = new Map<string, GeocodingResult>();

/**
 * Convierte un nombre de ubicación a coordenadas
 * @param locationName - Nombre de la ubicación (ej: "Rosario, Santa Fe, Argentina")
 * @returns Coordenadas lat/lng o null si no se encuentra
 */
export async function geocodeLocation(locationName: string): Promise<GeocodingResult> {
  // Verificar cache
  if (geocodeCache.has(locationName)) {
    return geocodeCache.get(locationName)!;
  }

  try {
    // Nominatim API - OpenStreetMap (GRATIS)
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.append('q', locationName);
    url.searchParams.append('format', 'json');
    url.searchParams.append('limit', '1');
    url.searchParams.append('countrycodes', 'ar'); // Restringir a Argentina

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Nodexia-Logistics-App/1.0', // Requerido por Nominatim
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.length === 0) {
      const result: GeocodingResult = {
        coordinates: null,
        displayName: locationName,
        error: 'Ubicación no encontrada',
      };
      geocodeCache.set(locationName, result);
      return result;
    }

    const result: GeocodingResult = {
      coordinates: {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      },
      displayName: data[0].display_name,
    };

    // Guardar en cache
    geocodeCache.set(locationName, result);

    return result;
  } catch (error) {
    console.error('Error en geocoding:', error);
    return {
      coordinates: null,
      displayName: locationName,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Geocodifica múltiples ubicaciones con delay para respetar rate limit
 * @param locations - Array de nombres de ubicaciones
 * @returns Array de resultados con coordenadas
 */
export async function geocodeMultiple(locations: string[]): Promise<GeocodingResult[]> {
  const results: GeocodingResult[] = [];
  
  for (const location of locations) {
    const result = await geocodeLocation(location);
    results.push(result);
    
    // Delay de 1 segundo para respetar rate limit de Nominatim
    if (!geocodeCache.has(location)) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * Limpia el cache de geocoding (útil en desarrollo)
 */
export function clearGeocodeCache() {
  geocodeCache.clear();
}
