# Problemas Conocidos y Soluciones

> **Total de problemas:** 26 (TypeScript) + ~5 (Funcionales)  
> **Última revisión:** 05 de Febrero de 2026  
> **Prioridad:** 🔴 Alta | 🟡 Media | 🟢 Baja

---

## 📊 Resumen por Categoría

| Categoría | Cantidad | Prioridad | Estado |
|-----------|----------|-----------|--------|
| Errores TypeScript | 26 | 🟡 Media | En progreso |
| Variables no usadas | ~10 | 🟢 Baja | Refactorización |
| Imports faltantes (firebase) | 2 | 🟢 Baja | No crítico |
| APIs no usadas | 3 | 🟢 Baja | Limpieza |

---

## ✅ PROBLEMAS RESUELTOS

### ~~5. Nomenclatura inconsistente en Base de Datos~~ ✅ RESUELTO (05-Feb-2026)
**Problema:** Convención mezclada entre `id_chofer` vs `chofer_id` causaba que pantallas mostraran "Sin asignar" en lugar de datos reales
**Impacto:** 🔴 Crítico - Datos de choferes, camiones y acoplados no se mostraban en múltiples pantallas

**Causa raíz:**  
- BD usaba convención `chofer_id`, `camion_id`, `acoplado_id` (correcta)
- Código viejo usaba `id_chofer`, `id_camion`, `id_acoplado` (incorrecta)
- Inconsistencia rompía queries y tipos TypeScript

**Solución aplicada:**
1. **Migración completa de nomenclatura** en 7 archivos:
   - `types/red-nodexia.ts` - Tipos corregidos
   - `types/missing-types.ts` - Interface Viaje actualizada  
   - `lib/hooks/useRedNodexia.tsx` - Query de camiones
   - `pages/transporte/cargas-en-red.tsx` - Validación de recursos
   - `pages/crear-despacho.tsx` - Select y verificaciones
   - `pages/chofer/viajes.tsx` - Comentario actualizado
   - `components/Transporte/AceptarDespachoModal.tsx` - Queries de asignación

2. **Scripts SQL de migración completa**:
   - Views temporales para compatibilidad durante migración
   - Migración de datos históricos tracking_gps → ubicaciones_choferes  
   - Fix estados faltantes en estado_unidad_viaje
   - Scripts de rollback para emergencias

3. **Documentación completa**:
   - `docs/PLAN-MIGRACION-BD.md` - Estrategia detallada
   - `sql/migracion/` - 6 scripts SQL organizados por fases

**Resultado:**
- ✅ Nomenclatura 100% unificada: `chofer_id`, `camion_id`, `acoplado_id`
- ✅ Todas las pantallas muestran datos correctamente
- ✅ 0 referencias a convención vieja en código TypeScript
- ✅ Sistema GPS consolidado en tabla única

**Archivos modificados:** 7 archivos TS + 6 scripts SQL + documentación

### ~~4. Viajes activos marcados como "expirados" incorrectamente~~ ✅ RESUELTO (04-Feb-2026)
**Problema:** Viajes con recursos asignados y en curso (ej: DSP-20260203-001) se marcaban como "expirados" y se ocultaban del tracking
**Impacto:** 🔴 Crítico - No se podía hacer seguimiento de viajes en curso

**Causa raíz:**  
- El sistema no diferenciaba entre:
  - Viajes **expirados** (sin recursos asignados)
  - Viajes **demorados** (con recursos pero fuera de horario)
- Función SQL `actualizar_estados_viajes()` marcaba ambos como "expirado"

**Solución aplicada:**
1. **Nuevo sistema de estados operativos** (`lib/estadosHelper.ts`):
   - ✅ **ACTIVO**: En curso dentro de ventana de 2h
   - ⏰ **DEMORADO**: Con recursos pero fuera de ventana (>2h)
   - ❌ **EXPIRADO**: Sin recursos y fuera de ventana

2. **Visualización mejorada**:
   - Badge naranja "⏰ DEMORADO" en tarjetas
   - Ícono flotante de reloj en esquina superior derecha
   - Métricas separadas en dashboard

3. **Nuevo tab "Demorados"** en crear-despacho.tsx:
   - Separa viajes con recursos tarde de viajes sin recursos
   - Facilita gestión operativa diferenciada

**Archivos modificados:**
- `lib/estadosHelper.ts` (nuevo - 398 líneas)
- `pages/planificacion.tsx`
- `components/Planning/PlanningGrid.tsx`
- `pages/crear-despacho.tsx`

**Resultado:**
- ✅ Viajes demorados visibles en tracking
- ✅ Diferenciación clara entre demorados y expirados
- ✅ Mejor toma de decisiones operativas

**Fecha:** 04-Feb-2026  
**Sesión:** SESION-04-FEB-2026

---

### ~~0. UUIDs Corruptos en viajes_despacho~~ ✅ RESUELTO (29-Dic-2025)
**Estado anterior:** UUIDs con 37 caracteres causaban fallos en relaciones  
**Verificación:** Análisis SQL confirmó que TODOS los UUIDs son válidos (36 chars)  
**Solución aplicada:** 
- Removido workaround RPC `get_viaje_con_detalles`
- Migrado a relaciones nativas de Supabase
- Código simplificado en `pages/control-acceso.tsx`

**Commit:** `35fdd12` - refactor(control-acceso): Usar relaciones nativas de Supabase

---

### ~~1. Errores TypeScript de configuración~~ ✅ RESUELTO
**Problema:** Project references en tsconfig.json causaban errores  
**Solución:** Simplificado tsconfig.json, removidos project references  
**Resultado:** Reducción de 68 → 32 errores TypeScript (53% de mejora)

**Commit:** `ac88b53` - fix(typescript): Resolver errores de tipos y configuración

---

### ~~2. Estados incorrectos en Control de Acceso~~ ✅ RESUELTO
**Problema:** Estados que no existen en `EstadoUnidadViaje`  
**Solución aplicada:**
- `egreso_planta` → `saliendo_origen`
- `egreso_destino` → `descarga_completada`
- `llamado_descarga` → `llamado_carga`
- `arribo_origen` → `arribado_origen`
- `cargado` → `carga_completada`

---

### ~~3. Type guards con rol inválido~~ ✅ RESUELTO
**Problema:** `'visor'` no existe en tipo `UserRole`  
**Solución:** Removido de `lib/type-guards.ts`

---

## 🔴 Problemas Críticos Restantes

### 1. **TrackingView - Errores de tipos** - `components/Planning/TrackingView.tsx`
</AdminLayout>

// ✅ SOLUCIÓN
<AdminLayout pageTitle="Dashboard Transporte">
  {children}
</AdminLayout>
```

**Impacto:** Error de tipos, pero no bloquea runtime.

**Fix rápido:**
```typescript
// pages/transporte/dashboard.tsx
<AdminLayout pageTitle="Dashboard de Transporte">
  {loading ? (
    <div>Cargando...</div>
  ) : (
    // ... contenido
  )}
</AdminLayout>
```

---

## 🟡 Problemas de Tipos (Medium Priority)

### 3. **Propiedades de arrays tratadas como objetos**

**Archivos afectados:**
- `crear-despacho.tsx` (líneas 403, 404, 422, 458, 462, 488, 501, 525)
- `MapaFlota.tsx` (líneas 122, 123)
- `ViajeDetalleModal.tsx` (líneas 155-171)

**Problema:**
```typescript
// ❌ INCORRECTO
const tiposEmpresa = userEmpresas.map(rel => rel.empresas?.tipo_empresa);
// rel.empresas es array[], no objeto

// ✅ CORRECTO
const tiposEmpresa = userEmpresas.map(rel => 
  rel.empresas?.[0]?.tipo_empresa  // Acceso al primer elemento
);
```

**Solución general:**
```typescript
// Pattern correcto para relaciones en Supabase:
// Si la relación es 1:N → .empresas es array
// Si usaste .single() → .empresas es objeto

// Para arrays:
despacho.empresas?.[0]?.nombre

// Para objetos (con .single()):
despacho.empresa?.nombre
```

---

### 4. **Optional chaining necesario**

**Archivos afectados:**
- `ViajesAsignados.tsx` (líneas 89, 90)
- `ViajeDetalleModal.tsx` (líneas 211, 234)
- `crear-despacho.tsx` (línea 561, 1004, 1510)

**Problema:**
```typescript
// ❌ estadoConfig puede ser undefined
<span>{estadoConfig.label}</span>

// ✅ Con optional chaining
<span>{estadoConfig?.label || 'Sin estado'}</span>
```

**Fix:**
```typescript
// ViajesAsignados.tsx línea 89-90
const estadoConfig = ESTADOS.find(e => e.value === viaje.estado);
<span className={`text-xs px-2 py-1 rounded ${estadoConfig?.bgColor} text-white`}>
  {estadoConfig?.label || viaje.estado}
</span>

// ViajeDetalleModal.tsx línea 211
if (!confirm(`¿Confirmas cambiar el estado a "${ESTADOS[nuevoEstadoIndex]?.label}"?`)) {
  return;
}
```

---

### 5. **Tipo incompatible con exactOptionalPropertyTypes**

**Archivos afectados:**
- `MapaFlota.tsx` (línea 112)
- `ViajeDetalleModal.tsx` (línea 152)

**Problema:**
```typescript
// ❌ TypeScript strict mode rechaza { chofer: {...} | undefined }
camionesConUbicacion.push({
  ...camion,
  chofer: choferData || undefined  // ❌ No permite undefined explícito
});

// ✅ Solución: No incluir propiedad si es undefined
const camionConUbicacion = {
  ...camion,
  ubicacion: {...},
  viaje_actual: {...}
};

if (choferData) {
  camionConUbicacion.chofer = choferData;
}

camionesConUbicacion.push(camionConUbicacion);
```

---

## 🟢 Problemas Menores (Refactorización)

### 6. **Variables declaradas pero no usadas**

**Total:** ~25 instancias

**Archivos principales:**
- `useSearch.ts` → `useEffect` no usado
- `crear-despacho.tsx` → múltiples variables (plantas, clientes, transportes, etc.)
- `AssignTransportModal.tsx` → `Input` importado pero no usado
- `MapaFlota.tsx` → `dynamic` importado pero no usado
- `ViajeDetalleModal.tsx` → `getEstadoInfo` declarado pero no usado

**Solución general:**
```typescript
// Opción A: Eliminar variables no usadas
// const [plantas, setPlantas] = useState<EmpresaOption[]>([]);  // ❌ Eliminar

// Opción B: Comentar si se usarán en el futuro
// const [plantas, setPlantas] = useState<EmpresaOption[]>([]);  // TODO: Implementar filtro

// Opción C: Prefijo underscore para ignorar
const [_plantas, setPlantas] = useState<EmpresaOption[]>([]);
```

**Lista completa de variables no usadas:**

```typescript
// lib/hooks/useSearch.ts
- useEffect (importado pero no usado)

// pages/crear-despacho.tsx
- AutocompleteField (componente no usado)
- UbicacionAutocomplete (tipo no usado)
- plantas, clientes, transportes (estados no usados)
- loadingOptions (estado no usado)
- debugError (línea 247)
- despachosDeleted (línea 689)
- originalIndex (línea 908)
- handleCleanupDemo (función no usada)

// components/Modals/AssignTransportModal.tsx
- Input (componente no usado)

// components/Transporte/MapaFlota.tsx
- dynamic (Next.js importado pero no usado)

// components/Transporte/ViajeDetalleModal.tsx
- getEstadoInfo (función declarada pero no usada)
```

---

### 7. **console.log en producción**

**Archivo:** `AssignTransportModal.tsx` (línea 417)
```typescript
// ❌ Console.log en JSX
{console.log('🔘 Button render - selectedTransport:', selectedTransport)}

// ✅ Eliminar o mover fuera del JSX
```

**Fix:**
```typescript
// Si es necesario para debugging, usar useEffect
useEffect(() => {
  console.log('🔘 Button state:', { selectedTransport, loading });
}, [selectedTransport, loading]);

// Mejor: Eliminar por completo en producción
```

---

### 8. **useEffect sin retorno de cleanup**

**Archivo:** `MapaFlota.tsx` (línea 67)
```typescript
// ⚠️ Warning: Not all code paths return a value
useEffect(() => {
  if (!mounted) return;
  
  fetchCamiones();
  const interval = setInterval(fetchCamiones, 30000);
  
  return () => clearInterval(interval);  // ✅ Asegurar que TODOS los paths retornen
}, [empresaId, mounted]);
```

**Fix:**
```typescript
useEffect(() => {
  if (!mounted) {
    return undefined;  // ✅ Retorno explícito
  }
  
  fetchCamiones();
  const interval = setInterval(fetchCamiones, 30000);
  
  return () => clearInterval(interval);
}, [empresaId, mounted]);
```

---

### 9. **Object.possibly undefined sin verificación**

**Archivo:** `PlanningGrid.tsx` (línea 147)
```typescript
// ❌ groupedDispatches[day] puede no existir
groupedDispatches[dispatchDayName][timeSlot] = [];

// ✅ Verificar antes de asignar
if (!groupedDispatches[dispatchDayName]) {
  groupedDispatches[dispatchDayName] = {};
}
groupedDispatches[dispatchDayName][timeSlot] = [];
```

---

## 🛠️ Plan de Acción Recomendado

### Prioridad 1 (Esta semana)
- [ ] Crear o eliminar `TrackingView` component
- [ ] Agregar `pageTitle` a `AdminLayout` en transporte/dashboard.tsx
- [ ] Fix array access en queries de Supabase (userEmpresas, despachos)

### Prioridad 2 (Próxima semana)
- [ ] Agregar optional chaining donde falte (?.label, ?.[0], etc.)
- [ ] Fix tipos con exactOptionalPropertyTypes (MapaFlota, ViajeDetalleModal)
- [ ] Limpiar console.log en AssignTransportModal

### Prioridad 3 (Refactorización)
- [ ] Eliminar variables no usadas (~25)
- [ ] Agregar tipos más estrictos donde sea posible
- [ ] Documentar comportamiento esperado de arrays vs objetos

---

## 📝 Notas de TypeScript Strict Mode

El proyecto tiene configurado `exactOptionalPropertyTypes: true` en `tsconfig.json`, lo que significa:

```typescript
// ❌ NO permitido
interface User {
  name?: string;
}
const user: User = { name: undefined };  // Error!

// ✅ Permitido
const user: User = {};  // OK
const user: User = { name: "John" };  // OK
```

**Implicaciones:**
- No se puede asignar `undefined` explícitamente a propiedades opcionales
- Usar pattern: agregar propiedad solo si existe valor
- Alternativa: cambiar `name?: string` a `name: string | undefined`

---

## 🧪 Comandos de Testing

```bash
# Ver todos los errores de TypeScript
npm run build

# Ver solo warnings
npm run lint

# Fix automático de algunos problemas
npm run lint -- --fix

# Verificar tipos sin compilar
npx tsc --noEmit
```

---

## 🔗 Referencias

- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [Optional Chaining (?.)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining)
- [Nullish Coalescing (??)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing)
- [Supabase Type Generation](https://supabase.com/docs/guides/api/generating-types)

---

**Última actualización:** 29 de Octubre de 2025  
**Autor:** Sesión de desarrollo + IA  
**Estado:** Documentación completa
