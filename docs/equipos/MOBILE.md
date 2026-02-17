# GUÍA DEL EQUIPO MOBILE (Android / iOS)

**Proyecto:** Nodexia Mobile  
**Backend:** Next.js API Routes (REST) + Supabase Auth  
**Contrato API:** `docs/API-CONTRACT-MOBILE.md`  
**Última actualización:** 17-Feb-2026

---

## 1. VISIÓN GENERAL

La app móvil nativa reemplazará la PWA actual (`chofer-mobile.tsx`) con una experiencia nativa para choferes.

### Funcionalidades del chofer
- Ver viajes asignados
- Confirmar / iniciar / completar viajes
- Enviar GPS en tiempo real (background)
- Subir remitos (foto)
- Reportar incidencias
- Ver notificaciones push
- Generar código QR para control de acceso
- Navegación GPS a origen/destino (integración Maps)

### Referencia actual (PWA)
La PWA en `pages/chofer-mobile.tsx` (1,976 líneas) es la implementación de referencia.  
Todo lo que hace la PWA, la app nativa debe replicar.

---

## 2. AUTENTICACIÓN

### Login

```
POST https://[SUPABASE_URL]/auth/v1/token?grant_type=password

Body:
{
  "email": "chofer@example.com",
  "password": "password123"
}

Response:
{
  "access_token": "eyJ...",      ← Usar en todas las requests
  "refresh_token": "xxxxx",      ← Guardar para renovar
  "expires_in": 3600,
  "user": { "id": "uuid", "email": "..." }
}
```

### Usar token en cada request

```
Authorization: Bearer <access_token>
```

### Refresh token

```
POST https://[SUPABASE_URL]/auth/v1/token?grant_type=refresh_token

Body:
{
  "refresh_token": "xxxxx"
}
```

### Logout

```
POST https://[SUPABASE_URL]/auth/v1/logout

Headers:
Authorization: Bearer <access_token>
```

### SDKs disponibles

| Plataforma | SDK |
|-----------|-----|
| Android | `io.github.jan-tennert.supabase:gotrue-kt` (Kotlin) |
| iOS | `supabase-swift` (Swift Package Manager) |
| Cross-platform | `supabase_flutter` (Flutter/Dart) |

---

## 3. ENDPOINTS API DEL CHOFER

**Base URL:** `https://www.nodexiaweb.com/api`

### 3.1 Listar viajes

```
GET /api/chofer/viajes

Response 200:
{
  "viajes": [
    {
      "id": "uuid",
      "numero_viaje": 1,
      "estado": "confirmado_chofer",
      "despacho_id": "uuid",
      "origen": "Planta Santa Fe",
      "destino": "Cliente Rosario",
      "fecha_programada": "2026-02-15T08:00:00Z",
      "camion": { "patente": "AB123CD", "marca": "Scania" },
      "acoplado": { "patente": "EF456GH" },
      "producto": "Soja",
      "peso_estimado": 28000,
      "parada_actual": 1,
      "paradas": [
        { "orden": 1, "destino": "Cliente A", "estado": "pendiente" }
      ]
    }
  ]
}
```

### 3.2 Cambiar estado del viaje

```
POST /api/viajes/[id]/estado-unidad

Body:
{
  "estado": "confirmado_chofer"
}

Response 200:
{
  "success": true,
  "viaje": { ... },
  "estado_anterior": "camion_asignado",
  "estado_nuevo": "confirmado_chofer"
}
```

### 3.3 Enviar posición GPS

```
POST /api/tracking/actualizar-ubicacion

Body:
{
  "viaje_id": "uuid",
  "latitud": -31.6333,
  "longitud": -60.7000,
  "accuracy": 10.5,
  "speed": 80.2,
  "heading": 180,
  "battery_level": 85
}

Response 200:
{
  "success": true,
  "estado_detectado": null          ← o "ingresado_origen" si auto-arrival
}
```

**⚠️ Auto-arrival:** Si el chofer está a < 500m del origen o destino, el servidor puede auto-detectar la llegada y cambiar el estado. Revisar `estado_detectado` en la respuesta.

### 3.4 Subir remito (foto)

```
POST /api/upload-remito

Content-Type: multipart/form-data

Form fields:
- file: <imagen JPG/PNG, máx 10MB>
- viaje_id: "uuid"

Response 200:
{
  "success": true,
  "url": "https://xxx.supabase.co/storage/v1/object/public/remitos/..."
}
```

### 3.5 Reportar incidencia

```
POST /api/control-acceso/crear-incidencia

Body:
{
  "viaje_id": "uuid",
  "tipo_incidencia": "problema_mecanico",
  "descripcion": "Pinchadura en ruta"
}

Tipos válidos: demora | problema_mecanico | problema_carga | ruta_bloqueada | otro
```

**Nota:** Solo `problema_mecanico` pausa el viaje. Los demás son informativos.

### 3.6 Notificaciones

```
GET /api/notificaciones
→ Lista notificaciones del usuario

POST /api/notificaciones/marcar-leida
Body: { "ids": ["uuid1", "uuid2"] }
→ Marca como leídas
```

### 3.7 Documentos del chofer

```
GET /api/documentacion/entidades?tipo=chofer&entidad_id={chofer_id}
→ Lista documentos del chofer

POST /api/documentacion/subir
Content-Type: multipart/form-data
→ Subir documento (licencia, seguro, etc.)
```

---

## 4. MÁQUINA DE ESTADOS

### Los 17 estados + cancelado

```
pendiente → transporte_asignado → camion_asignado → confirmado_chofer
→ en_transito_origen → ingresado_origen → llamado_carga → cargando → cargado
→ egreso_origen → en_transito_destino → ingresado_destino
→ llamado_descarga → descargando → descargado → egreso_destino → completado
```

### Estados que EL CHOFER cambia (solo 3 transiciones)

| Acción del chofer | De → A |
|-------------------|--------|
| Confirmar viaje | `camion_asignado` → `confirmado_chofer` |
| Iniciar viaje | `confirmado_chofer` → `en_transito_origen` |
| Iniciar tránsito destino | `egreso_origen` → `en_transito_destino` |

### Estados cambiados por OTROS roles

| Rol | Estados que cambia |
|-----|--------------------|
| Coordinador | `pendiente`, `transporte_asignado`, `camion_asignado` |
| Control de Acceso | `ingresado_origen`, `egreso_origen`, `ingresado_destino`, `egreso_destino` |
| Supervisor de Carga | `llamado_carga`, `cargando`, `cargado`, `llamado_descarga`, `descargando`, `descargado` |
| Sistema | `completado` (automático cuando todos los viajes terminan) |

### Self-delivery (destinos no-Nodexia)

Si el destino no tiene control de acceso Nodexia, el chofer puede:
1. Subir foto del remito
2. Presionar "Completar Entrega"
3. El sistema auto-encadena: `en_transito_destino` → `ingresado_destino` → `descargado` → `egreso_destino` → `completado`

---

## 5. GPS TRACKING

### Configuración recomendada

| Parámetro | Valor |
|-----------|-------|
| Intervalo de envío | **30 segundos** |
| Precisión | `enableHighAccuracy: true` |
| Incluir en payload | lat, lng, accuracy, speed, heading, battery_level |
| Background tracking | SÍ — mantener activo con el viaje en curso |

### Cuándo trackear

- **INICIAR** tracking cuando el estado pasa a `en_transito_origen`
- **PAUSAR** tracking cuando el estado es `ingresado_*` o `cargando/descargando` (en planta)
- **REANUDAR** cuando vuelve a `en_transito_destino`
- **DETENER** cuando llega a `completado` o `cancelado`

### Auto-arrival

El endpoint `/api/tracking/actualizar-ubicacion` calcula distancia al origen/destino. Si está a menos de **500 metros**, responde con `estado_detectado` indicando el nuevo estado. La app debe mostrar una notificación al chofer.

---

## 6. NOTIFICACIONES PUSH

### Firebase Cloud Messaging (FCM)

La web ya usa Firebase para push notifications. La app nativa debe:

1. Registrar el FCM token del dispositivo
2. Enviar el token al backend (guardar en `usuarios_empresa` o tabla dedicada)
3. Recibir y mostrar notificaciones

### Tipos de notificación

| Tipo | Cuándo |
|------|--------|
| `viaje_asignado` | Se asigna un viaje al chofer |
| `llamado_carga` | Supervisor llama a cargar |
| `ingreso_confirmado` | CA confirma ingreso |
| `egreso_confirmado` | CA confirma egreso |
| `viaje_completado` | Viaje llega a completado |
| `viaje_cancelado` | Viaje cancelado |
| `cambio_estado` | Cualquier otro cambio de estado |

### Payload ejemplo

```json
{
  "notification": {
    "title": "Viaje Asignado",
    "body": "Despacho DSP-20260217-001 — Soja 28t"
  },
  "data": {
    "tipo": "viaje_asignado",
    "viaje_id": "uuid",
    "despacho_id": "uuid"
  }
}
```

---

## 7. CÓDIGO QR

El chofer genera un QR que el control de acceso escanea al ingresar/egresar de planta.

### Contenido del QR

```json
{
  "viaje_id": "uuid",
  "chofer_id": "uuid",
  "patente": "AB123CD",
  "numero_viaje": 1
}
```

La app debe generar este QR en pantalla cuando el viaje está en estados `en_transito_origen` o `en_transito_destino`.

### Librerías recomendadas

| Plataforma | Librería |
|-----------|----------|
| Android | `com.google.zxing:core` + `journeyapps:zxing-android-embedded` |
| iOS | `CoreImage` (nativo) o `EFQRCode` |
| Flutter | `qr_flutter` |

---

## 8. OFFLINE SUPPORT

### Estrategia recomendada

1. **Cache viajes activos** en storage local al hacer GET
2. **Queue GPS updates** cuando sin conexión → enviar al reconectar
3. **Queue cambios de estado** (confirmar, iniciar) → enviar al reconectar
4. **Mostrar banner** "Sin conexión" en la UI
5. **Detectar reconexión** → sync automático

### Prioridad de sync al reconectar

1. GPS positions (batch upload)
2. Estado changes (en orden cronológico)
3. Incidencias pendientes
4. Remitos pendientes

---

## 9. NAVEGACIÓN GPS

### Integración con Maps

La app debe ofrecer botones para navegar al origen y destino:

```
// Android
Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=${lat},${lng}"))

// iOS
MKMapItem(placemark).openInMaps(launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving])
```

### Fallback (sin coordenadas)

Si el origen/destino no tiene lat/lng, usar la dirección como texto de búsqueda:

```
// Android
Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=${direccion}"))

// iOS
"maps://?daddr=${direccion}"
```

---

## 10. UI/UX REFERENCIA

### Tabs principales

| Tab | Contenido |
|-----|-----------|
| **Viajes** | Lista de viajes activos con estado, acciones contextuales |
| **Incidencias** | Historial + botón reportar |
| **Perfil** | Datos del chofer, documentos, QR, logout |

### Colores por estado (dark theme)

| Estado | Color |
|--------|-------|
| pendiente | `gray-500` |
| transporte_asignado | `blue-400` |
| camion_asignado | `blue-500` |
| confirmado_chofer | `cyan-500` |
| en_transito_* | `yellow-500` (animado/pulsante) |
| ingresado_* | `green-400` |
| cargando/descargando | `orange-500` |
| cargado/descargado | `green-500` |
| egreso_* | `teal-500` |
| completado | `green-600` |
| cancelado | `red-500` |

### Theme

- Fondo principal: `#0f172a` (gray-900)
- Fondo tarjetas: `#1e293b` (gray-800)
- Texto principal: blanco
- Texto secundario: `#9ca3af` (gray-400)
- Acento primario: `#0891b2` (cyan-600)

---

## 11. TESTING

### Entorno de pruebas

| Variable | Valor |
|----------|-------|
| Base URL | `https://www.nodexiaweb.com/api` (PROD) |
| Supabase URL | Solicitar al equipo |
| Test user | Solicitar credenciales al PO |

### Flujo de test E2E

1. Login como chofer
2. GET viajes → verificar lista
3. POST confirmar viaje
4. POST iniciar viaje (en_transito_origen)
5. POST GPS cada 30s
6. Esperar que CA registre ingreso (estado cambia a ingresado_origen)
7. Esperar carga completa (cargado → egreso_origen)
8. POST iniciar tránsito destino
9. POST GPS hasta llegar
10. Self-delivery: subir remito + completar entrega

---

## 12. ERRORES COMUNES

### Respuestas de error estándar

```json
{ "error": "No autorizado" }              // 401
{ "error": "No tiene permisos" }           // 403
{ "error": "Viaje no encontrado" }         // 404
{ "error": "Transición no válida" }        // 400
{ "error": "Error al procesar" }           // 500
```

### Transición no válida (400)

```json
{
  "error": "Transición no válida",
  "estado_actual": "pendiente",
  "estado_solicitado": "en_transito_origen",
  "transiciones_validas": ["transporte_asignado"]
}
```

La app debe mostrar al chofer qué acciones tiene disponibles según el estado actual.

---

## 13. HOJA DE RUTA

### Fase 1 — MVP Nativo
- [ ] Login/logout con Supabase Auth
- [ ] Lista de viajes
- [ ] Confirmar/iniciar/completar viaje
- [ ] GPS tracking en background
- [ ] QR code display
- [ ] Push notifications (FCM)

### Fase 2 — Completo
- [ ] Upload de remito (cámara)
- [ ] Incidencias
- [ ] Documentos del chofer (ver + subir)
- [ ] Offline support con queue
- [ ] Navegación GPS integrada

### Fase 3 — Mejoras
- [ ] Dashboard con stats del chofer
- [ ] Historial de viajes completados
- [ ] Multi-idioma
- [ ] Biometric login
