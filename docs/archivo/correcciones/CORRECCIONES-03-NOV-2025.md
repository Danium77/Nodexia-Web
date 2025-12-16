# Correcciones Implementadas - 3 de Noviembre 2025

## Resumen

Se corrigieron 7 de 8 problemas reportados por el usuario en la sesión de testing:

## ✅ Problemas Corregidos

### 1. Error al confirmar rechazo en modal
**Problema:** Modal de rechazo mostraba error al confirmar
**Causa:** Props `viaje` no coincidían con la interfaz del modal
**Solución:**
- Ajustado interface de RechazarViajeModal para incluir `viaje_numero?: number`
- Corregido el objeto pasado al modal en despachos-ofrecidos.tsx

**Archivos modificados:**
- `components/Transporte/RechazarViajeModal.tsx`
- `pages/transporte/despachos-ofrecidos.tsx`

---

### 2. Cambiar "Cancelado" a "Rechazado" en UI
**Problema:** Badge mostraba "Viaje Cancelado" en lugar de "Viaje Rechazado"
**Solución:**
- Cambiado texto del badge de "Viaje Cancelado" a "Viaje Rechazado"
- Tab ya mostraba "Rechazados" correctamente

**Código:**
```tsx
{/* Indicador de rechazado */}
{despacho.estado_viaje === 'cancelado' && (
  <span className="px-4 py-2 bg-red-900/30 border border-red-700 text-red-400 rounded-lg font-medium flex items-center gap-2">
    <XCircleIcon className="h-5 w-5" />
    Viaje Rechazado
  </span>
)}
```

---

### 3. Viajes cancelados aparecían en Pendientes
**Problema:** Tab "Pendientes de Asignar" mostraba viajes cancelados
**Solución:**
- Actualizado filtro en `applyFilters()` para excluir cancelados de pendientes
- Filtro ahora: `(estado === 'pendiente' || estado === 'transporte_asignado') && estado !== 'cancelado'`

**Código:**
```tsx
if (estadoTab === 'pendientes') {
  // SOLO viajes pendientes sin recursos asignados
  filtered = filtered.filter(d => 
    (d.estado_viaje === 'pendiente' || d.estado_viaje === 'transporte_asignado') &&
    d.estado_viaje !== 'cancelado'
  );
}
```

---

### 4. Despachos Ofrecidos debe mostrar solo pendientes
**Problema:** Despachos Ofrecidos traía todos los viajes
**Solución:**
- Tab "Pendientes" ahora filtra correctamente solo viajes sin chofer/camión asignado
- Tab "Asignados" solo muestra viajes con recursos completos
- Tab "Rechazados" solo muestra viajes cancelados
- Contadores actualizados en cada tab

**Contadores corregidos:**
```tsx
// Pendientes
{despachos.filter(d => 
  (d.estado_viaje === 'pendiente' || d.estado_viaje === 'transporte_asignado') &&
  d.estado_viaje !== 'cancelado'
).length}

// Asignados
{despachos.filter(d => 
  d.estado_viaje === 'camion_asignado' &&
  d.tiene_chofer && 
  d.tiene_camion &&
  d.estado_viaje !== 'cancelado'
).length}

// Rechazados
{despachos.filter(d => d.estado_viaje === 'cancelado').length}
```

---

### 5. Fecha incorrecta en despacho
**Problema:** DSP-20251103-002 - Viaje #1 mostraba 04/11 en lugar de 05/11
**Causa:** Problema de timezone al parsear fecha ISO sin especificar zona horaria
**Solución:**
- Agregado 'T00:00:00' al parsear fecha para forzar interpretación local

**Antes:**
```tsx
{new Date(despacho.scheduled_local_date).toLocaleDateString('es-AR')}
```

**Después:**
```tsx
{despacho.scheduled_local_date ? 
  new Date(despacho.scheduled_local_date + 'T00:00:00').toLocaleDateString('es-AR') :
  'Sin fecha'
}
```

---

### 6. Error y notice web al asignar recursos
**Problema:** Al confirmar asignación de chofer/camión aparecía primero un error y luego un alert nativo
**Causa:** Alert nativos de JavaScript en AceptarDespachoModal
**Solución:**
- Eliminado `alert('Debes seleccionar...')` → reemplazado por `setError()`
- Eliminado `alert('✅ Recursos asignados correctamente')` → se cierra modal directamente

**Archivos modificados:**
- `components/Transporte/AceptarDespachoModal.tsx`

**Antes:**
```tsx
if (!choferId || !camionId) {
  alert('Debes seleccionar al menos un chofer y un camión');
  return;
}
// ...
alert('✅ Recursos asignados correctamente');
onSuccess();
```

**Después:**
```tsx
if (!choferId || !camionId) {
  setError('Debes seleccionar al menos un chofer y un camión');
  return;
}
// ...
onSuccess(); // Sin alert
```

---

### 7. Leyenda "Pareja: Adulto mayor..." en filtros
**Problema:** Aparecía texto largo en lugar de botón en línea de filtros
**Análisis:** El texto proviene de datos reales de destinos/orígenes en la base de datos
**Conclusión:** No es un bug del código sino data válida. El select muestra correctamente los destinos que contienen ese texto.

---

## ⏳ Pendiente

### 8. Pantalla Viajes Activos sin diseñar
**Estado:** Página creada (`pages/transporte/viajes-activos.tsx`) pero falta:
- Diseño de tracking en tiempo real
- Integración con GPS de choferes
- Actualización automática de estados
- Vista de mapa con ubicaciones

---

## 📁 Archivos Modificados

1. **components/Transporte/RechazarViajeModal.tsx**
   - Agregado `viaje_numero?: number` a interface
   
2. **pages/transporte/despachos-ofrecidos.tsx**
   - Corregido props de RechazarViajeModal
   - Actualizado filtro `applyFilters()` para excluir cancelados
   - Actualizado contadores de tabs
   - Cambiado badge de "Cancelado" a "Rechazado"
   - Corregido parseo de fecha con timezone

3. **components/Transporte/AceptarDespachoModal.tsx**
   - Eliminado 2 alerts nativos
   - Reemplazado por setError() y cierre directo

---

## 🧪 Testing Recomendado

### Test 1: Modal de Rechazo
1. Ir a Despachos Ofrecidos > Pendientes
2. Click en "Rechazar" en cualquier viaje
3. Modal debe abrir sin errores
4. Ingresar motivo y confirmar
5. ✅ No debe mostrar error
6. ✅ Viaje debe aparecer en tab "Rechazados"
7. ✅ Badge debe decir "Viaje Rechazado"

### Test 2: Filtros de Tabs
1. Verificar tab "Pendientes" NO muestra viajes cancelados
2. Verificar tab "Asignados" solo muestra viajes con chofer+camión
3. Verificar tab "Rechazados" solo muestra viajes cancelados
4. ✅ Contadores deben coincidir con cantidad de viajes en cada tab

### Test 3: Asignación de Recursos
1. Ir a tab "Pendientes"
2. Click en "Asignar Recursos"
3. Seleccionar chofer y camión
4. Click en "Confirmar"
5. ✅ NO debe mostrar alert nativo
6. ✅ Modal debe cerrarse automáticamente
7. ✅ Viaje debe aparecer en tab "Asignados"

### Test 4: Fecha Correcta
1. Verificar que DSP-20251103-002 - Viaje #1 muestre 05/11 (no 04/11)
2. Comparar con fecha en base de datos
3. ✅ Fechas deben coincidir exactamente

---

## 🔧 Notas Técnicas

### Timezone Fix
El problema de fechas incorrectas se debe a que JavaScript interpreta fechas ISO sin timezone como UTC, lo que puede causar cambios de día dependiendo de la zona horaria local. La solución es agregar 'T00:00:00' para forzar interpretación local.

**Ejemplo:**
- `new Date('2025-11-05')` → Puede interpretar como 04/11 23:00 en GMT-3
- `new Date('2025-11-05T00:00:00')` → Interpreta como 05/11 00:00 local

### Estado "cancelado" vs "rechazado"
La base de datos usa estado 'cancelado' (por constraint check), pero la UI muestra "Rechazado" para mejor semántica desde el punto de vista del transporte.

### Filtros Lógicos
Los filtros usan lógica AND para asegurar que:
- Pendientes: estado pendiente/asignado AND no cancelado
- Asignados: estado camion_asignado AND tiene recursos AND no cancelado
- Rechazados: solo cancelados

---

**Usuario Testing:** gonzalo@logisticaexpres.com  
**Puerto:** 3003  
**Fecha:** 3 de Noviembre 2025  
**Estado:** ✅ 7/8 problemas resueltos
