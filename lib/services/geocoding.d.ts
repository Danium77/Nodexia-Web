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
/**
 * Convierte un nombre de ubicación a coordenadas
 * @param locationName - Nombre de la ubicación (ej: "Rosario, Santa Fe, Argentina")
 * @returns Coordenadas lat/lng o null si no se encuentra
 */
export declare function geocodeLocation(locationName: string): Promise<GeocodingResult>;
/**
 * Geocodifica múltiples ubicaciones con delay para respetar rate limit
 * @param locations - Array de nombres de ubicaciones
 * @returns Array de resultados con coordenadas
 */
export declare function geocodeMultiple(locations: string[]): Promise<GeocodingResult[]>;
/**
 * Limpia el cache de geocoding (útil en desarrollo)
 */
export declare function clearGeocodeCache(): void;
