# 📍 Sistema de Tracking GPS en Producción

## Fecha: 27 de Noviembre 2025

---

## ✅ Implementación Completada

Se ha implementado el sistema completo de tracking GPS en tiempo real para choferes. Los coordinadores de transporte pueden ahora ver la ubicación de los camiones en el mapa.

---

## 🎯 Componentes Implementados

### 1. Página de Tracking GPS para Choferes
**Archivo:** `pages/chofer/tracking-gps.tsx`

**Características:**
- ✅ Interfaz móvil optimizada para choferes
- ✅ Selección de viaje activo
- ✅ Activación/desactivación de tracking GPS
- ✅ Envío automático de ubicación cada 30 segundos
- ✅ Visualización en tiempo real de:
  - Latitud y longitud
  - Velocidad actual (km/h)
  - Precisión GPS (metros)
  - Nivel de batería del dispositivo
  - Total de ubicaciones enviadas
- ✅ Manejo de errores GPS
- ✅ Indicador visual de estado de tracking

**Acceso:** `/chofer/tracking-gps`

### 2. API de Registro de Ubicaciones
**Archivo:** `pages/api/gps/registrar-ubicacion.ts`

**Funcionalidad:**
- ✅ Endpoint POST para recibir ubicaciones GPS
- ✅ Validación de autenticación (requiere sesión activa)
- ✅ Verificación de permisos (solo el chofer del viaje puede enviar su ubicación)
- ✅ Validación de coordenadas (latitud: -90 a 90, longitud: -180 a 180)
- ✅ Almacenamiento en tabla `ubicaciones_choferes`
- ✅ Logs de debugging para monitoreo

**Endpoint:** `POST /api/gps/registrar-ubicacion`

**Body:**
```json
{
  "viaje_id": "uuid-del-viaje",
  "latitude": -34.6037,
  "longitude": -58.3816,
  "accuracy": 15.5,
  "altitude": 25.0,
  "velocidad": 65.5,
  "heading": 180,
  "bateria": 85
}
```

### 3. Botón de Acceso Rápido en Dashboard
**Archivo:** `pages/chofer/viajes.tsx`

**Mejora:**
- ✅ Botón "GPS" en el header del dashboard de chofer
- ✅ Acceso directo a la página de tracking
- ✅ Diseño destacado con gradiente cyan-blue
- ✅ Icono de mapa para fácil identificación

---

## 🚀 Flujo de Uso en Producción

### Para el Chofer:

1. **Iniciar Sesión**
   ```
   Email: mariano@logisticaexpres.com
   Password: Temporal2024!
   ```

2. **Acceder al Tracking GPS**
   - Opción A: Ir a `/chofer/tracking-gps` directamente
   - Opción B: Click en botón "GPS" en el dashboard de viajes

3. **Seleccionar Viaje**
   - La página muestra automáticamente los viajes activos asignados
   - Si solo hay 1 viaje, se selecciona automáticamente
   - Click en el viaje para seleccionarlo

4. **Activar Tracking**
   - Click en botón verde "Iniciar Tracking"
   - El navegador pedirá permiso para acceder al GPS
   - Aceptar permiso de ubicación

5. **Tracking Activo**
   - La ubicación se envía automáticamente cada 30 segundos
   - El chofer puede ver:
     - Coordenadas actuales
     - Velocidad en tiempo real
     - Precisión del GPS
     - Nivel de batería
     - Total de ubicaciones enviadas

6. **Detener Tracking**
   - Click en botón rojo "Detener Tracking"
   - El GPS se desactiva

### Para el Coordinador de Transporte:

1. **Iniciar Sesión**
   ```
   Email: gonzalo@logisticaexpres.com
   Password: Tempicxmej9o!1862
   ```

2. **Ver Ubicaciones en Tiempo Real**
   - Ir a `/transporte/viajes-activos`
   - Seleccionar viajes en la lista izquierda (checkbox)
   - Ver marcadores de camiones en el mapa con:
     - Icono personalizado de camión
     - Color según estado del viaje
     - Popup con información detallada

3. **Información del Popup**
   - Patente del camión
   - Nombre del chofer
   - Origen y destino
   - Estado actual del viaje

---

## 📊 Datos Almacenados

### Tabla: `ubicaciones_choferes`

Cada registro GPS incluye:
- `chofer_id` - UUID del chofer
- `viaje_id` - UUID del viaje
- `latitude` - Latitud (decimal)
- `longitude` - Longitud (decimal)
- `accuracy` - Precisión GPS en metros
- `altitude` - Altitud en metros (opcional)
- `velocidad` - Velocidad en km/h
- `heading` - Dirección en grados (0-360, opcional)
- `bateria` - Nivel de batería % (opcional)
- `timestamp` - Fecha y hora UTC del registro

**Retención:** Los datos se mantienen por 7 días automáticamente (función `cleanup_ubicaciones_antiguas()`)

---

## 🔧 Configuración de Producción

### 1. Permisos de Ubicación

**Navegadores soportados:**
- ✅ Chrome (Android/iOS)
- ✅ Safari (iOS)
- ✅ Firefox (Android)
- ✅ Edge (Android)

**Requisitos:**
- HTTPS habilitado (obligatorio para Geolocation API)
- Permiso de ubicación concedido por el usuario
- GPS activado en el dispositivo

### 2. Variables de Entorno

No requiere configuración adicional. Usa las credenciales de Supabase existentes:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### 3. Tabla de Base de Datos

Ejecutar en Supabase SQL Editor:
```bash
sql/ubicaciones_choferes.sql
```

Esto crea:
- ✅ Tabla `ubicaciones_choferes`
- ✅ Índices optimizados
- ✅ Row Level Security (RLS)
- ✅ Funciones auxiliares

---

## 🧪 Testing

### Paso 1: Testing desde Celular

1. **Acceder desde el celular del chofer**
   ```
   https://tu-dominio.com/chofer/tracking-gps
   ```

2. **Iniciar sesión con credenciales del chofer**

3. **Activar tracking y moverse**
   - El chofer debe moverse físicamente
   - El GPS del celular debe estar activado

4. **Ver en tiempo real desde PC/Tablet**
   - Abrir en otro dispositivo: `/transporte/viajes-activos`
   - Seleccionar el viaje del chofer
   - Ver el marcador moverse en el mapa

### Paso 2: Verificar en Base de Datos

```sql
-- Ver últimas 10 ubicaciones registradas
SELECT 
  uc.timestamp,
  uc.latitude,
  uc.longitude,
  uc.velocidad,
  uc.bateria,
  c.nombre as chofer_nombre,
  vd.numero_viaje
FROM ubicaciones_choferes uc
LEFT JOIN choferes c ON c.id = uc.chofer_id
LEFT JOIN viajes_despacho vd ON vd.id = uc.viaje_id
ORDER BY uc.timestamp DESC
LIMIT 10;
```

### Paso 3: Monitorear Logs

```bash
# En terminal donde corre npm run dev
# Verás logs como:
✅ GPS registrado - Viaje: uuid-xxx, Lat: -34.6037, Lng: -58.3816, Vel: 65.5 km/h
```

---

## 🐛 Troubleshooting

### Problema: "Error GPS: User denied Geolocation"

**Solución:**
1. Ir a configuración del navegador
2. Sitios web → Permisos → Ubicación
3. Permitir ubicación para tu dominio

### Problema: "No se envían las ubicaciones"

**Verificar:**
1. Conexión a internet activa
2. Sesión de usuario no expirada
3. Viaje seleccionado correctamente
4. Consola del navegador para errores

**SQL de verificación:**
```sql
-- Verificar que existe el chofer
SELECT * FROM choferes WHERE email = 'mariano@logisticaexpres.com';

-- Verificar viajes activos del chofer
SELECT * FROM viajes_despacho 
WHERE id_chofer = (SELECT id FROM choferes WHERE email = 'mariano@logisticaexpres.com')
AND estado IN ('confirmado_chofer', 'en_transito_origen', 'en_transito_destino');
```

### Problema: "Precisión GPS muy baja (>100m)"

**Causas:**
- Interior de edificio
- Clima nublado
- Interferencia electrónica

**Solución:**
- Esperar a estar al aire libre
- El sistema filtra ubicaciones con baja precisión automáticamente

---

## 📈 Mejoras Futuras Recomendadas

### Corto Plazo
- [ ] Agregar vibración en el celular cuando se envía ubicación
- [ ] Notificación push cuando el coordinador solicita ubicación
- [ ] Modo ahorro de batería (enviar cada 60 segundos)
- [ ] Historial de ruta del viaje (trail en el mapa)

### Medio Plazo
- [ ] Geofencing: alertas al entrar/salir de zonas
- [ ] Cálculo automático de ETA (tiempo estimado de llegada)
- [ ] Detección de paradas prolongadas
- [ ] Estadísticas de velocidad promedio

### Largo Plazo
- [ ] App móvil nativa (React Native)
- [ ] Integración con sistema de telemetría del camión
- [ ] Análisis de rutas óptimas
- [ ] Reportes de consumo de combustible estimado

---

## 📞 Soporte

Si encuentras problemas:
1. Verificar que la tabla `ubicaciones_choferes` existe
2. Revisar permisos RLS en Supabase
3. Comprobar logs del servidor (terminal)
4. Comprobar consola del navegador (F12)

---

**Estado:** ✅ PRODUCCIÓN READY  
**Última actualización:** 27 de Noviembre 2025  
**Versión:** 1.0
