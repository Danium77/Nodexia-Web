# 🚀 PROMPT DE CONTINUACIÓN - SESIÓN NODEXIA WEB
**Fecha:** 5 de Noviembre 2025  
**Sesión:** Continuación debugging despachos de 1 viaje

---

## 📋 CONTEXTO GENERAL DE LA APLICACIÓN

**Proyecto:** Nodexia Web - Plataforma de gestión logística y coordinación de transportes  
**Stack:** Next.js 15.5.6, React 19, TypeScript, Supabase, Tailwind CSS  
**Puerto:** 3000-3003 (dependiendo de disponibilidad)  
**Usuario Testing:** gonzalo@logisticaexpres.com / Password: Tempicxmej9o!1862

**Arquitectura:**
- **Coordinador de Planta:** Crea despachos, asigna transportes (página: `/crear-despacho`)
- **Coordinador de Transporte:** Recibe viajes asignados, asigna choferes/camiones (página: `/transporte/despachos-ofrecidos`)
- **Base de datos:** 
  - Tabla `despachos`: Pedidos con cantidad de viajes solicitados
  - Tabla `viajes_despacho`: Viajes individuales generados a partir de despachos
  - Relación: Un despacho puede tener múltiples viajes

---

## 🎯 PROBLEMA ACTUAL

**Issue:** Despachos de 1 solo viaje no aparecen correctamente en el flujo completo:

1. ✅ Despacho se crea correctamente
2. ✅ Se asigna transporte "Logística Express SRL" 
3. ❌ **Despacho permanece en tab "Pendientes" en lugar de moverse a "Asignados"**
4. ❌ **Despacho NO aparece en "Despachos Ofrecidos" del coordinador de transporte**

**Despachos de 3 viajes funcionan correctamente** - solo falla con 1 viaje.

---

## 🔧 CAMBIOS REALIZADOS (Sesión Anterior)

### 1. Fix en `crear-despacho.tsx` (líneas 1387, 1405, 1447)
```tsx
// ANTES: const cantidadTotal = d.cantidad_viajes_solicitados || 0;
// AHORA: const cantidadTotal = d.cantidad_viajes_solicitados || 1;
```
**Motivo:** Para despachos de 1 viaje, si `cantidad_viajes_solicitados` es null, debe asumir 1 (no 0).

### 2. Fix en `AssignTransportModal.tsx`
**Línea 479:** Cambio en selección de transporte
```tsx
// ANTES: setSelectedTransport(e.target.value); // String del DOM, puede truncar UUID
// AHORA: setSelectedTransport(transport.id);   // UUID directo del objeto
```

**Líneas 227, 247, 271:** Agregar actualización de `viajes_generados`
```tsx
// Caso 1: Viajes parciales asignados
.update({
  viajes_generados: totalViajesAsignadosAhora,
  comentarios: ...
})

// Caso 2: Todos los viajes asignados  
.update({
  transport_id: selectedTransport,
  estado: 'transporte_asignado',
  viajes_generados: totalViajesAsignadosAhora,
  comentarios: ...
})

// Caso 3: Despacho simple (1 viaje)
.update({
  transport_id: selectedTransport,
  estado: 'transporte_asignado',
  viajes_generados: 1, // 🔥 FIX CRÍTICO
  comentarios: ...
})
```

---

## 📊 ESTADO DE LA BASE DE DATOS

**Despacho DSP-20251104-003 (Caso de prueba):**
```javascript
{
  pedido_id: 'DSP-20251104-003',
  estado: 'transporte_asignado',
  cantidad_viajes_solicitados: 1,
  viajes_generados: 1,
  transport_id: null  // ⚠️ POSIBLE PROBLEMA
}
```

**Viaje asociado:**
```javascript
{
  numero_viaje: 1,
  despacho_id: 'DSP-20251104-003',
  id_transporte: '181d6a2b-cdc1-4a7a-8d2d-dea17a3a9ed', // Logística Express SRL
  estado: 'transporte_asignado'
}
```

**ID de Empresa Logística Express:**
```
181d6a2b-cdc1-4a7a-8d2d-dea17a3a9ed
```

---

## 🐛 PROBLEMAS PENDIENTES

### Problema 1: Tab Filtering
**Síntoma:** A pesar de `viajes_generados = 1`, el despacho sigue en "Pendientes"

**Lógica esperada:**
```tsx
const cantidadTotal = d.cantidad_viajes_solicitados || 1;  // = 1
const cantidadAsignados = d.viajes_generados || 0;         // = 1
const viajesPendientes = cantidadTotal - cantidadAsignados; // 1 - 1 = 0

// Si viajesPendientes === 0 → debería ir a tab "Asignados" ✅
// Pero está en "Pendientes" ❌
```

**Posibles causas:**
- Cache del navegador no actualizado
- Query de fetchGeneratedDispatches no trae datos actualizados
- Lógica de filtrado tiene otra condición que no estamos viendo

### Problema 2: Despachos Ofrecidos
**Síntoma:** Viaje no aparece en `/transporte/despachos-ofrecidos`

**Query esperado:**
```tsx
// En despachos-ofrecidos.tsx
const { data: viajesData } = await supabase
  .from('viajes_despacho')
  .select(...)
  .eq('id_transporte', empresaId) // '181d6a2b-cdc1-4a7a-8d2d-dea17a3a9ed'
  .in('estado', ['pendiente', 'transporte_asignado', 'camion_asignado', 'cancelado'])
```

**Viaje tiene:**
- ✅ `id_transporte: '181d6a2b-cdc1-4a7a-8d2d-dea17a3a9ed'` (correcto)
- ✅ `estado: 'transporte_asignado'` (está en el array de filtro)

**Posibles causas:**
- El `transport_id` en tabla `despachos` es `null` y algún JOIN lo requiere
- Hay otro filtro o condición en el query que no estamos viendo
- El usuario gonzalo@logisticaexpres.com tiene asociada otra empresa diferente

---

## 🎯 PRÓXIMAS ACCIONES

### Acción 1: Verificar que `transport_id` en despachos se actualiza correctamente
```javascript
// Ejecutar en consola del navegador
const { data } = await supabase
  .from('despachos')
  .select('*, viajes_despacho(*)')
  .eq('pedido_id', 'DSP-20251104-003')
  .single();

console.log('📦 Despacho completo:', data);
console.log('   transport_id en despacho:', data.transport_id);
console.log('   id_transporte en viajes:', data.viajes_despacho.map(v => v.id_transporte));
```

**Acción correctiva si `transport_id` es `null`:**
```javascript
// Actualizar transport_id en despacho
await supabase
  .from('despachos')
  .update({ transport_id: '181d6a2b-cdc1-4a7a-8d2d-dea17a3a9ed' })
  .eq('pedido_id', 'DSP-20251104-003');
```

### Acción 2: Verificar lógica de filtrado en `crear-despacho.tsx`
**Ubicación:** Líneas 1435-1470 aproximadamente

Buscar el código que filtra por tab:
```tsx
const filteredDispatches = generatedDispatches.filter(d => {
  const cantidadTotal = d.cantidad_viajes_solicitados || 1;
  const cantidadAsignados = d.viajes_generados || 0;
  const viajesPendientes = cantidadTotal - cantidadAsignados;
  
  if (activeTab === 'pendientes') {
    return cantidadAsignados === 0; // ← Verificar esta condición
  }
  if (activeTab === 'en_proceso') {
    return cantidadAsignados > 0 && viajesPendientes > 0;
  }
  if (activeTab === 'asignados') {
    return cantidadAsignados > 0 && viajesPendientes === 0;
  }
});
```

**Agregar logs de debug:**
```tsx
console.log(`🔍 Filtrado de ${d.pedido_id}:`, {
  cantidadTotal,
  cantidadAsignados,
  viajesPendientes,
  activeTab,
  pasaFiltro: /* resultado de la condición */
});
```

### Acción 3: Crear nuevo despacho de prueba
1. Crear DSP-20251105-001 con 1 viaje
2. Asignar a Logística Express
3. Verificar que con los nuevos cambios funciona correctamente end-to-end
4. **NO usar el despacho DSP-20251104-003** (ya está corrompido por pruebas anteriores)

### Acción 4: Revisar query de `despachos-ofrecidos.tsx`
**Ubicación:** Líneas 95-145 aproximadamente

Verificar el query completo:
```tsx
const { data: viajesData, error: viajesError } = await supabase
  .from('viajes_despacho')
  .select(`
    id,
    numero_viaje,
    estado,
    id_chofer,
    id_camion,
    despacho_id,
    observaciones,
    despachos!inner (  // ← ⚠️ INNER JOIN puede excluir viajes
      id,
      pedido_id,
      origen,
      destino,
      scheduled_local_date,
      scheduled_local_time,
      prioridad,
      created_at
    )
  `)
  .eq('id_transporte', empresaId)
  .in('estado', ['pendiente', 'transporte_asignado', 'camion_asignado', 'cancelado'])
  .order('created_at', { ascending: true });
```

**Posible problema:** El `!inner` en `despachos!inner` hace un INNER JOIN, por lo que si el despacho no cumple alguna condición, el viaje no aparece.

**Solución temporal:** Cambiar a LEFT JOIN:
```tsx
despachos (  // Sin !inner
  ...
)
```

---

## 📝 ARCHIVOS CLAVE MODIFICADOS

1. **`pages/crear-despacho.tsx`** - Filtrado de tabs por estado
   - Líneas 1387, 1405, 1447: Cambio de `|| 0` a `|| 1`
   - Líneas 1435-1470: Lógica de filtrado de tabs

2. **`components/Modals/AssignTransportModal.tsx`** - Asignación de transporte
   - Línea 479: Uso de `transport.id` directo
   - Líneas 227, 247, 271: Actualización de `viajes_generados`

3. **`pages/transporte/despachos-ofrecidos.tsx`** - Vista coordinador transporte
   - Líneas 95-145: Query de viajes asignados

4. **`components/Transporte/AceptarDespachoModal.tsx`** - Asignación de recursos
   - Sin cambios recientes, pero funciona correctamente

---

## 🔍 COMANDOS ÚTILES

**Iniciar servidor:**
```bash
cd C:\Users\nodex\Nodexia-Web
pnpm run dev
```

**Verificar errores de compilación:**
```bash
pnpm run build
```

**Matar proceso de Node.js (si el puerto está ocupado):**
```powershell
Get-Process -Name node | Stop-Process -Force
```

**Acceso rápido:**
- Coordinador Planta: http://localhost:3003/crear-despacho
- Coordinador Transporte: http://localhost:3003/transporte/despachos-ofrecidos  
  (login con gonzalo@logisticaexpres.com / Tempicxmej9o!1862)

**Limpiar cache del navegador:**
- Chrome/Edge: Ctrl + Shift + R (hard refresh)
- O: Ctrl + Shift + Delete → Limpiar caché

---

## ✅ TODO LIST

- [x] Fix: cantidad_viajes_solicitados default a 1 en lugar de 0
- [x] Fix: Modal usa transport.id directamente (no e.target.value)
- [x] Fix: Agregar viajes_generados en todas las actualizaciones de despacho
- [ ] **URGENTE:** Identificar por qué despacho de 1 viaje no cambia de tab
  - [ ] Agregar logs de debug en lógica de filtrado
  - [ ] Verificar que viajes_generados se está leyendo correctamente
  - [ ] Verificar condiciones de filtro para cada tab
- [ ] **URGENTE:** Identificar por qué viaje no aparece en Despachos Ofrecidos
  - [ ] Verificar que transport_id en despachos se actualiza (no debe ser null)
  - [ ] Verificar INNER JOIN en query de viajes
  - [ ] Verificar que empresaId del usuario es correcto
- [ ] Testing completo: Crear nuevo despacho DSP-20251105-001 y verificar flujo end-to-end
- [ ] Considerar agregar campo `viajes_generados` al INSERT inicial en crear-despacho (preventivo)

---

## 🔑 DATOS IMPORTANTES

**Empresas de Transporte:**
- **Logística Express SRL:** `181d6a2b-cdc1-4a7a-8d2d-dea17a3a9ed`
- Transportes Nodexia Demo: `2f860cfe-d195-4d9d-9d82-b21d4d266ff4`

**Usuarios Testing:**
- **Coordinador Planta:** coordinador@industriacentro.com / Demo2025!
- **Coordinador Transporte (Logística Express):** gonzalo@logisticaexpres.com / Tempicxmej9o!1862

**Estados válidos para viajes:**
- `pendiente`
- `transporte_asignado`
- `camion_asignado`
- `cancelado`
- `en_transito`
- `entregado`

---

## 💡 HIPÓTESIS DE SOLUCIÓN

**Hipótesis Principal:** El problema está en que `AssignTransportModal.tsx` actualiza correctamente `viajes_generados` en el **ELSE del caso de despachos simples**, pero el código de crear-despacho.tsx tiene un **query o fetch que no se refresca automáticamente** después de la asignación.

**Pasos para validar:**
1. Agregar `console.log` en `fetchGeneratedDispatches()` para ver qué datos trae de Supabase
2. Verificar si `handleAssignSuccess()` realmente ejecuta el refresh
3. Si no refresca, agregar un `await fetchGeneratedDispatches()` explícito después de cerrar el modal

**Solución alternativa:** Forzar un reload completo de la página después de asignar transporte:
```tsx
// En AssignTransportModal.tsx, después de onAssignSuccess()
onAssignSuccess();
window.location.reload(); // Temporal, no ideal
```

---

## 📊 DIAGRAMA DE FLUJO ESPERADO

```
1. Usuario crea despacho DSP-XXX con 1 viaje
   └─> INSERT en despachos (cantidad_viajes_solicitados: 1, viajes_generados: 0)
   └─> Aparece en tab "Pendientes" ✅

2. Usuario abre modal "Asignar Transporte"
   └─> Selecciona "Logística Express SRL"
   └─> Confirma asignación

3. AssignTransportModal ejecuta:
   ├─> INSERT en viajes_despacho (id_transporte: '181d6a2b...', estado: 'transporte_asignado')
   └─> UPDATE despachos SET viajes_generados = 1, transport_id = '181d6a2b...', estado = 'transporte_asignado'

4. Modal cierra y ejecuta onAssignSuccess()
   └─> fetchGeneratedDispatches() refresca lista
   └─> Despacho ahora tiene viajes_generados = 1
   └─> Filtro calcula: 1 - 1 = 0 viajes pendientes
   └─> Despacho DEBE aparecer en tab "Asignados" ✅ (PERO NO ESTÁ PASANDO ❌)

5. Usuario cambia a perfil "Coordinador Transporte"
   └─> Va a /transporte/despachos-ofrecidos
   └─> Query busca viajes donde id_transporte = '181d6a2b...'
   └─> Viaje DEBE aparecer en "Pendientes de Asignar" ✅ (PERO NO ESTÁ PASANDO ❌)
```

---

## 🚨 NOTAS CRÍTICAS

1. **NO usar DSP-20251104-003 para testing** - Está corrompido por múltiples pruebas manuales
2. **Siempre verificar en consola** que los UUIDs son exactos (copiar/pegar, no escribir manualmente)
3. **Hard refresh obligatorio** (Ctrl+Shift+R) después de cada cambio de código
4. **Los despachos de 3 viajes funcionan** - Solo falla con 1 viaje (pista importante)

---

**Estado:** 🔴 Bloqueado - Necesita debugging de lógica de filtrado y query de despachos ofrecidos  
**Prioridad:** ALTA - Funcionalidad core del sistema  
**Última actualización:** 5 de Noviembre 2025
