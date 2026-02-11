# Sistema de Ubicaciones para Control de Acceso
**Fecha:** 2026-02-03  
**Estado:** ✅ Implementado - Pendiente Testing

---

## 📋 Problema Resuelto

### Root Cause Identificado
- **Error:** "Este despacho no corresponde a esta planta (origen/destino)"
- **Causa:** Validación comparaba `empresaId` (UUID) con `despacho.origen` (TEXT nombre)
- **Impacto:** Control de Acceso no podía validar ningún despacho

### Arquitectura Requerida
- **Multi-tenant B2B:** Empresa A → Empresa B (ambas ven mismo despacho)
- **Intra-empresa:** Empresa A Dep1 → Empresa A Dep2 (mismo CUIT, distintas ubicaciones)
- **Coordinadores:** Ven todos los despachos de su empresa (todas las ubicaciones)
- **Control de Acceso:** Solo ven despachos de su ubicación específica

---

## ✅ Componentes Implementados

### 1. SQL Migrations

#### `sql/migrations/040_ubicacion_usuario_control_acceso.sql`
```sql
ALTER TABLE usuarios_empresa 
ADD COLUMN ubicacion_actual_id UUID REFERENCES ubicaciones(id);
```
- **Propósito:** Asignar ubicación específica a usuarios de Control de Acceso
- **Comportamiento:**
  - `NULL` para coordinadores → ven toda la empresa
  - `NOT NULL` para control_acceso → ven solo su ubicación

#### `sql/migrations/041_despachos_ubicacion_ids.sql`
```sql
ALTER TABLE despachos 
ADD COLUMN origen_ubicacion_id UUID,
ADD COLUMN destino_ubicacion_id UUID;

UPDATE despachos SET origen_ubicacion_id = (
  SELECT id FROM ubicaciones WHERE nombre ILIKE '%' || origen || '%'
);
```
- **Propósito:** Migrar de TEXT a UUID references
- **Estrategia:** Fuzzy matching con `ILIKE`
- **Nota:** NO elimina columnas `origen/destino` TEXT (migración gradual)

#### `sql/migrations/042_poblar_empresa_id_ubicaciones.sql`
```sql
UPDATE ubicaciones u SET empresa_id = (
  SELECT e.id FROM empresas e WHERE e.cuit = u.cuit
)
WHERE u.empresa_id IS NULL AND u.cuit IS NOT NULL;
```
- **Propósito:** Poblar `empresa_id` en ubicaciones usando CUIT
- **Crítico:** Sin esto, el filtro por empresa no funciona

### 2. React Hook

#### `lib/hooks/useUbicacionActual.ts`
**Exports:**
```typescript
{
  ubicacionActualId: string | null;
  ubicacionActual: Ubicacion | null;
  ubicacionesDisponibles: Ubicacion[];
  setUbicacionActualId: (id: string) => Promise<void>;
  requiereUbicacion: boolean;
}
```

**Funcionalidad:**
- Carga `ubicacion_actual_id` desde `usuarios_empresa`
- Filtra ubicaciones por `empresa_id` del usuario
- Persiste cambios en localStorage + Supabase
- Flag `requiereUbicacion` para mostrar modal si falta selección

### 3. UI Components

#### `components/ControlAcceso/UbicacionSelector.tsx`
- Dropdown en navbar (Headless UI Menu)
- Muestra ubicación actual o "Seleccionar ubicación"
- Lista todas las ubicaciones disponibles
- CheckIcon en la seleccionada

#### `components/ControlAcceso/ModalSeleccionarUbicacion.tsx`
- Modal **obligatorio** primera vez
- No puede cerrarse sin seleccionar
- Muestra: nombre, tipo, CUIT de cada ubicación
- Se activa cuando `requiereUbicacion === true`

### 4. Integración en Páginas

#### `pages/control-acceso.tsx` (Actualizado)
```typescript
const { ubicacionActualId, ubicacionActual, requiereUbicacion } = useUbicacionActual();

// Modal obligatorio si no tiene ubicación
if (requiereUbicacion) {
  return <ModalSeleccionarUbicacion />;
}

// Validación por ubicación (UUID)
const tieneAcceso = (
  ubicacionActualId === despacho.origen_ubicacion_id ||
  ubicacionActualId === despacho.destino_ubicacion_id
);

// Auto-detección tipo operación
const tipoOp = ubicacionActualId === despacho.origen_ubicacion_id 
  ? 'envio' 
  : 'recepcion';
```

**Cambios clave:**
- ✅ Importa `useUbicacionActual` y `ModalSeleccionarUbicacion`
- ✅ Muestra modal si `requiereUbicacion === true`
- ✅ Valida acceso con UUIDs (`origen_ubicacion_id`, `destino_ubicacion_id`)
- ✅ Fallback para despachos legacy (busca por nombre TEXT)
- ✅ Auto-detecta tipo operación correctamente

#### `components/layout/Header.tsx` (Actualizado)
```typescript
import { useUserRole } from '../../lib/contexts/UserRoleContext';
import UbicacionSelector from '../ControlAcceso/UbicacionSelector';

const Header = ({ ... }) => {
  const { role } = useUserRole();
  
  return (
    <header>
      <NotificationBell />
      {role === 'control_acceso' && <UbicacionSelector />}
      <UserProfile />
    </header>
  );
};
```

**Cambios clave:**
- ✅ Selector solo visible para `role === 'control_acceso'`
- ✅ Posicionado entre notificaciones y perfil de usuario

---

## 🚀 Próximos Pasos (Testing)

### 1. Ejecutar Migraciones en Supabase

**Orden de ejecución:**
```sql
-- Paso 1: Agregar campo ubicacion_actual_id
\i sql/migrations/040_ubicacion_usuario_control_acceso.sql

-- Paso 2: Poblar empresa_id en ubicaciones
\i sql/migrations/042_poblar_empresa_id_ubicaciones.sql

-- Paso 3: Migrar despachos a UUID
\i sql/migrations/041_despachos_ubicacion_ids.sql
```

**⚠️ IMPORTANTE:** Ejecutar 042 ANTES de 041 porque:
- 041 depende de que ubicaciones tengan `empresa_id` poblado
- Si no, el filtro por empresa no funcionará

**Verificación post-migración:**
```sql
-- Verificar ubicaciones
SELECT COUNT(*), COUNT(empresa_id) FROM ubicaciones;

-- Verificar despachos migrados
SELECT 
  COUNT(*) as total,
  COUNT(origen_ubicacion_id) as con_origen_uuid,
  COUNT(destino_ubicacion_id) as con_destino_uuid
FROM despachos;

-- Identificar despachos fallidos
SELECT pedido_id, origen, destino 
FROM despachos 
WHERE origen_ubicacion_id IS NULL OR destino_ubicacion_id IS NULL;
```

### 2. Asignar Ubicación a Usuario de Testing

**Opción A - SQL directo:**
```sql
UPDATE usuarios_empresa
SET ubicacion_actual_id = (
  SELECT id FROM ubicaciones 
  WHERE nombre ILIKE '%nombre_planta%' 
  LIMIT 1
)
WHERE user_id = 'tu-user-uuid'
  AND empresa_id = 'tu-empresa-uuid';
```

**Opción B - Via UI:**
1. Login como usuario Control de Acceso
2. Modal automático se muestra
3. Seleccionar ubicación de la lista
4. Confirmar selección

### 3. Probar Flujo Completo

#### Test Case 1: Primera vez (Modal obligatorio)
```
1. Login con usuario control_acceso sin ubicacion_actual_id
2. ✅ Debe mostrar ModalSeleccionarUbicacion (no puede cerrase)
3. Seleccionar ubicación "Aceitera San Miguel - Planta Central"
4. ✅ Modal cierra, aparece selector en navbar
5. ✅ Página control-acceso se carga normalmente
```

#### Test Case 2: Escanear Despacho con Acceso
```
1. User en ubicación "Aceitera - Planta Central" (id: xxx)
2. Despacho DSP-20260203-001 tiene origen_ubicacion_id = xxx
3. Escanear QR de ese despacho
4. ✅ Debe permitir acceso (origen === ubicacionActualId)
5. ✅ Tipo operación detectado: "envio" (es el origen)
6. ✅ Botones habilitados: "Confirmar Ingreso" o "Confirmar Egreso"
```

#### Test Case 3: Escanear Despacho SIN Acceso
```
1. User en ubicación "Aceitera - Planta Central" (id: xxx)
2. Despacho DSP-20260203-002 tiene origen_ubicacion_id = yyy, destino = zzz
3. Escanear QR de ese despacho
4. ✅ Debe rechazar: "Este despacho no corresponde a su ubicación"
5. ✅ No muestra información del viaje
```

#### Test Case 4: Cambiar Ubicación
```
1. User en ubicación A, selector muestra "Planta Central"
2. Click en selector → dropdown muestra todas las ubicaciones
3. Seleccionar "Depósito Norte"
4. ✅ Selector actualiza a "Depósito Norte"
5. ✅ localStorage actualizado
6. ✅ BD actualizada (usuarios_empresa.ubicacion_actual_id)
7. Recargar página → ✅ mantiene "Depósito Norte"
```

#### Test Case 5: Coordinador (sin ubicación)
```
1. Login como coordinador (ubicacion_actual_id = NULL)
2. ✅ NO muestra modal obligatorio
3. ✅ NO muestra selector en navbar
4. Ir a grilla planificación
5. ✅ Ve TODOS los despachos de la empresa
```

### 4. Verificar Estados y Transiciones

```
Flujo Envío (origen):
  en_transito_origen → Ingreso → ingresado_origen
  ingresado_origen → Egreso → egreso_origen
  egreso_origen → (chofer confirma) → en_transito_destino

Flujo Recepción (destino):
  en_transito_destino → Ingreso → ingresado_destino
  ingresado_destino → Egreso → vacio
  vacio → (retorna) → en_transito_origen
```

**Comandos útiles:**
```sql
-- Ver todas las transiciones de un viaje
SELECT 
  id, 
  estado_unidad, 
  estado_carga,
  created_at
FROM viajes_despacho 
WHERE numero_viaje = 'VJ-xxx'
ORDER BY created_at DESC;
```

---

## 📝 Notas de Implementación

### Migración Gradual (Fases)
```
Fase 1 (ACTUAL): ✅ Completada
  - Agregar columnas UUID (origen_ubicacion_id, destino_ubicacion_id)
  - Migrar datos existentes con fuzzy matching
  - Mantener columnas TEXT (origen, destino)
  - Código usa UUID con fallback a TEXT

Fase 2 (Futuro):
  - Actualizar formulario crear-despacho
  - Usar <select> de ubicaciones en lugar de input text
  - Nuevos despachos solo usan UUID

Fase 3 (Limpieza):
  - ALTER TABLE despachos ALTER COLUMN origen_ubicacion_id SET NOT NULL
  - ALTER TABLE despachos ALTER COLUMN destino_ubicacion_id SET NOT NULL
  - DROP COLUMN origen, DROP COLUMN destino (TEXT)
```

### Compatibilidad con Despachos Legacy
El código actual soporta ambos formatos:
```typescript
// Intenta usar UUID primero
let origenId = despacho.origen_ubicacion_id;
let destinoId = despacho.destino_ubicacion_id;

// Fallback a búsqueda por nombre TEXT
if (!origenId || !destinoId) {
  const ubicaciones = await supabase
    .from('ubicaciones')
    .select('id, nombre')
    .or(`nombre.ilike.%${despacho.origen}%,nombre.ilike.%${despacho.destino}%`);
  
  // Match por nombre
  origenId = ubicaciones.find(u => u.nombre.includes(despacho.origen))?.id;
  destinoId = ubicaciones.find(u => u.nombre.includes(despacho.destino))?.id;
}
```

### Consideraciones de Rendimiento
- `idx_usuarios_empresa_ubicacion` creado en migration 040
- `idx_despachos_origen_ubicacion`, `idx_despachos_destino_ubicacion` en 041
- Hook usa `localStorage` para evitar queries repetitivas
- Filtro de ubicaciones en frontend (bajo volumen esperado)

---

## 🔍 Troubleshooting

### Error: "No se encontró la ubicación"
**Causa:** `empresa_id` no poblado en ubicaciones  
**Solución:**
```sql
SELECT * FROM ubicaciones WHERE empresa_id IS NULL;
-- Si hay resultados, ejecutar migration 042
\i sql/migrations/042_poblar_empresa_id_ubicaciones.sql
```

### Error: "Este despacho no corresponde a su ubicación"
**Diagnóstico:**
```sql
-- Ver despacho
SELECT 
  pedido_id, 
  origen, 
  destino,
  origen_ubicacion_id, 
  destino_ubicacion_id 
FROM despachos 
WHERE pedido_id = 'DSP-xxx';

-- Ver ubicación de usuario
SELECT 
  u.email,
  ue.ubicacion_actual_id,
  ub.nombre as ubicacion_nombre
FROM users u
JOIN usuarios_empresa ue ON u.id = ue.user_id
LEFT JOIN ubicaciones ub ON ue.ubicacion_actual_id = ub.id
WHERE u.email = 'usuario@ejemplo.com';
```

**Posibles causas:**
1. Migración 041 falló → `origen_ubicacion_id` o `destino_ubicacion_id` NULL
2. Usuario no tiene `ubicacion_actual_id` asignado
3. UUIDs no coinciden (despacho pasa por otra planta)

### Modal no se muestra/no se cierra
**Verificar:**
```typescript
// En chrome devtools console:
localStorage.getItem('ubicacion_actual_id')
```
- Si hay valor → Modal no debería mostrarse
- Si es `null` → Modal debe ser obligatorio

**Forzar reset:**
```typescript
localStorage.removeItem('ubicacion_actual_id');
// Recargar página
```

### Selector no aparece en navbar
**Verificar rol:**
```sql
SELECT u.email, ue.role 
FROM users u
JOIN usuarios_empresa ue ON u.id = ue.user_id
WHERE u.email = 'tu-email';
```
- Selector SOLO aparece si `role = 'control_acceso'`
- Coordinadores NO ven el selector

---

## 📊 Queries de Monitoreo

### Dashboard de Ubicaciones
```sql
-- Ubicaciones por empresa
SELECT 
  e.nombre as empresa,
  COUNT(u.id) as total_ubicaciones,
  COUNT(CASE WHEN u.tipo = 'planta' THEN 1 END) as plantas,
  COUNT(CASE WHEN u.tipo = 'deposito' THEN 1 END) as depositos,
  COUNT(CASE WHEN u.tipo = 'puerto' THEN 1 END) as puertos
FROM empresas e
LEFT JOIN ubicaciones u ON e.id = u.empresa_id
GROUP BY e.id, e.nombre
ORDER BY total_ubicaciones DESC;
```

### Usuarios por Ubicación
```sql
-- Cuántos usuarios hay en cada ubicación
SELECT 
  ub.nombre as ubicacion,
  e.nombre as empresa,
  COUNT(ue.user_id) as total_usuarios,
  STRING_AGG(u.email, ', ') as usuarios
FROM ubicaciones ub
LEFT JOIN usuarios_empresa ue ON ub.id = ue.ubicacion_actual_id
LEFT JOIN users u ON ue.user_id = u.id
LEFT JOIN empresas e ON ub.empresa_id = e.id
GROUP BY ub.id, ub.nombre, e.nombre
ORDER BY total_usuarios DESC;
```

### Despachos por Ubicación
```sql
-- Actividad por ubicación (últimos 30 días)
SELECT 
  ub.nombre as ubicacion,
  COUNT(DISTINCT CASE WHEN d.origen_ubicacion_id = ub.id THEN d.id END) as despachos_origen,
  COUNT(DISTINCT CASE WHEN d.destino_ubicacion_id = ub.id THEN d.id END) as despachos_destino,
  COUNT(DISTINCT d.id) as total
FROM ubicaciones ub
LEFT JOIN despachos d ON (
  d.origen_ubicacion_id = ub.id OR 
  d.destino_ubicacion_id = ub.id
)
WHERE d.created_at >= NOW() - INTERVAL '30 days'
GROUP BY ub.id, ub.nombre
ORDER BY total DESC;
```

---

## ✅ Checklist Pre-Deploy

- [ ] Migration 042 ejecutada (poblar empresa_id)
- [ ] Migration 040 ejecutada (ubicacion_actual_id)
- [ ] Migration 041 ejecutada (UUID en despachos)
- [ ] Verificar: `SELECT COUNT(*) FROM despachos WHERE origen_ubicacion_id IS NULL`
- [ ] Usuario de testing tiene ubicacion_actual_id asignado
- [ ] Modal obligatorio funciona (testing con usuario limpio)
- [ ] Selector visible solo para control_acceso
- [ ] Escaneo QR funciona con validación UUID
- [ ] Auto-detección tipo_operacion correcta (envio vs recepcion)
- [ ] Transiciones de estado funcionan (ingreso/egreso)
- [ ] localStorage persiste ubicación entre recargas
- [ ] Coordinadores ven todos los despachos (ubicacion_actual_id = NULL)

---

## 🎯 Resultado Esperado

### Control de Acceso (Usuario Normal)
1. Login → Modal obligatorio si es primera vez
2. Selecciona ubicación → Modal cierra, selector aparece
3. Navbar muestra: `[📍 Planta Central ▼]`
4. Escanea QR → Validación por UUID location match
5. Si tiene acceso → Muestra viaje + botones acción
6. Puede cambiar ubicación desde selector navbar

### Coordinador (Usuario Admin)
1. Login → Sin modal
2. Navbar → Sin selector ubicación
3. Ve TODOS los despachos de la empresa
4. Puede crear despachos para cualquier ubicación

### Multi-tenant B2B (Escenario Real)
```
Aceitera SAM → Tecnopack SRL

Despacho DSP-001:
  origen_ubicacion_id: "uuid-aceitera-planta-central"
  destino_ubicacion_id: "uuid-tecnopack-deposito-norte"

User 1 (Aceitera, Control de Acceso):
  ubicacion_actual_id: "uuid-aceitera-planta-central"
  → Ve DSP-001 como "ENVÍO" (origen match)
  → Acciones: Ingreso camión → Carga → Egreso

User 2 (Tecnopack, Control de Acceso):
  ubicacion_actual_id: "uuid-tecnopack-deposito-norte"
  → Ve DSP-001 como "RECEPCIÓN" (destino match)
  → Acciones: Ingreso camión → Descarga → Egreso
```

---

**Implementado por:** GitHub Copilot  
**Revisión requerida:** Testing en Supabase staging  
**Bloqueadores conocidos:** Ninguno (solo pendiente ejecución SQL)
