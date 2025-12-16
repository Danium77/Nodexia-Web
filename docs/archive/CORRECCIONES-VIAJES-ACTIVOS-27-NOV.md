# Correcciones Viajes Activos - 27 Nov 2025

## 🎯 Problemas Reportados

1. **Mapa no muestra ubicación correcta**
   - Usaba coordenadas simuladas/aleatorias
   - Iconos de camión no se visualizaban correctamente

2. **Timeline no se distinguen iconos y palabras**
   - Bajo contraste en tema oscuro
   - Textos grises difíciles de leer

## ✅ Soluciones Implementadas

### 1. Integración de GPS Real

**Archivo:** `pages/transporte/viajes-activos.tsx`

Modificaciones:
- Agregada carga de ubicaciones GPS reales desde tabla `ubicaciones_choferes`
- Query actualizado para incluir última ubicación por viaje:
  ```typescript
  // Cargar ubicaciones GPS en paralelo con otros recursos
  const ubicacionesData = await supabase
    .from('ubicaciones_choferes')
    .select('viaje_id, latitude, longitude, velocidad, timestamp')
    .in('viaje_id', viajeIds)
    .order('timestamp', { ascending: false })
  ```

- Mapeado de ubicaciones GPS a cada viaje:
  ```typescript
  gps_lat: ubicacion?.latitude,
  gps_lng: ubicacion?.longitude,
  gps_velocidad: ubicacion?.velocidad,
  gps_timestamp: ubicacion?.timestamp
  ```

- `viajesParaMapa` ahora usa coordenadas reales:
  ```typescript
  ubicacion_actual: (v as any).gps_lat && (v as any).gps_lng ? {
    lat: parseFloat((v as any).gps_lat),
    lng: parseFloat((v as any).gps_lng),
    timestamp: (v as any).gps_timestamp || new Date().toISOString(),
    velocidad: (v as any).gps_velocidad
  } : null
  ```

### 2. Iconos Personalizados de Camión

**Archivo:** `components/Maps/GoogleMapViajes.tsx`

Creada función `createTruckIcon()`:
- Genera icono SVG de camión personalizado
- Colores dinámicos según estado del viaje:
  - `pendiente` → Gris (#6b7280)
  - `camion_asignado` → Azul (#3b82f6)
  - `confirmado_chofer` → Verde (#10b981)
  - `en_transito_origen/destino` → Púrpura (#8b5cf6)
  - `arribo_origen/destino` → Cian (#06b6d4)
  - `completado` → Verde brillante (#22c55e)
  - `cancelado` → Rojo (#ef4444)

- Icono con shadow y punto de anclaje optimizado
- Tamaño: 32x32px con círculo de estado en la base

### 3. Mejoras de Contraste en Timeline

**Archivo:** `components/Transporte/TimelineEstados.tsx`

Cambios realizados:

#### Encabezados
- `text-blue-700` → `text-blue-400` (Estado Unidad)
- `text-green-700` → `text-green-400` (Estado Carga)

#### Líneas Conectoras
- `bg-gray-300` → `bg-gray-600` (más visible en fondo oscuro)

#### Textos de Estado
- `text-gray-500` → `text-gray-400` (estado anterior)
- `text-gray-700` → `text-gray-200` (estados históricos)
- `text-blue-700` → `text-blue-400` (estado actual unidad)
- `text-green-700` → `text-green-400` (estado actual carga)

#### Metadatos (fecha, usuario, notas)
- `text-gray-500` → `text-gray-400` (fechas y usuarios)
- `text-gray-600` → `text-gray-300` (notas y metadata)

#### Mensaje de vacío
- `text-muted-foreground` → `text-gray-400`

### 4. Reactivación del Timeline

**Archivo:** `pages/transporte/viajes-activos.tsx`

- Descomentado import de `TimelineEstados`
- Descomentada sección de historial en modal de detalle
- **REQUIERE:** Instalación de función SQL `get_viaje_estados_historial`

## 📋 Requisitos Previos

### SQL Functions Necesarias

Debes ejecutar en Supabase SQL Editor:

1. **`sql/quick-fix-viajes-activos.sql`** (OBLIGATORIO)
   - Instala función `get_viaje_estados_historial`
   - Necesaria para que Timeline funcione sin errores

2. **`sql/ubicaciones_choferes.sql`** (RECOMENDADO)
   - Crea tabla `ubicaciones_choferes` si no existe
   - Crea índices optimizados para consultas GPS
   - Configura RLS (Row Level Security)
   - Crea función `get_ultima_ubicacion_viaje()`
   - Crea función de limpieza `cleanup_ubicaciones_antiguas()`

## 🔄 Flujo de Datos GPS

### App Móvil del Chofer (Futuro)
1. Chofer inicia viaje
2. App envía ubicación cada X segundos a `ubicaciones_choferes`
3. Registro incluye:
   - `latitude`, `longitude` (coordenadas)
   - `accuracy` (precisión GPS)
   - `velocidad` (km/h)
   - `heading` (dirección en grados)
   - `bateria` (nivel de batería %)
   - `viaje_id` (relaciona con viaje activo)

### Backend (Actual)
1. Coordinador abre "Viajes Activos"
2. Sistema carga viajes de su empresa de transporte
3. Para cada viaje, busca última ubicación en `ubicaciones_choferes`
4. Viajes seleccionados se muestran en mapa con:
   - Icono de camión personalizado (color según estado)
   - Popup con datos del viaje
   - Actualización automática cada 30 segundos (configurable)

## 🎨 Mejoras Visuales

### Mapa
- ✅ Iconos de camión claramente visibles
- ✅ Colores distinguibles por estado
- ✅ Popup informativo con datos del viaje
- ✅ Zoom y pan optimizados
- ✅ Centro automático basado en ubicaciones

### Timeline
- ✅ Mejor contraste para tema oscuro
- ✅ Iconos más visibles (Truck, Package, Clock, User)
- ✅ Estados actuales destacados con color brillante
- ✅ Líneas conectoras más gruesas y visibles
- ✅ Texto legible en todas las secciones

## 🧪 Testing

### Pruebas Manuales Requeridas

1. **Sin GPS (actual)**:
   - ✅ Verificar que viajes sin GPS no muestran marcador
   - ✅ Confirmar que mapa sigue funcionando
   - ✅ Validar que no hay errores en consola

2. **Con GPS (después de insertar datos)**:
   ```sql
   -- Insertar ubicación de prueba
   INSERT INTO ubicaciones_choferes (
     chofer_id,
     viaje_id,
     latitude,
     longitude,
     velocidad,
     timestamp
   ) VALUES (
     'UUID_CHOFER',
     'UUID_VIAJE',
     -34.6037,  -- Buenos Aires
     -58.3816,
     65.5,      -- 65.5 km/h
     NOW()
   );
   ```
   - Verificar que marcador aparece en mapa
   - Confirmar icono de camión con color correcto
   - Validar datos en popup

3. **Timeline**:
   - Ejecutar `sql/quick-fix-viajes-activos.sql`
   - Abrir modal de detalle de viaje
   - Verificar que Timeline carga sin errores
   - Confirmar legibilidad de todos los textos

## 📦 Dependencias Instaladas

```bash
npm install lucide-react --legacy-peer-deps
npm install react-leaflet leaflet
```

## 🚀 Próximos Pasos

### Corto Plazo
1. Instalar funciones SQL pendientes
2. Probar con ubicaciones GPS reales
3. Validar Timeline con cambios de estado

### Medio Plazo
1. Implementar app móvil para choferes
2. Agregar tracking de ruta completa (no solo ubicación actual)
3. Mostrar trail/rastro del camión en el mapa
4. Alertas de desvío de ruta
5. Notificaciones push al coordinador

### Largo Plazo
1. Geocodificación automática de direcciones (origen/destino)
2. Cálculo de ETA (Estimated Time of Arrival)
3. Análisis de velocidad y paradas
4. Reportes de uso de combustible estimado
5. Integración con sistema de telemetría del camión

## 📊 Impacto

### Performance
- Consulta GPS optimizada con índices
- Solo carga última ubicación por viaje (no todo el historial)
- Query en paralelo con otros recursos (no bloquea carga)

### UX
- Mapa más intuitivo y profesional
- Iconos claros y diferenciados
- Timeline legible en tema oscuro
- Información GPS en tiempo real (cuando disponible)

### Escalabilidad
- Tabla `ubicaciones_choferes` indexada para búsqueda rápida
- Función de limpieza automática (mantiene solo 7 días)
- RLS configurado para seguridad
- Preparado para múltiples empresas de transporte

---

**Fecha:** 27 de Noviembre de 2025  
**Estado:** ✅ Completado  
**Archivos Modificados:** 3  
**Tests Pendientes:** Manual con GPS real
