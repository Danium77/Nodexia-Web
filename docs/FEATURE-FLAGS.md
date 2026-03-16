# Sistema de Feature Flags — Nodexia-Web

**Fecha**: 16-Mar-2026  
**Migración**: 079  
**Archivos clave**:
- `lib/contexts/FeatureFlagContext.tsx` — Provider + hook
- `components/ui/FeatureGate.tsx` — Componente wrapper
- `pages/api/admin/funciones.ts` — API de gestión
- `components/Admin/GestionFunciones.tsx` — Panel admin
- `pages/admin/funciones.tsx` — Página admin

---

## Concepto

Cada funcionalidad de la app tiene una "llave" (clave) que la identifica. El admin puede encender o apagar esa llave a 3 niveles:

1. **Global** → Apaga la función para TODOS. Útil si algo no está listo o hay un problema.
2. **Por empresa** → Habilita la función solo para empresas específicas (opt-in).
3. **Por rol** → Dentro de una empresa, oculta la función para roles específicos (opt-out).

### Reglas de resolución

```
¿funciones_sistema.activo = true?      → NO → Apagada para TODOS
         ↓ SÍ
¿funciones_empresa.habilitada = true?  → NO → Apagada para esta empresa
         ↓ SÍ
¿funciones_rol.visible = false?        → SÍ → Oculta para este rol
         ↓ NO
         ✅ Disponible
```

Excepción: `admin_nodexia` siempre ve todas las features activas globalmente.

---

## Tablas de base de datos

### `funciones_sistema`
Catálogo global. Cada fila es una función del sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | PK |
| `clave` | TEXT UNIQUE | Identificador en código. Ej: `'red_nodexia'` |
| `nombre` | TEXT | Nombre legible. Ej: `'Red Nodexia'` |
| `descripcion` | TEXT | Descripción breve |
| `modulo` | TEXT | Agrupación: `'operaciones'`, `'analytics'`, `'general'` |
| `tipos_aplicables` | TEXT[] | Tipos de empresa donde aplica: `['planta','transporte']` |
| `activo` | BOOLEAN | Kill switch global |

### `funciones_empresa`
Qué features tiene habilitadas cada empresa.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `empresa_id` | UUID FK | Empresa |
| `funcion_id` | UUID FK | Feature |
| `habilitada` | BOOLEAN | Activada para esta empresa |
| `config` | JSONB | Configuración custom (futuro) |

UNIQUE: `(empresa_id, funcion_id)`

### `funciones_rol`
Overrides por rol. Si no hay registro, el rol hereda el estado de la empresa.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `empresa_id` | UUID FK | Empresa |
| `funcion_id` | UUID FK | Feature |
| `rol_interno` | TEXT | Rol: `'coordinador'`, `'chofer'`, etc. |
| `visible` | BOOLEAN | `false` = oculta para este rol |

UNIQUE: `(empresa_id, funcion_id, rol_interno)`

---

## Claves existentes (seed inicial)

| Clave | Nombre | Módulo | Aplica a | Activa |
|-------|--------|--------|----------|--------|
| `despachos` | Despachos | operaciones | planta, transporte | ✅ |
| `red_nodexia` | Red Nodexia | operaciones | planta, transporte | ✅ |
| `control_acceso` | Control de Acceso | operaciones | planta | ✅ |
| `documentacion` | Documentación | operaciones | planta, transporte | ✅ |
| `tracking_gps` | Tracking GPS | operaciones | transporte | ✅ |
| `incidencias` | Incidencias | operaciones | planta, transporte | ✅ |
| `estadisticas` | Estadísticas | analytics | planta, transporte | ✅ |
| `planificacion` | Planificación | operaciones | planta | ✅ |
| `unidades_operativas` | Unidades Operativas | operaciones | transporte | ✅ |
| `notificaciones` | Notificaciones | general | planta, transporte | ✅ |
| `flota` | Gestión de Flota | operaciones | transporte | ✅ |
| `reportes` | Reportes Gerenciales | analytics | planta, transporte | ❌ (futuro) |
| `turnos_recepcion` | Turnos de Recepción | operaciones | planta | ❌ (futuro) |
| `despachos_transporte` | Despachos desde Transporte | operaciones | transporte | ❌ (futuro) |

---

## Uso en código — Frontend

### Opción 1: Hook `useFeatureFlags()`

Para lógica condicional dentro de un componente:

```tsx
import { useFeatureFlags } from '@/lib/contexts/FeatureFlagContext';

function MiComponente() {
  const { hasFeature, loading } = useFeatureFlags();

  if (loading) return <Spinner />;

  return (
    <div>
      <h1>Dashboard</h1>

      {/* Mostrar botón solo si la empresa tiene Red Nodexia habilitada */}
      {hasFeature('red_nodexia') && (
        <button>Ver cargas en Red</button>
      )}

      {/* Mostrar sección solo si tiene tracking */}
      {hasFeature('tracking_gps') && (
        <TrackingMap />
      )}
    </div>
  );
}
```

### Opción 2: Componente `<FeatureGate>`

Para ocultar/mostrar secciones enteras sin lógica extra:

```tsx
import { FeatureGate } from '@/components/ui/FeatureGate';

function MiPagina() {
  return (
    <div>
      <h1>Panel de Transporte</h1>

      {/* Se muestra solo si la feature está habilitada */}
      <FeatureGate feature="tracking_gps">
        <TrackingFlotaContent />
      </FeatureGate>

      {/* Con fallback: si no tiene la feature, muestra mensaje */}
      <FeatureGate feature="reportes" fallback={<p>Contacte al admin para habilitar reportes</p>}>
        <ReportesPanel />
      </FeatureGate>
    </div>
  );
}
```

### ¿Cuándo usar cada uno?

| Situación | Usar |
|-----------|------|
| Ocultar un botón o enlace del menú | `hasFeature()` |
| Ocultar una sección entera | `<FeatureGate>` |
| Lógica compleja (si tiene X pero no Y) | `hasFeature()` |
| Mostrar mensaje alternativo al usuario | `<FeatureGate fallback={...}>` |

---

## Uso en código — Backend (API routes)

Las API routes **no** necesitan chequear feature flags. Las features controlan **visibilidad en UI**, no autorización. La autorización sigue siendo por roles vía `withAuth()`.

Si en el futuro se necesita bloquear una API según feature, se puede agregar un middleware, pero por ahora no es necesario.

---

## Agregar una nueva feature

### Paso 1: Insertar en la tabla

Crear una migración SQL:

```sql
INSERT INTO funciones_sistema (clave, nombre, descripcion, modulo, tipos_aplicables, activo)
VALUES ('mi_nueva_feature', 'Mi Nueva Feature', 'Descripción...', 'operaciones', ARRAY['planta','transporte'], false)
ON CONFLICT (clave) DO NOTHING;
```

- Ponerla en `activo = false` hasta que esté lista.
- Elegir `tipos_aplicables` según qué tipo de empresa puede usarla.

### Paso 2: Usar en código

```tsx
<FeatureGate feature="mi_nueva_feature">
  <MiNuevaFeatureContent />
</FeatureGate>
```

### Paso 3: Activar desde admin

1. Ir a `/admin/funciones` → Vista Global → Activar
2. Vista Por Empresa → Seleccionar empresa → Habilitar

---

## Panel de administración

**URL**: `/admin/funciones` (solo `admin_nodexia`)

### Vista Global
- Lista todas las features del sistema
- Toggle verde/rojo = kill switch global
- Si se apaga, NINGUNA empresa la ve

### Vista Por Empresa
1. Seleccionar empresa del dropdown
2. Toggle por feature: habilitar/deshabilitar para esa empresa
3. Badges de roles: click para ocultar la feature a roles específicos
   - Verde = visible para ese rol
   - Gris tachado = oculto para ese rol

---

## RLS (Row Level Security)

- `funciones_sistema`: cualquier usuario autenticado puede leer, solo `admin_nodexia` puede modificar
- `funciones_empresa`: miembros de la empresa pueden leer su config, solo `admin_nodexia` modifica
- `funciones_rol`: igual que empresa

---

## Notas importantes

1. **No se requiere habilitar features para admin_nodexia** — el admin siempre ve todas las features activas globalmente.
2. **El modelo es opt-in por empresa** — si no hay registro en `funciones_empresa`, la feature NO está habilitada. Hay que activarla explícitamente.
3. **El modelo es opt-out por rol** — si no hay registro en `funciones_rol`, el rol SÍ ve la feature. Solo se crea registro para ocultar.
4. **El `FeatureFlagProvider` carga las features una sola vez** al montar el componente. Si se cambian features en admin, el usuario necesita recargar la página (o llamar `refreshFeatures()`).
5. **Audit log**: todas las acciones de toggle quedan registradas en `audit_log`.
