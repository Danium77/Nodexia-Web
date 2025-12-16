# 🚀 PROMPT DE CONTINUACIÓN - 19 de Noviembre 2025

## 📍 CONTEXTO DE LA SESIÓN ANTERIOR

### ✅ Qué se completó el 17/Nov/2025:

1. **Corrección de carga de datos relacionados**
   - Implementado patrón de carga por IDs para evitar joins complejos
   - Creados mapas de acceso rápido para transportes, choferes y camiones
   - Implementado fallback automático: datos del viaje → datos del despacho padre

2. **Drag & Drop funcional**
   - Solucionado bloqueo de evento `onDrop` usando imagen transparente
   - Implementado feedback visual con `opacity-20` durante drag
   - Modal de confirmación funcionando correctamente

3. **Visualización completa en grilla de planificación**
   - Viajes aparecen en celdas correctas
   - Datos de transporte, chofer y camión visibles en cards
   - Modal de detalle muestra información completa

### 📁 Archivos modificados en sesión anterior:
- `pages/planificacion.tsx` - Carga de datos y mapeo de viajes
- `components/Planning/PlanningGrid.tsx` - Drag & drop con imagen transparente

---

## 🎯 OBJETIVO DE ESTA SESIÓN

### Prioridad Alta 🔴

**Problema identificado:** Los datos de chofer y camión NO persisten en el despacho padre.

#### Situación actual:
1. Usuario crea despacho → se genera con `transport_id` asignado
2. Transporte asigna chofer y camión al viaje → se actualiza `viajes_despacho.id_chofer` y `viajes_despacho.id_camion`
3. **PROBLEMA:** `despachos.driver_id` y `despachos.truck_id` quedan en `NULL`
4. Al recargar la página, los datos se pierden porque el fallback no funciona

#### Solución requerida:

**Actualizar tabla `despachos` cuando se asignan recursos al viaje:**

```typescript
// Cuando transporte asigna chofer/camión al viaje:
async function handleAsignarRecursos(viajeId, choferId, camionId) {
  // 1. Actualizar viaje
  await supabase
    .from('viajes_despacho')
    .update({
      id_chofer: choferId,
      id_camion: camionId,
      estado: 'camion_asignado'
    })
    .eq('id', viajeId);

  // 2. Obtener despacho_id del viaje
  const { data: viaje } = await supabase
    .from('viajes_despacho')
    .select('despacho_id')
    .eq('id', viajeId)
    .single();

  // 3. 🔥 NUEVO: Actualizar despacho padre
  await supabase
    .from('despachos')
    .update({
      driver_id: choferId,
      truck_id: camionId,
      estado: 'camion_asignado'
    })
    .eq('id', viaje.despacho_id);
}
```

#### Archivos a modificar:
- `pages/transporte/dashboard.tsx` o similar (donde transporte asigna recursos)
- Buscar la función que maneja asignación de chofer/camión
- Agregar actualización del despacho padre

---

## 🔍 PASOS PARA IMPLEMENTAR

### Paso 1: Encontrar el handler de asignación

```bash
# Buscar en el código dónde se asigna chofer/camión
grep -r "id_chofer" pages/ components/
grep -r "asignar.*chofer" pages/ components/
grep -r "handleAssign" pages/ components/
```

Posibles ubicaciones:
- `pages/transporte/dashboard.tsx`
- `components/Transporte/AsignarRecursosModal.tsx`
- `pages/api/viajes/asignar.ts`

---

### Paso 2: Modificar el handler

**Estructura actual (probablemente):**
```typescript
const handleAsignarRecursos = async (viajeId: string, choferId: string, camionId: string) => {
  // Solo actualiza viaje
  const { error } = await supabase
    .from('viajes_despacho')
    .update({
      id_chofer: choferId,
      id_camion: camionId,
      estado: 'camion_asignado'
    })
    .eq('id', viajeId);

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Recargar lista...
};
```

**Nueva estructura (con actualización de despacho):**
```typescript
const handleAsignarRecursos = async (viajeId: string, choferId: string, camionId: string) => {
  try {
    // 1. Obtener despacho_id del viaje
    const { data: viaje, error: viajeError } = await supabase
      .from('viajes_despacho')
      .select('despacho_id')
      .eq('id', viajeId)
      .single();

    if (viajeError) throw viajeError;

    // 2. Actualizar viaje
    const { error: updateViajeError } = await supabase
      .from('viajes_despacho')
      .update({
        id_chofer: choferId,
        id_camion: camionId,
        estado: 'camion_asignado'
      })
      .eq('id', viajeId);

    if (updateViajeError) throw updateViajeError;

    // 3. 🔥 NUEVO: Actualizar despacho padre
    const { error: updateDespachoError } = await supabase
      .from('despachos')
      .update({
        driver_id: choferId,
        truck_id: camionId,
        estado: 'camion_asignado'  // Sincronizar estado
      })
      .eq('id', viaje.despacho_id);

    if (updateDespachoError) throw updateDespachoError;

    console.log('✅ Recursos asignados al viaje Y al despacho padre');

    // 4. Recargar datos...
  } catch (error) {
    console.error('❌ Error asignando recursos:', error);
    alert('Error al asignar recursos');
  }
};
```

---

### Paso 3: Considerar caso de múltiples viajes

**IMPORTANTE:** Si un despacho tiene MÚLTIPLES viajes, ¿qué chofer/camión se guarda en el despacho?

**Opciones:**

**Opción A - Guardar del primer viaje:**
```typescript
// Solo actualizar despacho si es el primer viaje
const { data: allViajes } = await supabase
  .from('viajes_despacho')
  .select('id')
  .eq('despacho_id', viaje.despacho_id);

if (allViajes.length === 1) {
  // Es el único viaje, actualizar despacho
  await supabase.from('despachos').update({...}).eq('id', viaje.despacho_id);
}
```

**Opción B - Siempre sobrescribir (más simple):**
```typescript
// Siempre actualizar despacho con los datos del último viaje asignado
await supabase
  .from('despachos')
  .update({
    driver_id: choferId,
    truck_id: camionId
  })
  .eq('id', viaje.despacho_id);
```

**Recomendación:** Usar Opción B (más simple) y documentar que en despachos con múltiples viajes, los datos del despacho padre son solo de referencia.

---

## 🧪 TESTING REQUERIDO

### Test 1: Asignación básica

**Pasos:**
1. Crear despacho como coordinador
2. Asignar transporte
3. Login como transporte (gonzalo@logisticaexpres.com)
4. Asignar chofer y camión al viaje
5. **VERIFICAR EN BD:**
   ```sql
   SELECT 
     d.id, d.pedido_id, d.driver_id, d.truck_id,
     v.id as viaje_id, v.id_chofer, v.id_camion
   FROM despachos d
   LEFT JOIN viajes_despacho v ON v.despacho_id = d.id
   WHERE d.pedido_id = 'DSP-20251119-001';
   ```
6. **RESULTADO ESPERADO:**
   - `d.driver_id` debe ser igual a `v.id_chofer` ✅
   - `d.truck_id` debe ser igual a `v.id_camion` ✅

---

### Test 2: Persistencia después de recargar

**Pasos:**
1. Asignar chofer/camión (Test 1)
2. Cerrar navegador
3. Abrir y hacer login nuevamente
4. Ir a Planificación
5. **VERIFICAR:**
   - Card en grilla muestra chofer y camión ✅
   - Modal de detalle muestra datos completos ✅
   - Lista de viajes en despacho muestra datos ✅

---

### Test 3: Múltiples viajes (caso especial)

**Pasos:**
1. Crear despacho con 3 viajes
2. Asignar Chofer A + Camión A al Viaje 1
3. Asignar Chofer B + Camión B al Viaje 2
4. **VERIFICAR EN BD:**
   - `despachos.driver_id` = ID de Chofer B (último asignado)
   - `despachos.truck_id` = ID de Camión B (último asignado)
5. **VERIFICAR EN UI:**
   - Cada viaje muestra SU chofer/camión específico
   - Despacho padre muestra el último asignado

---

## 📊 QUERIES ÚTILES PARA DEBUG

### Ver estado completo de un despacho:

```sql
SELECT 
  d.id,
  d.pedido_id,
  d.estado as estado_despacho,
  d.transport_id,
  d.driver_id,
  d.truck_id,
  e.nombre as transporte_nombre,
  ch.nombre || ' ' || ch.apellido as chofer_nombre,
  ca.patente as camion_patente,
  v.id as viaje_id,
  v.numero_viaje,
  v.estado as estado_viaje,
  v.id_transporte as viaje_transport_id,
  v.id_chofer as viaje_chofer_id,
  v.id_camion as viaje_camion_id
FROM despachos d
LEFT JOIN empresas e ON e.id = d.transport_id
LEFT JOIN choferes ch ON ch.id = d.driver_id
LEFT JOIN camiones ca ON ca.id = d.truck_id
LEFT JOIN viajes_despacho v ON v.despacho_id = d.id
WHERE d.pedido_id = 'DSP-20251119-001'
ORDER BY v.numero_viaje;
```

### Encontrar despachos con inconsistencias:

```sql
-- Despachos donde driver_id es NULL pero viaje tiene chofer asignado
SELECT 
  d.id,
  d.pedido_id,
  d.driver_id as despacho_driver,
  v.id_chofer as viaje_chofer
FROM despachos d
INNER JOIN viajes_despacho v ON v.despacho_id = d.id
WHERE d.driver_id IS NULL 
  AND v.id_chofer IS NOT NULL;
```

---

## 🎯 CRITERIOS DE ÉXITO

La sesión se considera completada cuando:

- [ ] Código implementado y compilado sin errores
- [ ] Test 1 pasado: BD muestra datos sincronizados
- [ ] Test 2 pasado: Datos persisten después de recargar
- [ ] Test 3 pasado: Múltiples viajes se manejan correctamente
- [ ] Logs de debug agregados
- [ ] Documentación actualizada
- [ ] Commit realizado con mensaje descriptivo

---

## 💬 MENSAJE SUGERIDO PARA COMMIT

```
fix(transporte): Sincronizar chofer/camión entre viaje y despacho

- Actualizar despachos.driver_id cuando se asigna chofer al viaje
- Actualizar despachos.truck_id cuando se asigna camión al viaje
- Sincronizar estado del despacho con estado del viaje
- Garantizar persistencia de datos después de recargar página

Archivos modificados:
- pages/transporte/dashboard.tsx (o similar)

Resolves: Problema de datos no persistentes en planificación
```

---

## 📚 DOCUMENTOS DE REFERENCIA

### Para entender el flujo actual:
- `SESION-COMPLETADA-2025-11-17.md` - Sesión anterior completa
- `pages/planificacion.tsx` - Lógica de carga de datos con fallback
- `components/Planning/PlanningGrid.tsx` - Visualización en grilla

### Para entender estructura de BD:
- `sql/` - Migraciones y estructura de tablas
- `EJECUTAR-MIGRACIONES.md` - Guía de migraciones

### Credenciales de testing:
- Coordinador: `coordinador@industriacentro.com` / `Demo2025!`
- Transporte: `gonzalo@logisticaexpres.com` / `Tempicxmej9o!1862`

---

## 🚀 SIGUIENTE PASO INMEDIATO

**Al iniciar la sesión:**

1. Buscar dónde se asignan recursos al viaje:
   ```bash
   grep -r "id_chofer" pages/ components/
   ```

2. Abrir el archivo correspondiente

3. Agregar actualización del despacho padre después de actualizar viaje

4. Probar con credenciales de Gonzalo (transporte)

5. Verificar en BD que `driver_id` y `truck_id` se actualizan

---

**Estado:** ✅ LISTO PARA PRÓXIMA SESIÓN  
**Fecha creación:** 17 de Noviembre 2025  
**Uso:** Copiar/pegar al inicio de próxima sesión con Claude/Copilot
