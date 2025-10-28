# 📱 Integración GPS - App Móvil del Chofer

## Objetivo
Permitir que el chofer comparta su ubicación en tiempo real desde su teléfono móvil mientras está en viaje.

## Arquitectura

```
📱 App Móvil del Chofer
    ↓ (envía cada 2-5 minutos)
    ↓
🌐 API: POST /api/location/update
    ↓ (guarda en)
    ↓
💾 Supabase: tabla ubicaciones_choferes
    ↓ (notifica vía)
    ↓
⚡ Realtime Subscriptions
    ↓ (actualiza)
    ↓
🗺️ Mapa en TrackingView (coordinador/admin)
```

---

## 🔧 Implementación - App Móvil

### Opción 1: React Native / Expo

```javascript
// services/LocationService.js
import * as Location from 'expo-location';

export class LocationService {
  constructor(choferId, viajeId, apiUrl) {
    this.choferId = choferId;
    this.viajeId = viajeId;
    this.apiUrl = apiUrl;
    this.intervalId = null;
  }

  async startTracking() {
    // Solicitar permisos
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      alert('Permiso de ubicación denegado');
      return;
    }

    // Enviar ubicación cada 3 minutos
    this.intervalId = setInterval(async () => {
      await this.sendLocation();
    }, 3 * 60 * 1000); // 3 minutos

    // Enviar inmediatamente la primera vez
    await this.sendLocation();
  }

  async sendLocation() {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const battery = await this.getBatteryLevel();

      const response = await fetch(`${this.apiUrl}/api/location/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
        body: JSON.stringify({
          chofer_id: this.choferId,
          viaje_id: this.viajeId,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          altitude: location.coords.altitude,
          velocidad: location.coords.speed ? location.coords.speed * 3.6 : null, // m/s a km/h
          heading: location.coords.heading,
          bateria: battery,
          timestamp: new Date(location.timestamp).toISOString(),
        }),
      });

      if (!response.ok) {
        console.error('Error enviando ubicación:', await response.text());
      } else {
        console.log('✅ Ubicación enviada correctamente');
      }
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
    }
  }

  async getBatteryLevel() {
    try {
      const { batteryLevel } = await Battery.getBatteryLevelAsync();
      return Math.round(batteryLevel * 100);
    } catch {
      return null;
    }
  }

  async getAuthToken() {
    // Implementar según tu sistema de auth
    // Por ejemplo, desde AsyncStorage o Context
    return await AsyncStorage.getItem('auth_token');
  }

  stopTracking() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Uso en el componente de viaje activo
import { LocationService } from './services/LocationService';

function ViajeActivoScreen({ choferId, viajeId }) {
  const [isTracking, setIsTracking] = useState(false);
  const locationService = useRef(null);

  const handleIniciarViaje = async () => {
    locationService.current = new LocationService(
      choferId,
      viajeId,
      'https://tu-dominio.com'
    );
    await locationService.current.startTracking();
    setIsTracking(true);
  };

  const handleFinalizarViaje = () => {
    locationService.current?.stopTracking();
    setIsTracking(false);
  };

  return (
    <View>
      <Text>Viaje #{viajeId}</Text>
      {isTracking ? (
        <Button title="Finalizar Viaje" onPress={handleFinalizarViaje} />
      ) : (
        <Button title="Iniciar Viaje" onPress={handleIniciarViaje} />
      )}
    </View>
  );
}
```

---

### Opción 2: PWA (Progressive Web App)

```javascript
// PWA - services/locationService.js
class LocationServicePWA {
  constructor(choferId, viajeId) {
    this.choferId = choferId;
    this.viajeId = viajeId;
    this.watchId = null;
  }

  async startTracking() {
    if (!navigator.geolocation) {
      alert('Geolocalización no soportada en este navegador');
      return;
    }

    // Solicitar permisos
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    if (permission.state === 'denied') {
      alert('Permisos de ubicación denegados');
      return;
    }

    // Tracking continuo
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.sendLocation(position),
      (error) => console.error('Error GPS:', error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  async sendLocation(position) {
    try {
      const battery = await navigator.getBattery?.();

      const response = await fetch('/api/location/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Enviar cookies de sesión
        body: JSON.stringify({
          chofer_id: this.choferId,
          viaje_id: this.viajeId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          velocidad: position.coords.speed ? position.coords.speed * 3.6 : null,
          heading: position.coords.heading,
          bateria: battery ? Math.round(battery.level * 100) : null,
          timestamp: new Date(position.timestamp).toISOString(),
        }),
      });

      if (response.ok) {
        console.log('✅ Ubicación actualizada');
      }
    } catch (error) {
      console.error('Error enviando ubicación:', error);
    }
  }

  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}

// Uso en página de viaje
let locationService;

document.getElementById('btn-iniciar').addEventListener('click', async () => {
  const choferId = 'uuid-del-chofer';
  const viajeId = 'uuid-del-viaje';
  
  locationService = new LocationServicePWA(choferId, viajeId);
  await locationService.startTracking();
  
  document.getElementById('status').textContent = '🟢 Tracking activo';
});

document.getElementById('btn-finalizar').addEventListener('click', () => {
  locationService?.stopTracking();
  document.getElementById('status').textContent = '⚪ Tracking pausado';
});
```

---

## 📋 Checklist de Implementación

### Backend (✅ COMPLETADO)
- ✅ Tabla `ubicaciones_choferes` creada con RLS
- ✅ API `/api/location/update` funcionando
- ✅ Permisos configurados (choferes INSERT, coordinadores SELECT)
- ✅ Supabase Realtime habilitado en TrackingMap

### Base de Datos
- ⬜ Ejecutar script SQL: `sql/ubicaciones_choferes.sql` en Supabase
- ⬜ Verificar que Realtime está habilitado para la tabla

### Frontend Web (✅ COMPLETADO)
- ✅ Geocoding con Nominatim implementado
- ✅ Mapa con Leaflet funcionando
- ✅ Suscripción Realtime configurada
- ✅ Timeline de estados implementado

### App Móvil (⬜ PENDIENTE)
- ⬜ Implementar LocationService (React Native o PWA)
- ⬜ Solicitar permisos de ubicación y batería
- ⬜ Configurar intervalo de envío (recomendado: 2-5 minutos)
- ⬜ Agregar botones "Iniciar Viaje" / "Finalizar Viaje"
- ⬜ Mostrar indicador visual de tracking activo
- ⬜ Manejar reconexión en caso de pérdida de red

---

## 🔋 Optimización de Batería

**Recomendaciones:**
- Enviar ubicación cada **3-5 minutos** (no cada segundo)
- Usar `accuracy: BALANCED` en lugar de `HIGH`
- Pausar tracking cuando el camión está detenido (detectar con velocidad = 0)
- Enviar solo si la ubicación cambió >50 metros

```javascript
// Ejemplo: Enviar solo si hubo movimiento significativo
let lastLocation = null;

function shouldSendLocation(newLocation) {
  if (!lastLocation) return true;
  
  const distance = calculateDistance(
    lastLocation.latitude,
    lastLocation.longitude,
    newLocation.latitude,
    newLocation.longitude
  );
  
  // Enviar solo si se movió más de 50 metros
  return distance > 0.05; // km
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
```

---

## 🧪 Testing

### Test Manual - Sin App Móvil

Puedes simular ubicaciones usando Postman o curl:

```bash
curl -X POST https://tu-dominio.com/api/location/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "chofer_id": "uuid-del-chofer",
    "viaje_id": "uuid-del-viaje",
    "latitude": -34.6037,
    "longitude": -58.3816,
    "accuracy": 10,
    "velocidad": 80,
    "bateria": 75
  }'
```

---

## 📊 Monitoreo

### Consultas útiles en Supabase

```sql
-- Ver última ubicación de todos los choferes activos
SELECT 
  c.nombre AS chofer,
  v.numero_viaje,
  uc.latitude,
  uc.longitude,
  uc.velocidad,
  uc.bateria,
  uc.timestamp,
  NOW() - uc.timestamp AS antiguedad
FROM ubicaciones_choferes uc
JOIN choferes c ON c.id = uc.chofer_id
JOIN viajes_despacho v ON v.id = uc.viaje_id
WHERE uc.timestamp > NOW() - INTERVAL '1 hour'
ORDER BY uc.timestamp DESC;

-- Ver historial de ubicaciones de un viaje
SELECT 
  latitude,
  longitude,
  velocidad,
  bateria,
  timestamp
FROM ubicaciones_choferes
WHERE viaje_id = 'uuid-del-viaje'
ORDER BY timestamp DESC
LIMIT 50;
```

---

## ✅ Estado Actual

- ✅ Geocoding con Nominatim
- ✅ Realtime subscriptions
- ✅ Timeline de estados
- ⏳ Rutas optimizadas (OpenRouteService - próximo paso)
- ⏳ App móvil del chofer
