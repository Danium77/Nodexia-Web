# Estado Actual - Sistema de Transporte
**Fecha:** 2 de noviembre de 2025

## ✅ Funcionalidades Completadas

### 1. Gestión de Choferes
- ✅ Creación de choferes sin error de `empresa_id`
- ✅ Hook `useChoferes.tsx` actualizado correctamente
- ✅ Chofer de prueba creado: **Walter Zayas** (DNI: 30123456)

### 2. Gestión de Flota
- ✅ `FlotaGestion.tsx` actualizado para usar `user.id` correcto
- ✅ Camiones y acoplados se crean con `id_transporte` válido
- ✅ Script SQL para corregir datos existentes: `sql/fix-flota-id-transporte.sql`
- ✅ 2 camiones y 1 acoplado asignados correctamente a Logística Express

### 3. Despachos Ofrecidos
- ✅ Página refactorizada para cargar viajes desde `viajes_despacho`
- ✅ Query correcta trayendo 3 viajes del despacho DSP-20251030-001
- ✅ Badges visuales: "Sin Chofer", "Sin Camión"
- ✅ Interfaz actualizada con datos de choferes y camiones
- ✅ Carga separada de choferes/camiones para evitar errores de RLS

### 4. Modal de Asignación de Recursos
- ✅ `AceptarDespachoModal.tsx` corregido para usar schema real
- ✅ Consultas actualizadas: sin `empresa_id`, `disponible`, `estado`
- ✅ Interfaces alineadas con columnas reales de BD
- ✅ Estado cambiado a `'camion_asignado'` (valor válido)
- ✅ Actualización correcta del viaje usando `despacho.id`

### 5. Base de Datos
- ✅ Choferes: columnas correctas (id, nombre, apellido, telefono, email, id_transporte)
- ✅ Camiones: columnas correctas (id, patente, marca, modelo, anio, id_transporte)
- ✅ Acoplados: columnas correctas (id, patente, marca, modelo, anio, id_transporte)
- ✅ Estados válidos para `viajes_despacho` identificados

---

## ❌ Problema Crítico Pendiente

### Error de React: `insertBefore`

**Descripción:**
```
Error al ejecutar 'insertBefore' en 'Node': 
El nodo antes del cual se va a insertar el nuevo nodo no es hijo de este nodo.
```

**Cuándo ocurre:**
- Después de asignar chofer y camión exitosamente
- Durante el cierre del modal o la recarga de la página
- El error NO impide que los datos se guarden, pero rompe el flujo de UI

**Soluciones intentadas (TODAS FALLARON):**
1. ❌ Agregar `setTimeout` antes de cerrar modal
2. ❌ Cambiar a `window.location.reload()` inmediato
3. ❌ Mostrar pantalla de éxito antes de cerrar
4. ❌ Eliminar `onSuccess()` callback
5. ❌ Reload sin manipular estado de React
6. ❌ Aumentar z-index del modal

**Causa raíz probable:**
- Conflicto de hydration en Next.js 15.5.6 con React 19
- El modal se monta/desmonta mientras hay una actualización pendiente
- Posible incompatibilidad entre versiones de Next.js y React

**Datos importantes:**
- ✅ Los datos SÍ se guardan correctamente en la BD
- ✅ El chofer y camión SÍ quedan asignados al viaje
- ❌ La UI se rompe después de la asignación
- ❌ El usuario ve error en pantalla roja

---

## 🔧 Soluciones Propuestas (No Implementadas)

### Opción A: Downgrade de Next.js/React
```bash
pnpm add next@14.2.0 react@18.3.1 react-dom@18.3.1
```
- **Pro:** Versiones más estables
- **Contra:** Perder features de Next.js 15

### Opción B: Usar Router en lugar de Reload
```typescript
// En lugar de window.location.reload()
const router = useRouter();
router.replace(router.asPath);
```
- **Pro:** Más "React-way"
- **Contra:** Puede tener el mismo problema

### Opción C: Rediseñar flujo sin modal
- Usar página dedicada para asignación
- Evitar modales completamente
- **Pro:** Sin problemas de mounting/unmounting
- **Contra:** Cambio de UX significativo

### Opción D: Server Actions (Next.js 15)
```typescript
// Usar Server Actions en lugar de client-side mutations
'use server'
export async function asignarRecursos(viajeId, choferId, camionId) {
  // Actualizar en servidor
  // Revalidar ruta automáticamente
}
```
- **Pro:** Patrón recomendado en Next.js 15
- **Contra:** Requiere refactorización significativa

---

## 📊 Datos de Prueba Actuales

### Usuario Activo
- **Email:** `gonzalo@logisticaexpres.com`
- **Password:** `Tempicxmej9o!1862`
- **Empresa:** Logística Express SRL
- **ID Empresa:** `181d6a2b-cdc2-4a7a-8d2d-6ea1a7a3a9ed`

### Recursos Disponibles
- **Chofer:** Walter Zayas (DNI: 30123456)
- **Camiones:** 2 unidades (ABC123, DEF456)
- **Acoplados:** 1 unidad (DEF456)

### Viajes en Sistema
- **Despacho:** DSP-20251030-001
- **Cantidad de viajes:** 3
- **Estado actual:** `transporte_asignado`
- **Pendiente:** Asignar chofer y camión

---

## 📁 Archivos Modificados en Esta Sesión

### Componentes
```
components/Transporte/AceptarDespachoModal.tsx  ✏️ Schema alignment, estado válido
components/Transporte/ViajeDetalleModal.tsx     ✏️ z-index fix
components/Dashboard/FlotaGestion.tsx           ✏️ user.id correcto
```

### Páginas
```
pages/transporte/despachos-ofrecidos.tsx        ✏️ Query refactored, carga separada
```

### Hooks
```
lib/hooks/useChoferes.tsx                       ✏️ Removed empresa_id
```

### SQL
```
sql/fix-flota-id-transporte.sql                 ✨ Nuevo - Corregir id_transporte
```

### Documentación
```
.jary/CREDENCIALES-TEST.md                      ✨ Nuevo - Credenciales de prueba
```

---

## 🎯 Próximos Pasos Recomendados

### Prioridad Alta
1. **Resolver error de React `insertBefore`**
   - Considerar downgrade a Next.js 14 + React 18
   - O implementar Server Actions
   - O rediseñar sin modal

2. **Verificar que datos se muestran después de asignación**
   - Aunque hay error, verificar si badges aparecen al recargar manualmente
   - Confirmar que JOIN de choferes/camiones funciona

### Prioridad Media
3. **Agregar funcionalidad de rechazo de despachos**
4. **Implementar tracking GPS de choferes**
5. **Dashboard con métricas en tiempo real**

### Prioridad Baja
6. **Mejorar UX del modal** (si se mantiene)
7. **Agregar validaciones adicionales**
8. **Tests unitarios**

---

## 💡 Notas Técnicas

### Estados Válidos en `viajes_despacho`
```sql
'pendiente', 'transporte_asignado', 'camion_asignado', 'confirmado',
'en_transito', 'en_planta', 'esperando_carga', 'cargando',
'carga_completa', 'en_ruta', 'entregado', 'completado',
'cancelado', 'incidencia'
```

### Schema Real de Tablas
```typescript
// choferes
{ id, nombre, apellido, telefono, email, dni, id_transporte, fecha_alta, usuario_alta }

// camiones
{ id, patente, marca, modelo, anio, foto_url, id_transporte, fecha_alta, usuario_alta }

// acoplados  
{ id, patente, marca, modelo, anio, foto_url, id_transporte, fecha_alta, usuario_alta }
```

---

## 🔍 Debugging Info

### Para reproducir el problema:
1. Login como Gonzalo
2. Ir a "Despachos Ofrecidos"
3. Click en "Asignar Recursos" en cualquier viaje
4. Seleccionar Walter Zayas + cualquier camión
5. Click "Aceptar Despacho"
6. ❌ Aparece error de React

### URL del servidor:
```
http://localhost:3003/transporte/despachos-ofrecidos
```

### Versiones:
- Next.js: 15.5.6
- React: 19.2.0
- Supabase: Latest
- Node: (verificar con `node --version`)

---

**Última actualización:** 2 de noviembre de 2025
**Estado:** 🟡 Funcional con errores de UI
**Prioridad:** 🔴 Alta - Resolver error de React
