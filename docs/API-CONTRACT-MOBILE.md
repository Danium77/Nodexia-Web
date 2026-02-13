# API Contract — Nodexia Mobile (Android / iOS)

> Versión: 1.0 | Fecha: Feb 2026  
> Base URL: `https://<domain>/api`

---

## Autenticación

Todas las requests requieren el header:

```
Authorization: Bearer <supabase_access_token>
```

El token se obtiene con `supabase.auth.signInWithPassword()`.
El `user_id` del chofer se extrae del JWT.

---

## 1. Viajes del Chofer

### `GET /api/chofer/viajes`

Lista los viajes asignados al chofer autenticado.

**Response 200:**
```json
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
      "camion": {
        "patente": "AB123CD",
        "marca": "Scania",
        "modelo": "R500"
      },
      "acoplado": {
        "patente": "EF456GH"
      },
      "producto": "Soja",
      "peso_estimado": 28000,
      "parada_actual": 1,
      "paradas": [
        {
          "orden": 1,
          "tipo": "origen",
          "nombre": "Planta Santa Fe",
          "direccion": "Ruta 11 km 405",
          "estado_parada": "pendiente",
          "tiene_nodexia": true
        },
        {
          "orden": 2,
          "tipo": "destino",
          "nombre": "Cliente Rosario",
          "direccion": "Av. Pellegrini 2500",
          "estado_parada": "pendiente",
          "tiene_nodexia": false
        }
      ]
    }
  ]
}
```

---

## 2. Actualizar Estado del Viaje

### `POST /api/viajes/actualizar-estado`

Cambia el estado del viaje. Valida transiciones automáticamente.

**Request Body:**
```json
{
  "viaje_id": "uuid",
  "nuevo_estado": "en_transito_origen",
  "user_id": "uuid"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Estado actualizado: confirmado_chofer → en_transito_origen"
}
```

**Response 400 (transición inválida):**
```json
{
  "error": "Transición inválida: pendiente → cargando",
  "estado_anterior": "pendiente",
  "estado_nuevo": "cargando"
}
```

**Response 403:**
```json
{
  "error": "No autorizado para este viaje"
}
```

---

## 3. Registrar Ubicación GPS

### `POST /api/gps/registrar-ubicacion`

Envía la ubicación actual del chofer.

**Request Body:**
```json
{
  "viaje_id": "uuid",
  "latitud": -32.9468,
  "longitud": -60.6393,
  "velocidad_kmh": 80,
  "precision_metros": 10,
  "rumbo_grados": 180
}
```

**Response 200:**
```json
{
  "success": true
}
```

---

## 4. Estados del Sistema

### Flujo de estados (17 + cancelado)

```
pendiente
  → transporte_asignado
    → camion_asignado
      → confirmado_chofer        ← CHOFER confirma
        → en_transito_origen     ← CHOFER inicia viaje
          → ingresado_origen     ← CONTROL ACCESO
            → llamado_carga      ← SUPERVISOR
              → cargando         ← SUPERVISOR
                → cargado        ← SUPERVISOR
                  → egreso_origen    ← CONTROL ACCESO
                    → en_transito_destino  ← auto
                      → ingresado_destino  ← CONTROL ACCESO
                        → llamado_descarga ← SUPERVISOR
                          → descargando    ← SUPERVISOR
                            → descargado   ← SUPERVISOR
                              → egreso_destino  ← CONTROL ACCESO
                                → completado     ← auto
```

Cualquier estado puede ir a `cancelado`.

### Estados que el CHOFER puede cambiar

| Estado actual        | Próximo estado (chofer)  |
|---------------------|--------------------------|
| camion_asignado     | confirmado_chofer         |
| confirmado_chofer   | en_transito_origen        |
| egreso_origen       | en_transito_destino       |

### Tabs calculados (no almacenados)

| Tab          | Condición                                                |
|-------------|----------------------------------------------------------|
| Pendientes  | estado = pendiente                                        |
| Asignados   | estado ∈ {transporte_asignado, camion_asignado, confirmado_chofer} |
| En Proceso  | estado entre en_transito_origen y egreso_destino          |
| Completados | estado = completado                                       |
| Demorado    | dentro de ventana tolerancia (2h)                         |
| Expirado    | fuera de ventana tolerancia (>2h)                         |

---

## 5. Multi-destino (Paradas)

Un viaje puede tener hasta 4 paradas (1 origen + 3 destinos).

### Estructura de parada

```json
{
  "id": "uuid",
  "viaje_id": "uuid",
  "orden": 1,
  "tipo": "origen",
  "planta_id": "uuid",
  "nombre_referencia": "Planta Santa Fe",
  "direccion_completa": "Ruta 11 km 405, Santa Fe",
  "latitud": -31.6107,
  "longitud": -60.6973,
  "tiene_nodexia": true,
  "estado_parada": "pendiente",
  "hora_llegada": null,
  "hora_salida": null
}
```

### Estados de parada

`pendiente` → `en_camino` → `arribado` → `en_proceso` → `completada`

### Flujo destino SIN Nodexia

Cuando `tiene_nodexia = false`, el flujo se acorta:

```
ingresado_destino → descargado  (sin llamado_descarga/descargando)
```

La app debe mostrar un botón "Confirmar descarga" directo.

---

## 6. Notificaciones

### `GET /api/notificaciones?user_id=uuid`

Obtiene notificaciones pendientes.

### `POST /api/notificaciones/marcar-leida`

```json
{
  "notificacion_id": "uuid"
}
```

### Tipos de notificación

| Tipo                  | Cuándo se envía                     |
|-----------------------|-------------------------------------|
| viaje_asignado        | Se asigna camión al viaje           |
| llamado_carga         | Supervisor llama a carga            |
| ingreso_confirmado    | Control acceso confirma ingreso     |
| egreso_confirmado     | Control acceso confirma egreso      |
| viaje_completado      | Viaje llega a estado completado     |
| viaje_cancelado       | Viaje cancelado                     |
| cambio_estado         | Cualquier otro cambio de estado     |

---

## 7. Tipos TypeScript compartidos

Para apps React Native o TypeScript-based, los tipos canónicos están en:

```
lib/estados/config.ts  → EstadoViaje (enum), EstadoViajeType, TRANSICIONES_VALIDAS
lib/types.ts           → ViajeDespacho, Despacho, Chofer, Empresa, etc.
types/ubicaciones.ts   → Ubicacion, UbicacionAutocomplete
```

### Tipo principal: ViajeDespacho

```typescript
interface ViajeDespacho {
  id: string;
  despacho_id: string;
  numero_viaje: number;
  transport_id?: string;
  camion_id?: string;
  acoplado_id?: string;
  chofer_id?: string;
  estado: EstadoViajeType;    // Un solo estado
  parada_actual?: number;     // Multi-destino
  producto?: string;
  peso_estimado?: number;
  peso_real?: number;
  remito_numero?: string;
  observaciones?: string;
  fecha_creacion: string;
  // ... timestamps de tracking
}
```

### Enum EstadoViaje

```typescript
enum EstadoViaje {
  PENDIENTE = 'pendiente',
  TRANSPORTE_ASIGNADO = 'transporte_asignado',
  CAMION_ASIGNADO = 'camion_asignado',
  CONFIRMADO_CHOFER = 'confirmado_chofer',
  EN_TRANSITO_ORIGEN = 'en_transito_origen',
  INGRESADO_ORIGEN = 'ingresado_origen',
  LLAMADO_CARGA = 'llamado_carga',
  CARGANDO = 'cargando',
  CARGADO = 'cargado',
  EGRESO_ORIGEN = 'egreso_origen',
  EN_TRANSITO_DESTINO = 'en_transito_destino',
  INGRESADO_DESTINO = 'ingresado_destino',
  LLAMADO_DESCARGA = 'llamado_descarga',
  DESCARGANDO = 'descargando',
  DESCARGADO = 'descargado',
  EGRESO_DESTINO = 'egreso_destino',
  COMPLETADO = 'completado',
  CANCELADO = 'cancelado',
}
```

---

## 8. Errores estándar

| HTTP | Significado                    |
|------|-------------------------------|
| 400  | Parámetros inválidos / transición inválida |
| 403  | No autorizado                 |
| 404  | Recurso no encontrado         |
| 405  | Método HTTP no permitido      |
| 500  | Error interno del servidor    |

Todas las respuestas de error siguen:

```json
{
  "error": "Descripción del error",
  "details": "Contexto adicional (opcional)"
}
```
