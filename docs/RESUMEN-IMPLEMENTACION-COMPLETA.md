# 📦 SISTEMA DE ESTADOS DUALES - IMPLEMENTACIÓN COMPLETA

**Fecha**: 22 Noviembre 2025  
**Estado**: ✅ Código Completo - Pendiente Migración SQL  
**Documentos**: 10 archivos creados  
**APIs**: 4 endpoints nuevos  
**Componentes**: 1 hook + 1 página actualizada

---

## 🎯 RESUMEN EJECUTIVO

Se ha diseñado e implementado un **sistema de estados duales** (UNIDAD + CARGA) que permite gestionar el flujo operativo completo de transporte en Nodexia, desde la planificación hasta la entrega, con múltiples actores colaborando en el mismo viaje.

### Concepto Clave: **Estados Cruzados**

A diferencia de un sistema donde cada actor tiene su propio viaje, aquí **múltiples actores actualizan diferentes aspectos del MISMO viaje**:

- **Coordinadores**: Planifican y asignan
- **Chofer**: Confirma, se desplaza, reporta arribos
- **Supervisor de Carga**: Gestiona proceso de carga
- **Control de Acceso**: Valida documentación, registra ingresos/egresos
- **Cliente/Receptor**: Valida descarga

Cada actor solo puede actualizar los estados de su autoridad. Ejemplo: **El chofer NO puede marcar "cargando"** - solo el Supervisor de Carga tiene autoridad sobre ese estado.

---

## 📊 ARQUITECTURA DE ESTADOS

### Estado UNIDAD (Logística - Chofer + Camión)

16 estados que rastrean la posición física y movimiento:

```
pendiente → asignado → confirmado_chofer → 
en_transito_origen → arribo_origen → ingreso_planta → 
en_playa_espera → en_proceso_carga → cargado →egreso_planta→  
en_transito_destino → arribo_destino → ingreso_destino → 
llamado a descarga →en_descarga → vacio → egreso_destino → disponible para carga
                     ↓
                 cancelado
```

### Estado CARGA (Operaciones - Producto + Docs)

14 estados que rastrean el producto y documentación:

```
pendiente → planificado → 
llamado_carga → posicionado_carga → iniciando_carga → 
cargando → carga_completada → documentacion_validada → 
en_transito → arribado_destino → iniciando_descarga → 
descargando → descargado → entregado
                     ↓
                 cancelado
```

---

## 🗂️ ESTRUCTURA DE ARCHIVOS CREADOS

### 📄 Documentación (6 archivos)

1. **`docs/FLUJO-ESTADOS-OPERACIONES.md`** (~400 líneas)
   - Diseño completo del sistema
   - Definiciones de estados
   - Timeline de ejemplo
   - Queries de KPIs

2. **`docs/PLAN-IMPLEMENTACION-ESTADOS.md`** (~350 líneas)
   - Roadmap de 10 fases
   - Especificaciones de APIs
   - Componentes UI a crear
   - Estrategia de testing

3. **`docs/ANALISIS-UX-FLUJO-ESTADOS.md`** (~300 líneas)
   - Análisis por rol
   - Confirma que sistema NO es engorroso
   - Progressive disclosure
   - State consolidation strategies

4. **`docs/MATRIZ-AUTORIDAD-ESTADOS.md`** (~450 líneas)
   - Matriz completa: quién actualiza qué
   - Ejemplos de código con validación
   - Timeline de cross-actor updates
   - UI mockups por rol

5. **`docs/DIAGRAMA-FLUJO-ESTADOS-CRUZADOS.md`** (~400 líneas)
   - Diagrama ASCII hora por hora
   - Ejemplos de intentos no autorizados
   - Analogía hospitalaria
   - Visual reference completo

6. **`docs/INSTRUCCIONES-MIGRACION-SQL.md`** (~500 líneas)
   - Paso a paso para ejecutar migración
   - Scripts de verificación
   - Tests post-migración
   - Procedimiento de rollback

**Total documentación**: ~2,400 líneas

---

### 🗄️ Migración SQL (3 archivos)

1. **`sql/000_verificar_prerequisitos.sql`** (~50 líneas)
   - Verifica tablas existentes
   - Cuenta registros
   - Safe to run pre-migration

2. **`sql/migrations/011_sistema_estados_duales.sql`** (~600 líneas)
   ```sql
   -- Crea 4 tablas:
   CREATE TABLE estado_unidad_viaje (...)  -- 16 estados
   CREATE TABLE estado_carga_viaje (...)   -- 14 estados
   CREATE TABLE historial_ubicaciones (...) -- GPS history
   CREATE TABLE notificaciones (...)       -- Push + in-app
   
   -- Añade campo:
   ALTER TABLE choferes ADD COLUMN user_id UUID
   
   -- Crea vista unificada:
   CREATE VIEW vista_estado_viaje_completo
   
   -- Migra datos existentes
   -- Implementa RLS policies
   ```

3. **`sql/funciones_estados.sql`** (~500 líneas)
   ```sql
   -- 8 funciones auxiliares:
   obtener_proximos_estados_unidad()      -- Transiciones válidas
   obtener_proximos_estados_carga()       -- Transiciones válidas
   validar_transicion_estado_unidad()     -- Con validación de rol
   actualizar_estado_unidad()             -- Update con logs
   actualizar_estado_carga()              -- Con authority checks
   registrar_ubicacion_gps()              -- GPS tracking
   detectar_demoras_viajes()              -- Automatic delay detection
   calcular_kpis_viaje()                  -- Performance metrics
   ```

**Total SQL**: ~1,150 líneas

---

### ⚙️ Backend APIs (4 endpoints)

1. **`pages/api/viajes/[id]/estado-unidad.ts`**
   ```typescript
   POST /api/viajes/:id/estado-unidad
   Body: { nuevo_estado, user_id, observaciones }
   
   - Valida permisos según rol
   - Llama a actualizar_estado_unidad()
   - Retorna próximos estados válidos
   ```

2. **`pages/api/viajes/[id]/estado-carga.ts`**
   ```typescript
   POST /api/viajes/:id/estado-carga
   Body: { nuevo_estado, user_id, peso_real, remito_numero }
   
   - Valida autoridad por rol
   - Llama a actualizar_estado_carga()
   - Retorna próximos estados válidos
   ```

3. **`pages/api/viajes/[id]/gps.ts`**
   ```typescript
   POST /api/viajes/:id/gps
   Body: { latitud, longitud, velocidad_kmh, user_id }
   
   - Obtiene chofer_id desde user_id
   - Registra posición GPS
   - Valida que sea chofer
   ```

4. **`pages/api/viajes/[id]/estados.ts`**
   ```typescript
   GET /api/viajes/:id/estados
   
   - Retorna estado_unidad + estado_carga
   - Incluye ubicación GPS actual
   - Timestamps completos
   - Próximos estados válidos
   - KPIs calculados
   ```

**Total APIs**: ~400 líneas

---

### 🎨 Frontend (2 archivos)

1. **`lib/hooks/useGPSTracking.ts`** (~200 líneas)
   ```typescript
   useGPSTracking({
     viajeId,
     userId,
     enabled,  // Solo cuando en tránsito
     intervalMs: 30000  // 30 seg
   })
   
   - Tracking automático con Geolocation API
   - Envío cada 30 segundos
   - Manejo de errores (permissions, timeout)
   - Cleanup al desmontar
   ```

2. **`pages/chofer/viajes.tsx`** (actualizado ~600 líneas)
   ```typescript
   // Cambios principales:
   - Usa estado_unidad_viaje + estado_carga_viaje
   - Integra useGPSTracking hook
   - Indicador GPS en header (verde/rojo)
   - Acciones filtradas por autoridad del chofer
   - Mensajes contextuales por estado
   - Labels amigables para cada estado
   ```

**Total Frontend**: ~800 líneas

---

### 📦 TypeScript Types (actualizado)

**`lib/types.ts`** - Añadido:

```typescript
// Estados UNIDAD (16 valores)
export type EstadoUnidadViaje = 
  | 'pendiente'
  | 'asignado'
  | 'confirmado_chofer'
  | 'en_transito_origen'
  // ... 12 más

// Estados CARGA (14 valores)
export type EstadoCargaViaje =
  | 'pendiente'
  | 'documentacion_preparada'
  | 'llamado_carga'
  // ... 11 más

// Interfaces
interface EstadoUnidadViaje { ... }
interface EstadoCargaViaje { ... }
interface HistorialUbicacion { ... }
interface Notificacion { ... }
interface VistaEstadoViajeCompleto { ... }

// Chofer con user_id
interface Chofer {
  // ... campos existentes
  user_id?: string;  // 🆕 Para login
}
```

**Total types**: ~200 líneas nuevas

---

## 🔐 SEGURIDAD Y VALIDACIÓN

### Row Level Security (RLS)

Cada tabla tiene políticas RLS que limitan acceso según rol:

```sql
-- Ejemplo: Solo el chofer asignado puede ver su estado
CREATE POLICY "choferes_ven_sus_estados" ON estado_unidad_viaje
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM viajes_despacho v
    JOIN choferes c ON v.chofer_id = c.id
    WHERE v.id = viaje_id AND c.user_id = auth.uid()
  )
);
```

### Validación de Autoridad

Las funciones SQL validan que el usuario tenga autoridad:

```sql
-- Ejemplo de validación en actualizar_estado_unidad()
IF p_nuevo_estado IN ('llamado_carga', 'posicionado_carga', 'carga_completada') THEN
  IF v_rol_usuario != 'supervisor_carga' THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN as exitoso,
      'Solo supervisor de carga puede actualizar este estado'::TEXT as mensaje;
    RETURN;
  END IF;
END IF;
```

### Frontend Filtrado

Las UIs solo muestran acciones autorizadas:

```typescript
const getProximasAcciones = (estadoUnidad: string) => {
  // Retorna SOLO acciones que el chofer puede ejecutar
  const accionesPorEstado: Record<string, Array<{...}>> = {
    'asignado': [
      { label: '✅ Confirmar viaje', valor: 'confirmado_chofer' }
    ],
    // NO incluye 'cargando' - no es autorizado para chofer
  };
  return accionesPorEstado[estadoUnidad] || [];
};
```

---

## 📈 FLUJO OPERATIVO COMPLETO

### Ejemplo Real: Viaje de Acopio

**08:00** - Coordinador Planta
```typescript
// Crea despacho → API POST /api/despachos
estado_unidad: 'pendiente'
estado_carga: 'pendiente'
```

**09:00** - Coordinador Transporte
```typescript
// Asigna chofer + camión
actualizar_estado_unidad('asignado', ...)
actualizar_estado_carga('documentacion_preparada', ...)
```

**09:30** - Chofer (desde móvil)
```typescript
// Confirma viaje
actualizar_estado_unidad('confirmado_chofer', ...)
// Sale hacia origen
actualizar_estado_unidad('en_transito_origen', ...)
// 🛰️ GPS tracking se activa automáticamente
```

**11:00** - Chofer
```typescript
// Arriba a origen
actualizar_estado_unidad('arribo_origen', ...)
```

**11:15** - Control de Acceso Origen
```typescript
// Registra ingreso con QR
actualizar_estado_unidad('ingreso_planta', ...)
actualizar_estado_unidad('en_playa_espera', ...)
// Valida documentación
actualizar_estado_carga('llamado_carga', ...)
```

**11:30** - Supervisor de Carga
```typescript
// Llama a carga
actualizar_estado_carga('posicionado_carga', ...)
actualizar_estado_carga('iniciando_carga', ...)
actualizar_estado_unidad('en_proceso_carga', ...)
```

**13:00** - Supervisor de Carga
```typescript
// Carga completada
actualizar_estado_carga('carga_completada', {
  peso_real: 28500,
  remito_numero: 'REM-12345'
})
actualizar_estado_unidad('egreso_planta', ...)
```

**13:15** - Chofer
```typescript
// Sale hacia destino
actualizar_estado_unidad('en_transito_destino', ...)
// 🛰️ GPS tracking continúa
```

**16:00** - Chofer
```typescript
// Arriba a destino
actualizar_estado_unidad('arribo_destino', ...)
actualizar_estado_carga('arribado_destino', ...)
```

**16:15** - Control de Acceso Destino
```typescript
// Registra ingreso
actualizar_estado_unidad('ingreso_destino', ...)
actualizar_estado_carga('iniciando_descarga', ...)
actualizar_estado_unidad('en_descarga', ...)
```

**17:00** - Cliente/Receptor
```typescript
// Valida descarga
actualizar_estado_carga('descargando', ...)
actualizar_estado_carga('descargado', ...)
```

**17:15** - Control de Acceso Destino
```typescript
// Registra egreso
actualizar_estado_unidad('egreso_destino', ...)
actualizar_estado_carga('completado', ...)
```

**17:30** - Chofer
```typescript
// Finaliza viaje
actualizar_estado_unidad('viaje_completado', ...)
```

---

## 🎨 UX: NO ES ENGORROSO

### Para el Chofer (Usuario móvil)

Ve solo **1 botón grande** con la acción que le corresponde:

```
[08:00] → "✅ Confirmar viaje"
[09:30] → "🚗 Salir hacia origen"
[11:00] → "📍 Arribé a origen"
[11:15] → "🔓 Ingresar a planta"
[11:30-13:00] → "⏳ Esperando carga..." (sin botón)
[13:15] → "🚚 Salir hacia destino"
...
```

**No ve estados técnicos**. Ve mensajes contextuales:
- "⏳ Esperando llamado a carga" (cuando `en_playa_espera`)
- "⬆️ Carga en proceso" (cuando `en_proceso_carga`)

### Para Supervisor de Carga

Ve lista de camiones ordenada por tiempo de espera:

```
CAMIONES EN PLAYA
-----------------
🚛 AB123CD - ACME Transport
   ⏱️ 45 min en espera
   [Llamar a Carga] [Posicionar]

🚛 EF456GH - Fast Cargo  
   ⏱️ 20 min en espera
   [Llamar a Carga]
```

Una vez en proceso:
```
CARGANDO AHORA
--------------
🚛 AB123CD - ACME Transport
   ⬆️ Carga en proceso
   Peso: 15.3 / 28.0 ton
   [Iniciar Carga] [Finalizar Carga]
```

### Para Control de Acceso

Escanea QR → Ve checklist simple:

```
📱 Escaneado: AB123CD

INGRESO A PLANTA
✓ Remito presente
✓ Patente coincide
✗ Precinto faltante

[❌ Rechazar] [✅ Autorizar Ingreso]
```

---

## 📊 MÉTRICAS Y KPIs

El sistema calcula automáticamente:

### Por Viaje

```sql
SELECT * FROM calcular_kpis_viaje('viaje_id');

Retorna:
- horas_en_planta: 4.5
- minutos_de_carga: 90
- velocidad_promedio_kmh: 65.2
- distancia_recorrida_km: 280
- demoras_detectadas: 1 (en_playa_espera > 2h)
```

### Agregados

```sql
-- Tiempo promedio por fase
SELECT 
  AVG(fecha_carga_producto_ok - fecha_planificacion) as avg_tiempo_carga,
  AVG(fecha_completado - fecha_planificacion) as avg_tiempo_total
FROM vista_estado_viaje_completo
WHERE estado_carga = 'completado'
  AND fecha_planificacion >= CURRENT_DATE - INTERVAL '30 days';

-- Viajes con demora
SELECT COUNT(*) 
FROM detectar_demoras_viajes() 
WHERE tipo_demora = 'carga_lenta';
```

---

## 🔔 NOTIFICACIONES

Sistema de notificaciones con 8 tipos de eventos:

```typescript
enum TipoNotificacion {
  'estado_unidad_actualizado',
  'estado_carga_actualizado', 
  'viaje_asignado',
  'llamado_carga',
  'carga_completada',
  'demora_detectada',
  'documentacion_rechazada',
  'viaje_completado'
}
```

**Ejemplo**: Supervisor llama a carga → Notificación push al chofer:

```sql
INSERT INTO notificaciones (
  usuario_id,
  tipo,
  titulo,
  mensaje,
  prioridad,
  metadatos
) VALUES (
  chofer_user_id,
  'llamado_carga',
  '🔔 Llamado a Carga',
  'Tu camión AB123CD debe posicionarse para carga',
  'alta',
  '{"viaje_id": "...", "playa": "A3"}'
);
```

---

## 🧪 TESTING

### Tests Automáticos Recomendados

```typescript
// __tests__/estados-duales.test.ts

describe('Sistema Estados Duales', () => {
  test('Chofer NO puede actualizar estado de carga', async () => {
    const result = await actualizar_estado_carga(
      viajeId,
      'cargando',
      choferUserId
    );
    expect(result.exitoso).toBe(false);
    expect(result.mensaje).toContain('Solo supervisor de carga');
  });

  test('Supervisor puede llamar a carga', async () => {
    const result = await actualizar_estado_carga(
      viajeId,
      'llamado_carga',
      supervisorUserId
    );
    expect(result.exitoso).toBe(true);
  });

  test('GPS se registra correctamente', async () => {
    const ubicacionId = await registrar_ubicacion_gps(
      viajeId,
      choferId,
      -34.603722,
      -58.381592
    );
    expect(ubicacionId).toBeDefined();
  });
});
```

### Tests Manuales

1. **Test End-to-End**: Crear viaje y avanzarlo por todos los estados
2. **Test de Autoridad**: Intentar actualizar estado no autorizado
3. **Test GPS**: Verificar que se envía cada 30seg durante tránsito
4. **Test de Notificaciones**: Confirmar que se disparan correctamente

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### ✅ Completado

- [x] Diseño de arquitectura dual-state
- [x] Documentación completa (6 archivos)
- [x] Migraciones SQL (3 archivos)
- [x] Funciones de validación (8 funciones)
- [x] APIs REST (4 endpoints)
- [x] Hook de GPS tracking
- [x] Dashboard móvil chofer (actualizado)
- [x] TypeScript types
- [x] Validación de autoridad
- [x] RLS policies
- [x] Vista unificada de estados

### ⏳ Pendiente de Ejecución

- [ ] **EJECUTAR MIGRACIÓN SQL** (ver `docs/INSTRUCCIONES-MIGRACION-SQL.md`)
  - [ ] Paso 1: Verificar pre-requisitos
  - [ ] Paso 2: Ejecutar `011_sistema_estados_duales.sql`
  - [ ] Paso 3: Ejecutar `funciones_estados.sql`
  - [ ] Paso 4: Verificar instalación
  - [ ] Paso 5: Asociar choferes con usuarios

- [ ] Crear páginas faltantes
  - [ ] `pages/supervisor-carga.tsx` (nueva)
  - [ ] Actualizar `pages/control-acceso.tsx` con QR
  
- [ ] Componentes UI compartidos
  - [ ] `<EstadoBadge>` - Color-coded badge
  - [ ] `<TimelineEstados>` - Timeline visual
  - [ ] `<MapaUbicacionTiempoReal>` - Mapa GPS
  - [ ] `<PanelActualizarEstado>` - Modal con acciones
  
- [ ] Firebase Cloud Messaging (opcional para MVP)
  - [ ] Instalar Firebase SDK
  - [ ] Crear service worker
  - [ ] Implementar push notifications

- [ ] Testing
  - [ ] Tests unitarios de APIs
  - [ ] Tests de validación de autoridad
  - [ ] Test end-to-end de flujo completo

---

## 🚀 PRÓXIMOS PASOS INMEDIATOS

### Paso 1: Ejecutar Migración SQL (30 min)

Sigue las instrucciones en `docs/INSTRUCCIONES-MIGRACION-SQL.md`:

1. Abre Supabase Dashboard
2. Ejecuta `000_verificar_prerequisitos.sql`
3. Ejecuta `011_sistema_estados_duales.sql`
4. Ejecuta `funciones_estados.sql`
5. Verifica con queries de test

### Paso 2: Asociar Choferes (10 min)

```sql
-- Para cada chofer existente
UPDATE choferes
SET user_id = (SELECT id FROM auth.users WHERE email = 'chofer@empresa.com')
WHERE email = 'chofer@empresa.com';
```

### Paso 3: Test con Viaje Real (20 min)

1. Crea un despacho desde coordinador
2. Asigna chofer + camión
3. Loguea como chofer en móvil → `/chofer/viajes`
4. Confirma viaje
5. Sal hacia origen (GPS se activa)
6. Verifica en Supabase que se registran ubicaciones

### Paso 4: Crear Supervisor Page (1-2 horas)

Crea `pages/supervisor-carga.tsx` basado en el diseño de `docs/MATRIZ-AUTORIDAD-ESTADOS.md`

### Paso 5: Actualizar Control Acceso (1 hora)

Añade QR scanner y validaciones de documentación

---

## 💡 CONCEPTOS CLAVE PARA RECORDAR

1. **Estados Cruzados**: Múltiples actores actualizan el MISMO viaje
2. **Autoridad por Rol**: Cada rol solo actualiza sus estados autorizados
3. **Validación en Backend**: SQL functions validan permisos antes de update
4. **Frontend Filtrado**: UI muestra solo acciones autorizadas
5. **Dual State**: UNIDAD (logística) + CARGA (operaciones) son independientes pero coordinados
6. **GPS Automático**: Se activa solo cuando `en_transito_origen` o `en_transito_destino`
7. **Progressive Disclosure**: Usuarios ven solo lo relevante a su contexto actual

---

## 📞 SOPORTE Y REFERENCIAS

- **Diseño completo**: `docs/FLUJO-ESTADOS-OPERACIONES.md`
- **Autoridad por rol**: `docs/MATRIZ-AUTORIDAD-ESTADOS.md`
- **UX analysis**: `docs/ANALISIS-UX-FLUJO-ESTADOS.md`
- **Diagrama visual**: `docs/DIAGRAMA-FLUJO-ESTADOS-CRUZADOS.md`
- **Migración SQL**: `docs/INSTRUCCIONES-MIGRACION-SQL.md`
- **Roadmap**: `docs/PLAN-IMPLEMENTACION-ESTADOS.md`

---

**Total Líneas de Código**: ~5,000  
**Archivos Creados**: 10 documentos + 3 SQL + 4 APIs + 2 frontend  
**Estado**: ✅ Listo para migración SQL  
**Siguiente Acción**: Ejecutar migración en Supabase

