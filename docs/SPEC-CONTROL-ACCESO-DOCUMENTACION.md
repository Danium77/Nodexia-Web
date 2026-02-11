# ESPECIFICACIÓN TÉCNICA: Control de Acceso + Gestión de Documentación

**Fecha:** 06-FEB-2026  
**Estado:** Definición aprobada, lista para implementación  
**Stack:** Next.js 16 (Pages Router) + React 19 + TypeScript + Supabase + Tailwind CSS v4

---

## CONTEXTO DEL PROYECTO

Nodexia-Web es una plataforma B2B de gestión logística multi-tenant. Esta spec define dos subsistemas interconectados:
1. **Gestión de Documentación** — Administración de documentos de flota a nivel de red Nodexia
2. **Control de Acceso** — Interfaz para guardias en planta (PC + mobile webapp)
3. **Flujo de Incidencias** — Cuando documentación no está en orden al arribar

---

## 1. SISTEMA DE DOCUMENTACIÓN

### 1.1 Modelo de Datos

#### Tabla `documentos_entidad` (NUEVA — reemplaza el uso actual de `documentos`)

```sql
CREATE TABLE IF NOT EXISTS documentos_entidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entidad dueña del documento
  entidad_tipo TEXT NOT NULL CHECK (entidad_tipo IN ('chofer', 'camion', 'acoplado', 'transporte')),
  entidad_id UUID NOT NULL,
  
  -- Tipo de documento
  tipo_documento TEXT NOT NULL,
  -- Valores válidos según entidad_tipo:
  -- chofer: 'licencia_conducir', 'art_clausula_no_repeticion', 'seguro_vida_autonomo'
  -- camion: 'seguro', 'rto', 'cedula'
  -- acoplado: 'seguro', 'rto', 'cedula'
  -- transporte: 'seguro_carga_global'
  
  -- Archivo
  nombre_archivo TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  bucket TEXT NOT NULL DEFAULT 'documentacion-entidades',
  storage_path TEXT NOT NULL,
  
  -- Vigencia
  fecha_emision DATE,
  fecha_vencimiento DATE,
  estado_vigencia TEXT NOT NULL DEFAULT 'pendiente_validacion'
    CHECK (estado_vigencia IN ('pendiente_validacion', 'vigente', 'por_vencer', 'vencido', 'rechazado')),
  
  -- Validación por Nodexia (backoffice)
  validado_por UUID REFERENCES auth.users(id),
  fecha_validacion TIMESTAMPTZ,
  motivo_rechazo TEXT,
  
  -- Validación excepcional por coordinador de planta
  validacion_excepcional BOOLEAN DEFAULT FALSE,
  validado_excepcionalmente_por UUID REFERENCES auth.users(id),
  fecha_validacion_excepcional TIMESTAMPTZ,
  requiere_reconfirmacion_backoffice BOOLEAN DEFAULT FALSE,
  reconfirmado_por UUID REFERENCES auth.users(id),
  fecha_reconfirmacion TIMESTAMPTZ,
  
  -- Metadata
  subido_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  activo BOOLEAN DEFAULT TRUE -- soft delete
);

-- Índices
CREATE INDEX idx_doc_entidad_tipo_id ON documentos_entidad(entidad_tipo, entidad_id);
CREATE INDEX idx_doc_tipo_documento ON documentos_entidad(tipo_documento);
CREATE INDEX idx_doc_estado_vigencia ON documentos_entidad(estado_vigencia);
CREATE INDEX idx_doc_fecha_vencimiento ON documentos_entidad(fecha_vencimiento);
CREATE INDEX idx_doc_validacion_pendiente ON documentos_entidad(estado_vigencia) WHERE estado_vigencia = 'pendiente_validacion';
CREATE INDEX idx_doc_reconfirmacion ON documentos_entidad(requiere_reconfirmacion_backoffice) WHERE requiere_reconfirmacion_backoffice = TRUE;
```

#### Tabla `documentos_viaje_seguro` (NUEVA — seguros de carga por viaje)

```sql
CREATE TABLE IF NOT EXISTS documentos_viaje_seguro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id UUID NOT NULL REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  
  tipo TEXT NOT NULL DEFAULT 'seguro_carga_viaje',
  nombre_archivo TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  bucket TEXT NOT NULL DEFAULT 'documentacion-viajes',
  storage_path TEXT NOT NULL,
  
  fecha_emision DATE,
  fecha_vencimiento DATE,
  estado_vigencia TEXT NOT NULL DEFAULT 'pendiente_validacion'
    CHECK (estado_vigencia IN ('pendiente_validacion', 'vigente', 'vencido', 'rechazado')),
  
  validado_por UUID REFERENCES auth.users(id),
  fecha_validacion TIMESTAMPTZ,
  
  subido_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 Catálogo de Documentos Requeridos

```typescript
// types/documentacion.ts

export type EntidadDocumento = 'chofer' | 'camion' | 'acoplado' | 'transporte';

export type TipoDocumentoChofer = 'licencia_conducir' | 'art_clausula_no_repeticion' | 'seguro_vida_autonomo';
export type TipoDocumentoCamion = 'seguro' | 'rto' | 'cedula';
export type TipoDocumentoAcoplado = 'seguro' | 'rto' | 'cedula';
export type TipoDocumentoTransporte = 'seguro_carga_global';
export type TipoDocumentoViaje = 'seguro_carga_viaje';

export type TipoDocumento = TipoDocumentoChofer | TipoDocumentoCamion | TipoDocumentoAcoplado | TipoDocumentoTransporte;

export type EstadoVigencia = 'pendiente_validacion' | 'vigente' | 'por_vencer' | 'vencido' | 'rechazado';

export const DOCUMENTOS_REQUERIDOS: Record<EntidadDocumento, { tipo: string; nombre: string; obligatorio: boolean }[]> = {
  chofer: [
    { tipo: 'licencia_conducir', nombre: 'Licencia de Conducir', obligatorio: true },
    { tipo: 'art_clausula_no_repeticion', nombre: 'ART + Cláusula No Repetición', obligatorio: true },
    // Para autónomos, se sube 'seguro_vida_autonomo' EN LUGAR de 'art_clausula_no_repeticion'
    { tipo: 'seguro_vida_autonomo', nombre: 'Seguro de Vida (Autónomos)', obligatorio: false },
  ],
  camion: [
    { tipo: 'seguro', nombre: 'Seguro de Camión', obligatorio: true },
    { tipo: 'rto', nombre: 'Revisión Técnica Obligatoria (RTO)', obligatorio: true },
    { tipo: 'cedula', nombre: 'Cédula Verde / Azul', obligatorio: true },
  ],
  acoplado: [
    { tipo: 'seguro', nombre: 'Seguro de Acoplado', obligatorio: true },
    { tipo: 'rto', nombre: 'Revisión Técnica Obligatoria (RTO)', obligatorio: true },
    { tipo: 'cedula', nombre: 'Cédula Verde / Azul', obligatorio: true },
  ],
  transporte: [
    { tipo: 'seguro_carga_global', nombre: 'Póliza de Seguro de Carga (Global)', obligatorio: false },
  ],
};

export interface DocumentoEntidad {
  id: string;
  entidad_tipo: EntidadDocumento;
  entidad_id: string;
  tipo_documento: TipoDocumento;
  nombre_archivo: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  fecha_emision?: string;
  fecha_vencimiento?: string;
  estado_vigencia: EstadoVigencia;
  validado_por?: string;
  fecha_validacion?: string;
  motivo_rechazo?: string;
  validacion_excepcional: boolean;
  requiere_reconfirmacion_backoffice: boolean;
  subido_por?: string;
  created_at: string;
  updated_at: string;
  activo: boolean;
}

// Resultado de verificación de documentación para una unidad operativa
export interface VerificacionDocumentacion {
  chofer: {
    tiene_documentos: boolean; // al menos 1 doc cargado
    documentos_vigentes: number;
    documentos_por_vencer: number;
    documentos_vencidos: number;
    documentos_faltantes: string[]; // tipos no cargados
    detalle: DocumentoEntidad[];
  };
  camion: {
    tiene_documentos: boolean;
    documentos_vigentes: number;
    documentos_por_vencer: number;
    documentos_vencidos: number;
    documentos_faltantes: string[];
    detalle: DocumentoEntidad[];
  };
  acoplado: {
    tiene_documentos: boolean;
    documentos_vigentes: number;
    documentos_por_vencer: number;
    documentos_vencidos: number;
    documentos_faltantes: string[];
    detalle: DocumentoEntidad[];
  } | null; // null si no hay acoplado
  transporte: {
    tiene_seguro_carga: boolean;
    detalle: DocumentoEntidad[];
  };
  // Resumen general
  puede_recibir_viajes: boolean; // true si chofer+camion+acoplado tienen AL MENOS 1 doc cada uno
  documentacion_completa: boolean; // true si TODOS los docs obligatorios están vigentes
  alerta_vencimiento: boolean; // true si algún doc está por vencer
  requiere_incidencia: boolean; // true si hay docs vencidos al momento de arribo
}
```

### 1.3 Lógica de Vigencia Automática

```sql
-- Función CRON que corre diariamente para actualizar vigencias
CREATE OR REPLACE FUNCTION actualizar_vigencia_documentos()
RETURNS void AS $$
BEGIN
  -- Marcar como vencidos los documentos pasados de fecha
  UPDATE documentos_entidad
  SET estado_vigencia = 'vencido', updated_at = now()
  WHERE fecha_vencimiento < CURRENT_DATE
    AND estado_vigencia IN ('vigente', 'por_vencer')
    AND activo = TRUE;
  
  -- Marcar como por_vencer los que vencen en 20 días o menos
  UPDATE documentos_entidad
  SET estado_vigencia = 'por_vencer', updated_at = now()
  WHERE fecha_vencimiento BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '20 days')
    AND estado_vigencia = 'vigente'
    AND activo = TRUE;
END;
$$ LANGUAGE plpgsql;
```

### 1.4 Notificaciones de Vencimiento

Disparar notificaciones a **20, 10 y 5 días** antes del vencimiento. Notificar a:
- **Chofer** (via app / email)
- **Transporte** (panel)

```sql
-- Vista para obtener documentos próximos a vencer (para sistema de notificaciones)
CREATE OR REPLACE VIEW documentos_proximos_vencer AS
SELECT 
  de.*,
  (de.fecha_vencimiento - CURRENT_DATE) AS dias_para_vencer,
  CASE
    WHEN (de.fecha_vencimiento - CURRENT_DATE) <= 5 THEN 'urgente'
    WHEN (de.fecha_vencimiento - CURRENT_DATE) <= 10 THEN 'alerta'
    WHEN (de.fecha_vencimiento - CURRENT_DATE) <= 20 THEN 'aviso'
  END AS nivel_alerta
FROM documentos_entidad de
WHERE de.fecha_vencimiento BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '20 days')
  AND de.estado_vigencia IN ('vigente', 'por_vencer')
  AND de.activo = TRUE;
```

### 1.5 Regla de Bloqueo para Asignación de Viajes

```typescript
// lib/api/documentacion.ts

/**
 * Verifica si una unidad operativa puede recibir viajes.
 * BLOQUEA solo si no tiene NINGÚN documento cargado (chofer, camión o acoplado).
 * Documentos vencidos generan ALERTA pero NO bloquean.
 */
export async function puedeRecibirViajes(unidadOperativaId: string): Promise<{
  puede: boolean;
  motivo?: string;
  alertas: string[];
}> {
  // Lógica: consultar documentos_entidad para chofer_id, camion_id, acoplado_id de la unidad
  // Si alguna entidad tiene 0 documentos cargados → puede = false
  // Si hay docs vencidos → puede = true, pero se agregan alertas
}
```

---

## 2. CONTROL DE ACCESO — FLUJO DE ESTADOS

### 2.1 Transiciones de Estado (guardia en planta)

El guardia NO elige la acción. El **sistema detecta automáticamente** qué botón mostrar según el `estado_unidad` actual del viaje.

```typescript
// lib/helpers/control-acceso-helpers.ts

export interface AccionControlAcceso {
  label: string;
  nuevo_estado: EstadoUnidadViaje;
  requiere_validacion_docs: boolean;
  contexto: 'origen' | 'destino';
  icono: string;
}

/**
 * Determina qué acción puede ejecutar el guardia de Control de Acceso
 * según el estado actual del viaje.
 * 
 * Retorna null si el guardia NO tiene acción para este estado.
 */
export function obtenerAccionControlAcceso(
  estado_actual: EstadoUnidadViaje
): AccionControlAcceso | null {
  const mapa: Record<string, AccionControlAcceso> = {
    'en_transito_origen': {
      label: 'Confirmar Ingreso a Planta',
      nuevo_estado: 'ingresado_origen',
      requiere_validacion_docs: true,  // ← Aquí se validan docs
      contexto: 'origen',
      icono: 'ArrowDownTrayIcon',
    },
    'ingresado_origen': {
      label: 'Asignar Playa de Espera',
      nuevo_estado: 'en_playa_origen',
      requiere_validacion_docs: false,
      contexto: 'origen',
      icono: 'MapPinIcon',
    },
    'egreso_origen': {
      label: 'Confirmar Egreso de Planta',
      nuevo_estado: 'en_transito_destino',
      requiere_validacion_docs: true,  // ← Validación de docs al salir también
      contexto: 'origen',
      icono: 'ArrowUpTrayIcon',
    },
    'en_transito_destino': {
      label: 'Confirmar Ingreso a Destino',
      nuevo_estado: 'ingresado_destino',
      requiere_validacion_docs: true,
      contexto: 'destino',
      icono: 'ArrowDownTrayIcon',
    },
    'vacio': {
      label: 'Confirmar Egreso de Destino',
      nuevo_estado: 'disponible',
      requiere_validacion_docs: false,
      contexto: 'destino',
      icono: 'ArrowUpTrayIcon',
    },
  };

  return mapa[estado_actual] || null;
}
```

### 2.2 Acciones que NO hace el guardia (otros roles)

| Acción | Rol responsable |
|---|---|
| `en_playa_origen` → `llamado_carga` | Supervisor de carga |
| `llamado_carga` → `cargando` | Supervisor de carga |
| `cargando` → `egreso_origen` | Supervisor de carga |
| `ingresado_destino` → `llamado_descarga` | Supervisor de carga |
| `llamado_descarga` → `descargando` | Supervisor de carga |
| `descargando` → `vacio` | Supervisor de carga |

### 2.3 Tabla `registros_acceso` (YA EXISTE — mantener)

La tabla actual es funcional. Al ejecutar cada acción de Control de Acceso, se inserta un registro:

```typescript
// Al confirmar ingreso o egreso
await supabase.from('registros_acceso').insert({
  viaje_id: viaje.id,
  tipo: 'ingreso' | 'egreso',
  usuario_id: usuario_actual.id,
  observaciones: 'Documentación validada correctamente' | 'Ingreso con incidencia pendiente',
});
```

---

## 3. FLUJO DE INCIDENCIAS POR DOCUMENTACIÓN

### 3.1 Cuándo se crea una incidencia

Cuando el guardia escanea un QR y el sistema detecta documentación vencida o faltante en el chofer, camión o acoplado.

**El guardia NO rechaza.** Solo crea la incidencia y el camión queda esperando en la entrada.

### 3.2 Modelo de datos de incidencia

La API `pages/api/control-acceso/crear-incidencia.ts` ya existe con un esquema extenso. Adaptar para incluir:

```typescript
// Tipos de incidencia relacionados a documentación
type TipoIncidenciaDocumentacion = 
  | 'documentacion_vencida'     // Doc existe pero venció
  | 'documentacion_faltante'    // Doc obligatorio no fue cargado
  | 'documentacion_incorrecta'  // Doc cargado pero datos no coinciden
  ;
```

### 3.3 Flujo de resolución

```
1. Guardia escanea QR
2. Sistema detecta docs con problema → muestra alerta
3. Guardia presiona "Crear Incidencia de Documentación"
4. Se crea incidencia con:
   - viaje_id
   - tipo: 'documentacion_vencida' | 'documentacion_faltante'
   - documentos_afectados: ['licencia_conducir', 'seguro_camion']  
   - prioridad: calculada automáticamente
5. Se notifica al Coordinador de Planta (alerta en panel)
6. Coordinador evalúa:
   a) SOLUCIONABLE: 
      - Actualiza/sube documentos faltantes
      - Marca como "validación excepcional temporal"
      - Campo `requiere_reconfirmacion_backoffice = true`
      - El viaje puede continuar ingresando
   b) GRAVE (chofer no tiene docs, no puede reemplazarlos):
      - Coordinador rechaza el camión
      - Se registra motivo de rechazo
      - El viaje pasa a estado 'incidencia'
7. Si fue validación excepcional:
   - Backoffice Nodexia recibe alerta de reconfirmación pendiente
   - Backoffice valida o revalida los documentos
   - Se cierra la incidencia
```

---

## 4. INTERFACES DE USUARIO

### 4.1 Interfaz MOBILE (webapp responsive) — Guardia

**Ruta:** `/control-acceso/mobile` o versión responsive de `/control-acceso`  
**Acceso:** Navegador del celular, optimizado touch.

**Pantalla principal:**
```
┌──────────────────────────────┐
│  NODEXIA Control de Acceso   │
│  [Planta: Nombre Planta]     │
├──────────────────────────────┤
│                              │
│   ┌──────────────────────┐   │
│   │   📷 ESCANEAR QR     │   │  ← Botón grande, abre cámara
│   │   (tocar para abrir) │   │
│   └──────────────────────┘   │
│                              │
│  ─ ─ ─ ó ingresar código ─ ─│
│  [________________] [Buscar] │
│                              │
├──────────────────────────────┤
│  Últimos accesos hoy:       │
│  ✅ ABC-123 Ingreso 14:32   │
│  ✅ DEF-456 Egreso  14:15   │
│  ⚠️ GHI-789 Incidencia 13:50│
└──────────────────────────────┘
```

**Después de escanear QR (resultado):**
```
┌──────────────────────────────┐
│  Viaje #1234                 │
│  Ruta: Planta A → Depósito B│
├──────────────────────────────┤
│  🚛 Camión: ABC-123         │
│  👤 Chofer: Juan Pérez      │
│     DNI: 30.123.456         │
├──────────────────────────────┤
│  📄 Documentación:          │
│  ✅ Licencia       Vigente   │
│  ✅ Seguro Camión  Vigente   │
│  ⚠️ RTO Acoplado  Por vencer│
│  ❌ ART            Vencida   │
├──────────────────────────────┤
│  ┌──────────────────────┐   │
│  │ ✅ CONFIRMAR INGRESO  │   │  ← Si docs OK
│  └──────────────────────┘   │
│  ┌──────────────────────┐   │
│  │ ⚠️ CREAR INCIDENCIA   │   │  ← Si hay docs con problema
│  └──────────────────────┘   │
│  ┌──────────────────────┐   │
│  │ 📍 ASIGNAR PLAYA     │   │  ← Input para nro de playa
│  └──────────────────────┘   │
└──────────────────────────────┘
```

**Funciones mobile:**
- Escanear QR (cámara nativa vía `navigator.mediaDevices`)
- Ver documentación del chofer/camión/acoplado
- Confirmar ingreso / egreso (según estado)
- Asignar playa de espera (input numérico)
- Crear incidencia de documentación
- Historial breve (últimos 5 accesos)

### 4.2 Interfaz PC — Guardia (panel completo)

**Ruta:** `/control-acceso`  
**Ya existe:** `pages/control-acceso.tsx` (1043 líneas). Requiere refactorización.

**Secciones del panel PC:**
1. **Escanear QR** (input texto, lo que ya existe)
2. **Próximos Arribos** — Lista de viajes con GPS del chofer acercándose a planta. Calcular ETA.
3. **Camiones en Planta Actualmente** — Todos los viajes en estados `ingresado_origen`, `en_playa_origen`, `cargando`, `egreso_origen` (y equivalentes destino)
4. **Historial de Accesos Hoy** — Tabla con todos los ingresos/egresos del día (ya existe)
5. **Incidencias Abiertas** — Badge con counter, listado de incidencias pendientes
6. **Badges resumen:**
   - Camiones en planta: X
   - Ingresos hoy: X
   - Egresos hoy: X
   - Incidencias abiertas: X
   - Próximos arribos: X

### 4.3 Panel Backoffice Nodexia — Validación de Documentación

**Rol:** Nuevo rol `backoffice_nodexia` (o subruta de `super_admin`)  
**Ruta:** `/admin/documentacion` o `/backoffice/documentacion`

**Funciones:**
- Buscador por patente (camión/acoplado) o DNI (chofer)
- Al buscar, muestra la **unidad operativa completa**: chofer + camión + acoplado
- Lista todos los documentos de cada entidad con estado
- Acciones: Aprobar, Rechazar (con motivo), Solicitar re-subida
- Cola de "Pendientes de validación"
- Cola de "Reconfirmaciones pendientes" (validaciones excepcionales de coordinadores)

### 4.4 Panel Transporte — Subida de Documentación

**Ruta:** Ya existe panel de flota. Agregar sección de documentos en:
- Detalle de cada Camión → pestaña "Documentación"
- Detalle de cada Acoplado → pestaña "Documentación" 
- Detalle de cada Chofer → pestaña "Documentación"

**Funciones:**
- Subir archivo (PDF, imagen)
- Indicar fecha de emisión y vencimiento
- Ver estado de validación
- Re-subir si fue rechazado

### 4.5 App Chofer — Subida de Documentación

**Ruta:** Vista mobile del chofer  
**Funciones:**
- Ver documentos propios (chofer)
- Subir documentos que le falten
- Ver alertas de vencimiento próximo
- Recibir notificación push de docs por vencer

---

## 5. ARCHIVOS EXISTENTES A MODIFICAR

### 5.1 Archivos que ya existen y necesitan refactorización

| Archivo | Estado actual | Qué hacer |
|---|---|---|
| `pages/control-acceso.tsx` | 1043 líneas, funcional con queries directas a Supabase | Refactorizar: separar en componentes, conectar con API routes, agregar responsive mobile |
| `components/DocumentacionDetalle.tsx` | 269 líneas, datos HARDCODED demo | Conectar a BD real (`documentos_entidad`), mostrar docs reales |
| `pages/api/control-acceso/escanear-qr.ts` | Usa tabla `viajes` y estados diferentes a los definidos | Adaptar a tabla `viajes_despacho`, usar `estado_unidad` del tipo `EstadoUnidadViaje` |
| `pages/api/control-acceso/confirmar-accion.ts` | Usa tabla `viajes`, estados `confirmado`/`ingresado_planta` | Adaptar a `viajes_despacho`, usar transiciones correctas |
| `pages/api/control-acceso/crear-incidencia.ts` | 330 líneas, esquema extenso con tabla `incidencias_control_acceso` | Revisar si tabla existe, adaptar para flujo de documentación |
| `lib/api/estado-unidad.ts` | Funcional, usa RPC `validar_transicion_estado_unidad` | Mantener, es la forma correcta de cambiar estados |
| `sql/crear-tabla-registros-acceso.sql` | Tabla funcional | Mantener sin cambios |

### 5.2 Archivos NUEVOS a crear

| Archivo | Propósito |
|---|---|
| `types/documentacion.ts` | Tipos de documentación (ver sección 1.2) |
| `sql/migrations/0XX_documentos_entidad.sql` | Tabla `documentos_entidad` + índices + RLS |
| `sql/migrations/0XX_documentos_viaje_seguro.sql` | Tabla seguros de carga por viaje |
| `sql/migrations/0XX_funcion_vigencia_automatica.sql` | Función CRON + vista `documentos_proximos_vencer` |
| `lib/api/documentacion.ts` | CRUD documentos, verificación, upload a Supabase Storage |
| `lib/helpers/control-acceso-helpers.ts` | `obtenerAccionControlAcceso()`, lógica de detección automática |
| `components/Documentacion/SubirDocumento.tsx` | Componente reutilizable para upload de doc |
| `components/Documentacion/ListaDocumentos.tsx` | Lista docs de una entidad con estado visual |
| `components/Documentacion/ValidarDocumento.tsx` | UI de validación para backoffice |
| `components/ControlAcceso/EscanerQR.tsx` | Componente QR con cámara para mobile |
| `components/ControlAcceso/ResultadoEscaneo.tsx` | Resultado post-escaneo con docs y acciones |
| `components/ControlAcceso/ProximosArribos.tsx` | Lista viajes acercándose a planta (GPS) |
| `components/ControlAcceso/CamionesEnPlanta.tsx` | Lista camiones actualmente en planta |
| `components/ControlAcceso/IncidenciaDocForm.tsx` | Formulario para crear incidencia de docs |
| `pages/api/documentacion/upload.ts` | API upload a Supabase Storage |
| `pages/api/documentacion/validar.ts` | API validación backoffice |
| `pages/api/documentacion/verificar-unidad.ts` | API verificación docs de unidad operativa |
| `pages/api/documentacion/excepcional.ts` | API validación excepcional coordinador |
| `pages/backoffice/documentacion.tsx` | Panel backoffice validación docs |

---

## 6. ESTADOS COMPLETOS DEL VIAJE (Referencia)

Definidos en `lib/types.ts` línea 584, tipo `EstadoUnidadViaje` (17 estados):

```
FASE 1 - ASIGNACIÓN:     camion_asignado
FASE 2 - TRÁNSITO ORIG:  en_transito_origen
FASE 3 - ORIGEN:          ingresado_origen → en_playa_origen → llamado_carga → cargando
FASE 4 - EGRESO:          egreso_origen
FASE 5 - TRÁNSITO DEST:  en_transito_destino
FASE 6 - DESTINO:         arribado_destino → ingresado_destino → llamado_descarga → descargando → vacio
FASE 7 - FINAL:           disponible (reutilizable) | cancelado | expirado | incidencia (no reutilizables)
```

**Transiciones que ejecuta Control de Acceso:**
```
en_transito_origen    → ingresado_origen     (Ingreso a planta origen)
ingresado_origen      → en_playa_origen      (Asignar playa)
egreso_origen         → en_transito_destino  (Egreso de planta origen)
en_transito_destino   → ingresado_destino    (Ingreso a planta destino)
vacio                 → disponible           (Egreso de planta destino)
```

**NOTA:** El estado `arribado_destino` que existe actualmente en la definición de estados NO es utilizado por Control de Acceso. El guardia en destino recibe al camión directamente desde `en_transito_destino` → `ingresado_destino`. Si se desea mantener `arribado_destino` como un estado GPS automático previo, se puede configurar como transición automática por geofence sin intervención del guardia.

---

## 7. INCONSISTENCIAS DETECTADAS A RESOLVER

ANTES de implementar, corregir estas inconsistencias encontradas en el código actual:

| # | Problema | Ubicación | Solución |
|---|---|---|---|
| 1 | API endpoints usan tabla `viajes` que NO existe — la tabla real es `viajes_despacho` | `pages/api/control-acceso/*.ts` | Cambiar todas las queries a `viajes_despacho` |
| 2 | API usa estados `confirmado`, `ingresado_planta`, `egresado_planta` que no coinciden con `EstadoUnidadViaje` | `pages/api/control-acceso/confirmar-accion.ts` | Usar los estados definidos en `lib/types.ts` |
| 3 | `tipo_operacion` hardcodeado a `'envio'` en `pages/control-acceso.tsx` | Línea ~310 de `control-acceso.tsx` | Detectar automáticamente por estado: si `en_transito_origen` → origen, si `en_transito_destino` → destino |
| 4 | `documentacion_validada: true` hardcodeado | `pages/control-acceso.tsx` ~línea 340 | Consultar `documentos_entidad` reales |
| 5 | `DocumentacionDetalle.tsx` usa datos demo hardcoded | `components/DocumentacionDetalle.tsx` | Conectar a tabla `documentos_entidad` |
| 6 | `crearIncidencia()` en la página es un stub con `prompt()` | `pages/control-acceso.tsx` | Usar API `/api/control-acceso/crear-incidencia` refactorizada |
| 7 | Tipos duplicados de `Acoplado` con shapes diferentes | `types/business.ts` vs `types/missing-types.ts` | Unificar en `types/business.ts` |
| 8 | Verificación de permisos faltante en página | `pages/control-acceso.tsx` | Agregar guard de rol `control_acceso` al cargar |

---

## 8. SUPABASE STORAGE — Configuración necesaria

```sql
-- Crear bucket para documentación
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentacion-entidades', 'documentacion-entidades', false);

INSERT INTO storage.buckets (id, name, public)
VALUES ('documentacion-viajes', 'documentacion-viajes', false);

-- Políticas de acceso al storage
-- Transporte puede subir docs de su flota
-- Chofer puede subir sus propios docs
-- Backoffice puede ver todos
-- Control de acceso puede ver (solo lectura)
```

---

## 9. ORDEN DE IMPLEMENTACIÓN SUGERIDO

### Fase 1: Base de datos y tipos (prerequisito)
1. Crear migración `documentos_entidad`
2. Crear tipo `types/documentacion.ts`
3. Configurar Supabase Storage buckets
4. Resolver inconsistencias (#1, #2, #7 de sección 7)

### Fase 2: API de documentación
5. `lib/api/documentacion.ts` — CRUD + verificación
6. `pages/api/documentacion/upload.ts`
7. `pages/api/documentacion/verificar-unidad.ts`
8. Función SQL de vigencia automática

### Fase 3: Control de Acceso refactorizado
9. `lib/helpers/control-acceso-helpers.ts`
10. Refactorizar `pages/control-acceso.tsx` — conectar con API real
11. Actualizar `components/DocumentacionDetalle.tsx` — datos reales
12. Refactorizar APIs existentes en `pages/api/control-acceso/`

### Fase 4: Mobile webapp
13. Componente `EscanerQR.tsx` (cámara)
14. Vista mobile responsive de control-acceso
15. `ResultadoEscaneo.tsx` + acciones

### Fase 5: Panel Transporte (subida docs)
16. Componentes de upload en panel de flota
17. Integración en detalle de camión, acoplado, chofer

### Fase 6: Backoffice Nodexia
18. `pages/backoffice/documentacion.tsx`
19. Buscador por patente/DNI
20. Cola de validaciones pendientes
21. Cola de reconfirmaciones excepcionales

### Fase 7: Notificaciones y automatización
22. Sistema de alertas de vencimiento (20/10/5 días)
23. Próximos arribos con GPS
24. CRON de vigencia automática
