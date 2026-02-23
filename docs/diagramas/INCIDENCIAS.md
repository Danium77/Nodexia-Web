# Sistema de Incidencias — Diseño Completo

**Fecha:** 19-Feb-2026  
**Estado:** Pendiente de implementación  
**Prioridad:** Alta (siguiente sesión)

---

## 1. Estado Actual (Auditoría)

### Tablas existentes en BD

| Tabla | Migración | Uso real |
|-------|-----------|----------|
| `incidencias` | 015_sistema_estados_duales_v2.sql | **NO se usa operativamente** — solo la lee el hook `useIncidencias` que consulta la tabla incorrecta |
| `incidencias_viaje` | 053_fix_incidencias_viaje.sql | **Tabla activa** — usada por chofer-mobile y API `crear-incidencia` |

### Esquema `incidencias_viaje` (tabla canónica)

```sql
CREATE TABLE incidencias_viaje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id UUID NOT NULL REFERENCES viajes_despacho(id) ON DELETE CASCADE,
  tipo_incidencia TEXT CHECK (tipo_incidencia IN (
    'retraso', 'averia_camion', 'documentacion_faltante',
    'producto_danado', 'accidente', 'demora', 'problema_mecanico',
    'problema_carga', 'ruta_bloqueada', 'clima_adverso', 'otro'
  )),
  severidad TEXT DEFAULT 'media' CHECK (severidad IN ('baja', 'media', 'alta', 'critica')),
  estado TEXT DEFAULT 'abierta' CHECK (estado IN ('abierta', 'en_proceso', 'resuelta', 'cerrada')),
  descripcion TEXT NOT NULL,
  resolucion TEXT,
  fecha_incidencia TIMESTAMPTZ DEFAULT NOW(),
  fecha_resolucion TIMESTAMPTZ,
  reportado_por UUID NOT NULL,
  resuelto_por UUID,
  fotos_incidencia JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Componentes existentes

| Componente | Archivo | Estado |
|-----------|---------|--------|
| `useIncidencias` hook | `lib/hooks/useIncidencias.tsx` | ⚠️ Consulta tabla `incidencias` (incorrecta) |
| `/incidencias` page | `pages/incidencias.tsx` | ⚠️ Lista básica, links rotos a detalle |
| `/incidencias/[id]` page | **NO EXISTE** | ❌ Falta crear |
| API crear | `pages/api/control-acceso/crear-incidencia.ts` | ✅ Funciona, inserta en `incidencias_viaje` |
| API listar/actualizar | **NO EXISTE** | ❌ Falta crear |
| `IncidenciasTab` (chofer) | `components/Transporte/IncidenciasTab.tsx` | ✅ UI mobile para reportar |
| `IncidenciaModal` (chofer) | `components/Transporte/ChoferModals.tsx` | ✅ Modal de reporte |
| `crearIncidencia` (control acceso) | `pages/control-acceso.tsx:757` | ⚠️ Stub — solo muestra prompt |

### Tipos TypeScript

```
lib/types.ts:
  - Incidencia (líneas 506-533) → usa despacho_id (NO coincide con BD que usa viaje_id)
  - IncidenciaViaje (líneas 664-727) → tiene campos que no existen en incidencias_viaje (titulo, bloquea_viaje, requiere_cancelacion)
```

### Inconsistencias detectadas

1. **Dos tablas con schemas diferentes** — `incidencias` vs `incidencias_viaje`
2. **Hook consulta tabla equivocada** — `useIncidencias` → `incidencias` en vez de `incidencias_viaje`  
3. **Tipos TS no coinciden con BD** — campos que no existen en la tabla real
4. **Página detalle no existe** — `/incidencias/[id]` devuelve 404
5. **Sin API para listar/actualizar/cerrar** — solo existe endpoint de creación
6. **`tipo_incidencia` varía** entre tipos TS, CHECK constraints de BD, y validación de API

---

## 2. Diseño Propuesto

### 2.1 Tabla canónica: `incidencias_viaje`

Mantener `incidencias_viaje` como única fuente de verdad. Deprecar `incidencias`.

### 2.2 Tipos de incidencia

```
retraso              → Demora en la llegada o salida
averia_camion        → Problema mecánico del vehículo
documentacion_faltante → Falta documentación requerida
producto_danado      → Daño en la mercadería
accidente            → Accidente en ruta o planta
problema_mecanico    → Falla mecánica en planta
problema_carga       → Error durante carga/descarga
ruta_bloqueada       → Ruta cortada o impedida
clima_adverso        → Condiciones climáticas adversas
otro                 → Otro tipo de incidencia
```

### 2.3 Flujo de estados

```
┌──────────┐    ┌────────────┐    ┌───────────┐    ┌──────────┐
│  ABIERTA │───►│ EN_PROCESO │───►│ RESUELTA  │───►│ CERRADA  │
└──────────┘    └────────────┘    └───────────┘    └──────────┘
     │                                                   ▲
     └───────────────────────────────────────────────────┘
                    (cerrar sin resolver)
```

### 2.4 Severidad y efectos

| Severidad | Color | Efecto en viaje |
|-----------|-------|-----------------|
| `baja` | 🟢 Verde | Informativo, no bloquea |
| `media` | 🟡 Amarillo | Alerta, el viaje continúa |
| `alta` | 🟠 Naranja | Requiere atención, supervisor notificado |
| `critica` | 🔴 Rojo | Puede bloquear el viaje, requiere resolución inmediata |

### 2.5 Permisos por rol

| Acción | Chofer | Control Acceso | Supervisor | Coordinador | Admin |
|--------|--------|----------------|------------|-------------|-------|
| Crear | ✅ (en ruta) | ✅ (en planta) | ✅ | ✅ | ✅ |
| Ver propias | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver de empresa | ❌ | ✅ | ✅ | ✅ | ✅ |
| Poner en proceso | ❌ | ✅ | ✅ | ✅ | ✅ |
| Resolver | ❌ | ✅ (su planta) | ✅ | ✅ | ✅ |
| Cerrar | ❌ | ❌ | ✅ | ✅ | ✅ |

### 2.6 Visibilidad cross-empresa

```
Empresa ORIGEN (creadora del despacho):
  → Ve TODAS las incidencias de sus despachos

Empresa DESTINO (receptora):
  → Ve incidencias de viajes que llegan a su planta
  → Puede crear incidencias sobre esos viajes

Empresa TRANSPORTE:
  → Ve incidencias de viajes donde su chofer/camión está asignado
  → El chofer puede crear incidencias de ruta
```

Lógica de visibilidad vía CUIT/empresa_id (patrón ya implementado en control-acceso y estados-camiones).

---

## 3. Plan de Implementación

### Fase 1: Unificación (Backend)

1. **Migración BD:**
   - Verificar que `incidencias_viaje` tiene RLS policies correctas
   - Crear función `get_visible_incidencias_ids()` (patrón de migration 062)
   - Deprecar tabla `incidencias` (no borrar, solo dejar de usar)

2. **Unificar tipos TS:**
   - Actualizar `Incidencia` y `IncidenciaViaje` en `lib/types.ts`
   - Alinear campos con schema real de `incidencias_viaje`

3. **Fix hook `useIncidencias`:**
   - Cambiar para consultar `incidencias_viaje`
   - Agregar filtro por empresa (visibilidad)

4. **APIs CRUD:**
   - `GET /api/incidencias` — Listar con filtros (estado, severidad, tipo, viaje_id)
   - `GET /api/incidencias/[id]` — Detalle
   - `POST /api/incidencias` — Crear (unificar con `crear-incidencia`)
   - `PATCH /api/incidencias/[id]` — Actualizar estado/resolución
   - Todas con `withAuth`, RLS, validación por rol

### Fase 2: Frontend

5. **Rediseñar `/incidencias`:**
   - Tabs: Abiertas | En Proceso | Resueltas | Cerradas
   - Filtros: severidad, tipo, fecha
   - Badge con cantidad de abiertas (críticas resaltadas)

6. **Crear `/incidencias/[id]`:**
   - Timeline del incidente (creación → proceso → resolución → cierre)
   - Info del viaje/despacho asociado
   - Fotos (si hay)
   - Botones de acción según rol (poner en proceso, resolver, cerrar)
   - Campo de resolución

7. **Modal de creación en Control de Acceso:**
   - Reemplazar stub `crearIncidencia()` por modal real
   - Tipo + severidad + descripción + foto (opcional)
   - Auto-vincula al viaje actual escaneado

8. **Notificaciones:**
   - Al crear incidencia → notificar supervisor + coordinador
   - Al resolver → notificar al reportante
   - Incidencia crítica → notificación push si disponible

### Fase 3: Integración

9. **Badge en sidebar:**
   - Mostrar cantidad de incidencias abiertas
   - Rojo si hay críticas

10. **Integración con despachos:**
    - En detalle de despacho, mostrar incidencias del viaje
    - En timeline del despacho, eventos de incidencia

11. **Integración con estados-camiones:**
    - Indicador visual si el viaje tiene incidencias abiertas

---

## 4. Diagrama de Flujo

```
                    ┌─────────────┐
                    │  USUARIO    │
                    │  reporta    │
                    └──────┬──────┘
                           │
              ┌────────────┼───────────────┐
              │            │               │
        ┌─────▼────┐ ┌─────▼─────┐  ┌──────▼──────┐
        │  Chofer   │ │  Control  │  │ Supervisor  │
        │  Mobile   │ │  Acceso   │  │ Coordinador │
        └─────┬────┘ └─────┬─────┘  └──────┬──────┘
              │            │               │
              └────────────┼───────────────┘
                           │
                    ┌──────▼──────┐
                    │   POST      │
                    │ /api/       │
                    │ incidencias │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ incidencias │
                    │   _viaje    │
                    │  (tabla)    │
                    └──────┬──────┘
                           │
              ┌────────────┼───────────────┐
              │            │               │
        ┌─────▼────┐ ┌─────▼─────┐  ┌──────▼──────┐
        │Notificar │ │ Registrar │  │  Timeline   │
        │supervisor│ │ historial │  │  despacho   │
        └──────────┘ └───────────┘  └─────────────┘
```

---

## 5. Prioridad de implementación

| # | Tarea | Estimación | Dependencias |
|---|-------|------------|--------------|
| 1 | Fix hook + tipos TS | 30 min | Ninguna |
| 2 | APIs CRUD | 1 hora | #1 |
| 3 | Rediseñar /incidencias | 1 hora | #2 |
| 4 | Crear /incidencias/[id] | 1 hora | #2 |
| 5 | Modal en Control Acceso | 30 min | #2 |
| 6 | RLS policies | 30 min | #1 |
| 7 | Notificaciones | 30 min | #2 |
| 8 | Integración despachos/estados | 30 min | #3, #4 |

**Total estimado: ~5-6 horas**

---

## 6. Archivos a modificar/crear

### Modificar:
- `lib/types.ts` — Unificar tipos
- `lib/hooks/useIncidencias.tsx` — Fix tabla + filtro empresa
- `pages/incidencias.tsx` — Rediseño completo
- `pages/control-acceso.tsx` — Modal real de creación
- `pages/api/control-acceso/crear-incidencia.ts` — Unificar con nuevo endpoint

### Crear:
- `pages/api/incidencias/index.ts` — GET (listar) + POST (crear)
- `pages/api/incidencias/[id].ts` — GET (detalle) + PATCH (actualizar)
- `pages/incidencias/[id].tsx` — Página de detalle
- `sql/migrations/064_fix_incidencias_rls.sql` — RLS policies

### Deprecar:
- Tabla `incidencias` (dejar pero no usar)
- Tipo `Incidencia` (reemplazar por `IncidenciaViaje` unificado)

---

**Nota:** Respetar principios de QUICK-START-OPUS.md:
- APIs con `withAuth` + RLS (CERO bypass)
- Frontend solo consume APIs (CERO inserts directos)
- Visibilidad cross-empresa via CUIT/empresa_id
