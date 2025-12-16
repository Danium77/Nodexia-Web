# Plan de Implementación - Sistema de Estados Duales

## 📅 Fecha: 21 Noviembre 2025

## ✅ Decisiones Confirmadas

1. **Estados Duales:** Separar UNIDAD (logística) y CARGA (operativa)
2. **GPS Tracking:** Incluido en MVP con actualización cada 30 segundos
3. **Registros Automáticos:** Se generan al crear el viaje
4. **Cancelaciones:** Posibles en cualquier momento con registro de responsable
5. **Vinculación Chofer:** Agregar `user_id` a tabla `choferes`

---

## 🚀 Fase 1: Migración de Base de Datos

### Archivos Creados

- ✅ `sql/000_verificar_prerequisitos.sql` - Verificación pre-migración
- ✅ `sql/migrations/011_sistema_estados_duales.sql` - Migración principal
- ✅ `sql/funciones_estados.sql` - Funciones auxiliares
- ✅ `docs/FLUJO-ESTADOS-OPERACIONES.md` - Documentación completa

### Pasos de Ejecución

```bash
# 1. Backup de base de datos (CRÍTICO)
# En Supabase: Dashboard → Database → Backups → Create backup

# 2. Verificar prerequisitos
# Supabase SQL Editor → Copiar contenido de 000_verificar_prerequisitos.sql → Run

# 3. Ejecutar migración principal
# SQL Editor → Copiar contenido de 011_sistema_estados_duales.sql → Run

# 4. Ejecutar funciones auxiliares
# SQL Editor → Copiar contenido de funciones_estados.sql → Run

# 5. Verificar instalación
SELECT COUNT(*) FROM estado_unidad_viaje;
SELECT COUNT(*) FROM estado_carga_viaje;
SELECT * FROM vista_estado_viaje_completo LIMIT 5;
```

### Tablas Creadas

1. **estado_unidad_viaje**
   - Tracking de chofer + camión
   - GPS en tiempo real
   - 16 estados posibles

2. **estado_carga_viaje**
   - Tracking de producto + docs
   - Control de faltantes/rechazos
   - 14 estados posibles

3. **historial_ubicaciones**
   - Registro histórico GPS
   - Velocidad, rumbo, precisión

4. **notificaciones**
   - Push notifications
   - In-app badges
   - 8 tipos de eventos

### Campo Agregado

- `choferes.user_id` → Vincula chofer con `auth.users`

---

## 📱 Fase 2: APIs Backend

### Endpoints a Crear

#### `/api/viajes/[id]/estado-unidad`
```typescript
POST /api/viajes/[id]/estado-unidad
{
  "nuevo_estado": "en_transito_origen",
  "observaciones": "Saliendo con 15 min de retraso"
}

Response:
{
  "exitoso": true,
  "mensaje": "Estado actualizado: asignado → en_transito_origen",
  "estado_anterior": "asignado",
  "estado_nuevo": "en_transito_origen",
  "proximos_estados": ["arribado_origen", "en_incidencia", "cancelado"]
}
```

#### `/api/viajes/[id]/estado-carga`
```typescript
POST /api/viajes/[id]/estado-carga
{
  "nuevo_estado": "cargado",
  "peso_real": 34800,
  "remito_numero": "REM-2025-1234",
  "observaciones": "Carga completa"
}
```

#### `/api/viajes/[id]/gps`
```typescript
POST /api/viajes/[id]/gps
{
  "latitud": -34.6037,
  "longitud": -58.3816,
  "velocidad_kmh": 85.5,
  "precision_metros": 12.3,
  "rumbo_grados": 245
}
```

#### `/api/viajes/[id]/estados`
```typescript
GET /api/viajes/[id]/estados

Response:
{
  "viaje_id": "...",
  "estado_unidad": {
    "actual": "en_transito_destino",
    "proximos_validos": ["arribado_destino", "en_incidencia"],
    "ubicacion_actual": {
      "lat": -34.6037,
      "lon": -58.3816,
      "velocidad_kmh": 85.5,
      "ultima_actualizacion": "2025-11-21T14:30:00Z"
    }
  },
  "estado_carga": {
    "actual": "en_transito",
    "proximos_validos": ["en_proceso_descarga"],
    "producto": "Soja",
    "peso_real_kg": 34800,
    "remito_numero": "REM-2025-1234"
  }
}
```

#### `/api/notificaciones`
```typescript
GET /api/notificaciones?user_id=[id]&no_leidas=true

POST /api/notificaciones/[id]/marcar-leida
```

---

## 🎨 Fase 3: Componentes UI

### Componentes a Crear

#### 1. `<EstadoBadge>`
```tsx
// Muestra badge de estado con color según tipo
<EstadoBadge 
  tipo="unidad" 
  estado="en_transito_origen" 
  size="sm" 
/>
```

#### 2. `<TimelineEstados>`
```tsx
// Timeline visual con ambos estados en paralelo
<TimelineEstados 
  viajeId="..." 
  mostrarUnidad={true}
  mostrarCarga={true}
/>
```

#### 3. `<MapaUbicacionTiempoReal>`
```tsx
// Mapa con ubicación actual del chofer
<MapaUbicacionTiempoReal 
  viajeId="..."
  autoRefresh={30} // segundos
/>
```

#### 4. `<PanelActualizarEstado>`
```tsx
// Panel contextual por rol
<PanelActualizarEstado 
  viajeId="..."
  rol="chofer" // Muestra solo acciones válidas para chofer
  onEstadoActualizado={handleUpdate}
/>
```

#### 5. `<NotificacionesBadge>`
```tsx
// Badge con contador de notificaciones
<NotificacionesBadge userId="..." />
```

---

## 📄 Fase 4: Actualizar Páginas Existentes

### 1. `/chofer/viajes.tsx`

**Cambios:**
- ✅ Reemplazar `despachos.estado` por `estado_unidad_viaje.estado_unidad`
- ✅ Agregar tracking GPS automático
- ✅ Botones de acción según estado actual
- ✅ Mostrar notificaciones push

**Acciones por Estado:**
```typescript
const accionesPorEstado = {
  confirmado_chofer: [
    { label: '🚗 Salir hacia origen', valor: 'en_transito_origen' }
  ],
  en_transito_origen: [
    { label: '📍 Arribé a origen', valor: 'arribado_origen' },
    { label: '⚠️ Reportar incidencia', valor: 'en_incidencia' }
  ],
  // ... resto de estados
};
```

### 2. `/control-acceso.tsx`

**Cambios:**
- ✅ Escanear QR y mostrar ambos estados
- ✅ Validar documentación antes de permitir egreso
- ✅ Registrar ingreso → `estado_unidad = 'arribado_origen'`
- ✅ Registrar egreso → `estado_unidad = 'saliendo_origen'`
- ✅ Validar docs → `estado_carga = 'documentacion_validada'`

### 3. `/supervisor-carga.tsx` (NUEVO)

**Crear página completa:**
- 📋 Lista de camiones en playa de espera
- 🚨 Llamar a carga → `estado_unidad = 'llamado_carga'`
- ✅ Confirmar posicionamiento → `estado_unidad = 'posicionado_carga'`
- 📦 Iniciar carga → `estado_carga = 'en_proceso_carga'`
- ✔️ Finalizar carga → ambos estados actualizados

### 4. `/crear-despacho.tsx`

**Mejoras:**
- 📊 Mostrar vista unificada de estados
- 🔄 Timeline de progreso del viaje
- 📍 Mapa con ubicación actual

### 5. `/coordinator-dashboard.tsx` (Transporte)

**Agregar:**
- 🚛 Panel de flota en tiempo real
- 📍 Mapa con todos los camiones
- ⏱️ Alertas de demoras
- 📊 KPIs de rendimiento

---

## 🔔 Fase 5: Sistema de Notificaciones

### Firebase Cloud Messaging Setup

```bash
# 1. Instalar SDK
pnpm add firebase

# 2. Configurar en _app.tsx
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';
```

### Eventos que Disparan Notificaciones

1. **Viaje Asignado** → Chofer
2. **Llamado a Carga** → Chofer
3. **Viaje Cancelado** → Chofer + Coordinadores
4. **Demora Detectada** → Coordinadores
5. **Documentación Rechazada** → Chofer + Supervisor
6. **Incidencia Reportada** → Coordinadores

### Configurar Service Worker

```javascript
// public/firebase-messaging-sw.js
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.message,
    icon: '/logo-nodexia.png',
    badge: '/badge-icon.png',
    data: { url: data.url }
  });
});
```

---

## 📍 Fase 6: GPS Tracking en App Móvil

### Hook: `useGPSTracking`

```typescript
// lib/hooks/useGPSTracking.ts
export function useGPSTracking(viajeId: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        await fetch(`/api/viajes/${viajeId}/gps`, {
          method: 'POST',
          body: JSON.stringify({
            latitud: position.coords.latitude,
            longitud: position.coords.longitude,
            velocidad_kmh: position.coords.speed ? position.coords.speed * 3.6 : null,
            precision_metros: position.coords.accuracy,
            rumbo_grados: position.coords.heading
          })
        });
      },
      null,
      { 
        enableHighAccuracy: true, 
        maximumAge: 0, 
        timeout: 5000 
      }
    );
    
    return () => navigator.geolocation.clearWatch(watchId);
  }, [viajeId, enabled]);
}
```

### Uso en `/chofer/viajes.tsx`

```typescript
const estadosConGPS = ['en_transito_origen', 'en_transito_destino'];
const { tracking, error } = useGPSTracking(
  viajeActual.id, 
  estadosConGPS.includes(estadoUnidad)
);
```

---

## 🧪 Fase 7: Testing

### Tests Unitarios

```typescript
// __tests__/estados/transiciones.test.ts
describe('Transiciones de Estado UNIDAD', () => {
  it('permite transición de confirmado_chofer a en_transito_origen', () => {
    const validos = obtenerProximosEstados('confirmado_chofer');
    expect(validos).toContain('en_transito_origen');
  });
  
  it('NO permite saltar estados', () => {
    const validos = obtenerProximosEstados('confirmado_chofer');
    expect(validos).not.toContain('arribado_origen');
  });
});
```

### Tests de Integración

```typescript
// __tests__/api/estados.test.ts
describe('API /api/viajes/[id]/estado-unidad', () => {
  it('actualiza estado correctamente', async () => {
    const res = await fetch(`/api/viajes/${viajeId}/estado-unidad`, {
      method: 'POST',
      body: JSON.stringify({ nuevo_estado: 'en_transito_origen' })
    });
    expect(res.status).toBe(200);
  });
  
  it('rechaza transición inválida', async () => {
    const res = await fetch(`/api/viajes/${viajeId}/estado-unidad`, {
      method: 'POST',
      body: JSON.stringify({ nuevo_estado: 'viaje_completado' }) // Salto inválido
    });
    expect(res.status).toBe(400);
  });
});
```

---

## 📊 Fase 8: Dashboards y Reportes

### Dashboard Coordinador Transporte

```tsx
// pages/transporte/dashboard.tsx
- Mapa con flota en tiempo real
- Lista de viajes activos con estados
- Alertas de demoras (> 2h en playa)
- KPIs: Tiempo promedio en planta, viajes completados hoy
```

### Dashboard Coordinador Planta

```tsx
// pages/planning/dashboard.tsx
- Estado de despachos del día
- Camiones en playa de espera
- Tiempo promedio de carga
- Alertas de documentación pendiente
```

### Reportes

```sql
-- Reporte: Tiempos promedio por transporte
SELECT 
  transporte_nombre,
  AVG(horas_en_planta) as promedio_horas_planta,
  AVG(minutos_de_carga) as promedio_minutos_carga,
  COUNT(*) as total_viajes
FROM vista_estado_viaje_completo
WHERE fecha_completado > NOW() - INTERVAL '30 days'
GROUP BY transporte_nombre
ORDER BY promedio_horas_planta ASC;
```

---

## 🔐 Fase 9: Seguridad y RLS

### Policies Implementadas

```sql
-- Choferes solo ven sus viajes
CREATE POLICY "Choferes ven sus viajes"
ON estado_unidad_viaje FOR SELECT
USING (
  auth.uid() IN (
    SELECT ch.user_id FROM choferes ch
    INNER JOIN viajes_despacho vd ON vd.chofer_id = ch.id
    WHERE vd.id = estado_unidad_viaje.viaje_id
  )
);

-- Solo choferes actualizan GPS
CREATE POLICY "Solo choferes insertan GPS"
ON historial_ubicaciones FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT ch.user_id FROM choferes ch
    WHERE ch.id = historial_ubicaciones.chofer_id
  )
);
```

---

## 📱 Fase 10: PWA Setup

### manifest.json

```json
{
  "name": "Nodexia Chofer",
  "short_name": "Nodexia",
  "start_url": "/chofer/viajes",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#eab308",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker

```javascript
// public/sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('nodexia-v1').then((cache) => {
      return cache.addAll([
        '/chofer/viajes',
        '/offline.html'
      ]);
    })
  );
});
```

---

## ✅ Checklist de Implementación

### Hoy (21 Nov)
- [x] Crear documentación completa
- [x] Crear migration SQL
- [x] Crear funciones auxiliares
- [x] Actualizar tipos TypeScript
- [ ] Ejecutar verificación de prerequisitos
- [ ] Ejecutar migración en Supabase

### Próxima Sesión
- [ ] Crear APIs de estados
- [ ] Actualizar `/chofer/viajes.tsx`
- [ ] Crear `/supervisor-carga.tsx`
- [ ] Implementar GPS tracking
- [ ] Configurar Firebase Cloud Messaging

### Semana 1
- [ ] Actualizar `/control-acceso.tsx`
- [ ] Crear componentes UI compartidos
- [ ] Implementar notificaciones in-app
- [ ] Dashboard coordinador transporte

### Semana 2
- [ ] Tests de integración
- [ ] PWA setup completo
- [ ] Reportes y KPIs
- [ ] Capacitación usuarios

---

## 🚨 Consideraciones Importantes

1. **Backup Obligatorio:** Hacer backup antes de migrar
2. **Migración Progresiva:** Habilitar por empresa (beta test)
3. **Compatibilidad:** Mantener código viejo mientras se migra
4. **GPS Permissions:** Solicitar permisos en primer uso
5. **Offline Support:** Cachear estados localmente
6. **Battery Usage:** Pausar GPS cuando app en background > 5 min

---

## 📞 Contacto de Emergencia

Si algo falla durante la migración:
1. Detener ejecución inmediatamente
2. Restaurar backup
3. Revisar logs de Supabase
4. Contactar soporte

---

**Documento actualizado:** 21 Nov 2025
**Próxima revisión:** Después de ejecutar migración
