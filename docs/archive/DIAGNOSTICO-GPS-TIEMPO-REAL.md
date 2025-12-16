# 🔍 Diagnóstico GPS - Sistema de Tracking en Tiempo Real

## Estado Actual
✅ **GPS del Chofer:** Funcionando - Capturando ubicación
✅ **Chrome Flags:** Configurado correctamente
⚠️ **Envío a Base de Datos:** En verificación
⚠️ **Visualización en Coordinador:** Pendiente de verificar

---

## 📱 Verificación en el Celular (Chofer)

### 1. Revisar Console del Navegador

En el celular, abre DevTools (si es posible):
- Chrome Android: `chrome://inspect` desde PC
- O usar Remote Debugging

**Logs esperados:**
```javascript
✅ Ubicación enviada correctamente: { id: "...", timestamp: "...", viaje_id: "..." }
📍 Enviando ubicación: { viaje_id: "...", lat: -31.42..., lng: -62.10..., velocidad: 10.7 }
```

**Si ves errores:**
```javascript
❌ Error enviando ubicación: Error al guardar ubicación
❌ 401 No autenticado
❌ 403 No autorizado
❌ 404 Viaje no encontrado
```

### 2. Verificar Estado en la App

**En la pantalla del chofer debe mostrar:**
- ✅ Latitud: -31.423954
- ✅ Longitud: -62.100277
- ✅ Velocidad: 10.7 km/h
- ✅ Precisión: 14 m
- ✅ Última actualización: [timestamp]
- ✅ Batería: 17%
- 🔴 **Ubicaciones enviadas: 0** ← Este debe aumentar

**Cada 30 segundos debe incrementar el contador.**

---

## 💻 Verificación en la Base de Datos

### Consulta SQL para verificar ubicaciones:

```sql
-- Ver últimas ubicaciones registradas (cualquier chofer)
SELECT 
  u.id,
  u.viaje_id,
  u.chofer_id,
  u.latitude,
  u.longitude,
  u.velocidad,
  u.timestamp,
  v.numero_viaje,
  c.nombre as chofer_nombre
FROM ubicaciones_choferes u
LEFT JOIN viajes_despacho v ON v.id = u.viaje_id
LEFT JOIN choferes c ON c.id = u.chofer_id
ORDER BY u.timestamp DESC
LIMIT 10;
```

**Si la tabla está vacía:**
- El problema está en el envío desde el celular
- Revisar logs del servidor (terminal donde corre `pnpm dev`)

**Si hay datos pero son viejos:**
- El tracking se detuvo
- Verificar que el celular no entró en modo ahorro de energía

---

## 🖥️ Verificación en el Coordinador

### 1. Logs del Servidor (Terminal)

**En tu terminal de desarrollo deberías ver:**
```
POST /api/gps/registrar-ubicacion 200 in 45ms
📍 Procesando GPS - Viaje: 1, Estado: confirmado_chofer, Chofer: abc...
✅ GPS registrado - Viaje: abc-123, Lat: -31.42, Lng: -62.10, Vel: 10.7 km/h
```

**Si no ves estos logs:**
- El celular no está enviando (verificar paso 1)
- Hay un error de autenticación

### 2. Pantalla de Viajes Activos

**Ir a:** `localhost:3000/transporte/viajes-activos`

1. **Verificar que aparece el viaje:**
   - Debe aparecer en la lista "Viajes Activos (2)"
   - Con patente: ABC123
   - Con chofer: Walter Zayas

2. **Seleccionar el viaje (checkbox)**

3. **Ver el mapa:**
   - Debe aparecer un marcador de camión
   - En las coordenadas enviadas por el chofer
   - Color según estado (azul=asignado, verde=confirmado, etc.)

4. **Click en "Detalle":**
   - Ver timeline de estados
   - Ver información del viaje

---

## 🔧 Soluciones a Problemas Comunes

### Problema 1: "Ubicaciones enviadas: 0"

**Causas posibles:**
1. Error de autenticación (401)
2. Viaje no encontrado (404)
3. Chofer no autorizado (403)
4. Error de red

**Solución:**
```javascript
// En el celular, abrir Console y ejecutar:
fetch('/api/gps/registrar-ubicacion', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    viaje_id: 'ID_DEL_VIAJE',
    latitude: -31.423954,
    longitude: -62.100277,
    accuracy: 14,
    velocidad: 10.7
  })
}).then(r => r.json()).then(console.log).catch(console.error);
```

### Problema 2: No aparece en el mapa del coordinador

**Verificar:**
1. El viaje está seleccionado (checkbox marcado)
2. El viaje tiene ubicación reciente (últimos 5 minutos)
3. La consulta SQL trae datos

**Query de diagnóstico:**
```sql
-- Ver viajes con ubicaciones GPS
SELECT 
  v.id,
  v.numero_viaje,
  v.estado,
  COUNT(u.id) as ubicaciones_registradas,
  MAX(u.timestamp) as ultima_ubicacion
FROM viajes_despacho v
LEFT JOIN ubicaciones_choferes u ON u.viaje_id = v.id
WHERE v.id_chofer IS NOT NULL
GROUP BY v.id, v.numero_viaje, v.estado
ORDER BY ultima_ubicacion DESC;
```

### Problema 3: El mapa no carga

**Verificar en Console del navegador:**
```
❌ Leaflet is not defined
❌ Failed to load resource: OpenStreetMap tiles
```

**Solución:**
- Refrescar la página (F5)
- Verificar conexión a internet
- Verificar que `react-leaflet` está instalado

---

## ✅ Checklist de Verificación Completa

### En el Celular (Chofer):
- [ ] GPS activado en el dispositivo
- [ ] Chrome con flags configurado
- [ ] Ubicación actual capturada
- [ ] Velocidad detectada
- [ ] Contador "Ubicaciones enviadas" > 0
- [ ] No hay mensajes de error

### En el Servidor:
- [ ] `pnpm dev` corriendo
- [ ] Logs de POST /api/gps/registrar-ubicacion
- [ ] Status 200 en las respuestas
- [ ] Sin errores 401/403/404

### En la Base de Datos:
- [ ] Tabla `ubicaciones_choferes` tiene registros nuevos
- [ ] Timestamp reciente (últimos minutos)
- [ ] Coordenadas correctas (-31.42..., -62.10...)
- [ ] Velocidad registrada

### En el Coordinador:
- [ ] Login correcto (gonzalo@logisticaexpres.com)
- [ ] Viaje aparece en lista
- [ ] Checkbox marcado
- [ ] Mapa muestra marcador de camión
- [ ] Coordenadas coinciden con el celular

---

## 📊 Monitoreo en Tiempo Real

### Script para monitorear desde SQL:

```sql
-- Ejecutar cada 10 segundos para ver actualizaciones
SELECT 
  TO_CHAR(timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires', 'HH24:MI:SS') as hora,
  viaje_id,
  ROUND(latitude::numeric, 6) as lat,
  ROUND(longitude::numeric, 6) as lng,
  ROUND(velocidad::numeric, 1) as "vel_kmh",
  bateria as "bat_%"
FROM ubicaciones_choferes
WHERE timestamp > NOW() - INTERVAL '5 minutes'
ORDER BY timestamp DESC
LIMIT 5;
```

### Resultado esperado:
```
 hora     | viaje_id | lat        | lng         | vel_kmh | bat_%
----------|----------|------------|-------------|---------|------
 12:15:30 | abc-123  | -31.423954 | -62.100277  | 10.7    | 17
 12:15:00 | abc-123  | -31.423801 | -62.100150  | 12.3    | 17
 12:14:30 | abc-123  | -31.423654 | -62.100025  | 11.8    | 18
```

---

## 🎯 Próximos Pasos

1. **Verificar contador de envíos en el celular** - Debe aumentar cada 30s
2. **Revisar logs del servidor** - Ver si llegan los POST requests
3. **Consultar base de datos** - Verificar que se guarden los registros
4. **Refrescar mapa del coordinador** - Ver si aparece el marcador

Si después de esto no funciona, compartir:
- Screenshot de la consola del celular
- Logs del servidor (terminal)
- Resultado de la query SQL
