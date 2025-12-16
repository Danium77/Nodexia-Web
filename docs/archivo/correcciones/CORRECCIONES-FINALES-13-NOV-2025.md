# 🔧 CORRECCIONES FINALES - 13 NOV 2025

## 🎯 RESUMEN DE PROBLEMAS Y SOLUCIONES

### **Problema 1: Drag & Drop no funciona** ❌
**Síntoma:** Las cards se pueden agarrar pero no se pueden soltar en otras celdas.

### **Problema 2: Modal de detalle no muestra transporte/chofer/camión** ❌
**Síntoma:** Al hacer clic en una card, el modal muestra "Sin asignar" aunque el viaje tenga transporte asignado.

### **Problema 3: Lista de viajes en despacho muestra "Sin asignar"** ❌
**Síntoma:** Al expandir un despacho, la tabla de viajes muestra "Sin asignar" en las columnas de Chofer y Camión.

---

## 🔧 CORRECCIÓN 1: DRAG & DROP

### **Causa del Problema:**
La card que se está arrastrando BLOQUEA el evento `onDrop` del `<td>` porque sigue siendo "clickeable" durante el drag.

### **Solución Aplicada:**

**Archivo:** `components/Planning/PlanningGrid.tsx`  
**Línea:** ~407

```typescript
// CAMBIO CRÍTICO: Invertir la lógica de pointerEvents
<div
  style={{
    pointerEvents: isDragging && draggedDispatch?.id === dispatch.id 
      ? 'none'  // ✅ La card ARRASTRADA debe ser "invisible"
      : 'auto'  // ✅ Las demás son normales
  }}
  className={`... ${isDragging && draggedDispatch?.id === dispatch.id ? 'opacity-30' : ''}`}
>
```

**Antes (❌ INCORRECTO):**
```typescript
style={isDragging && draggedDispatch?.id !== dispatch.id ? { pointerEvents: 'none' } : {}}
// Esto hacía que TODAS las demás cards fueran invisibles
// Pero la card arrastrada seguía bloqueando el drop
```

**Después (✅ CORRECTO):**
```typescript
style={{
  pointerEvents: isDragging && draggedDispatch?.id === dispatch.id ? 'none' : 'auto'
}}
// Ahora la card ARRASTRADA es la que se vuelve "invisible"
// Permitiendo que el evento drop llegue al <td>
```

### **Logs Esperados:**
```
🎬 DRAG START: DSP-20251113-001 Estado: transporte_asignado
✅ Can be dragged? true
✅ Iniciando drag...
🎯 DRAG OVER detectado en TD  (se repite varias veces)
🎯 DROP detectado: { dayName: 'Jueves', timeSlot: '15:00' }
📅 Nueva ubicación: { newDateStr: '2025-11-14', newTimeStr: '15:00' }
✅ Mostrando modal de confirmación
```

---

## 🔧 CORRECCIÓN 2 y 3: DATOS DE CHOFER Y CAMIÓN

### **Causa del Problema:**
El query de Supabase intentaba cargar `choferes.nombre_completo` pero ese campo NO EXISTE. Los campos reales son `nombre` y `apellido` **separados**.

### **Solución Aplicada:**

#### **Parte A: Corregir Query en Planificación**

**Archivo:** `pages/planificacion.tsx`  
**Línea:** ~76

```typescript
// ANTES (❌ Campo inexistente):
choferes (
  id,
  nombre_completo,  // ❌ Este campo NO existe
  telefono
)

// DESPUÉS (✅ Campos correctos):
choferes (
  id,
  nombre,     // ✅ Campo real
  apellido,   // ✅ Campo real
  telefono
)
```

#### **Parte B: Crear nombre_completo en el Mapeo**

**Archivo:** `pages/planificacion.tsx`  
**Línea:** ~124

```typescript
// ANTES (❌ Asumía que choferes.nombre_completo existe):
chofer: viaje.choferes || null

// DESPUÉS (✅ Construye nombre_completo desde nombre + apellido):
const choferData = viaje.choferes ? {
  ...viaje.choferes,
  nombre_completo: `${viaje.choferes.nombre || ''} ${viaje.choferes.apellido || ''}`.trim()
} : null;

// Luego en el return:
chofer: choferData
```

### **Estructura de Datos Correcta:**

```typescript
// Lo que viene de Supabase (join):
viaje.choferes = {
  id: 'uuid',
  nombre: 'Juan',
  apellido: 'Pérez',
  telefono: '11-1234-5678'
}

// Lo que necesitamos para el componente:
choferData = {
  id: 'uuid',
  nombre: 'Juan',
  apellido: 'Pérez',
  telefono: '11-1234-5678',
  nombre_completo: 'Juan Pérez'  // ✅ Construido en runtime
}
```

---

## 🔍 LOGS DE DEBUGGING AGREGADOS

### **En `crear-despacho.tsx` - handleToggleExpandDespacho:**

**Línea:** ~988

```typescript
const viajesConDatos = viajes?.map(v => {
  console.log('🔍 Viaje ID:', v.id);
  console.log('  - camiones (join):', v.camiones);
  console.log('  - choferes (join):', v.choferes);
  console.log('  - id_camion:', v.id_camion);
  console.log('  - id_chofer:', v.id_chofer);
  
  return {
    ...v,
    transporte: v.id_transporte ? transportesData[v.id_transporte] : null,
    transporte_cancelado: v.id_transporte_cancelado ? transportesData[v.id_transporte_cancelado] : null,
    chofer: v.choferes || (v.id_chofer ? choferesData[v.id_chofer] : null),
    camion: v.camiones || (v.id_camion ? camionesData[v.id_camion] : null)
  };
}) || [];
```

### **En `crear-despacho.tsx` - handleAssignSuccess:**

**Línea:** ~802

```typescript
const viajesConTransporte = viajes.map(v => {
  console.log('🔍 [handleAssignSuccess] Viaje:', v.id);
  console.log('  - camiones (join):', v.camiones);
  console.log('  - choferes (join):', v.choferes);
  
  return {
    ...v,
    transporte: v.id_transporte ? transportesData[v.id_transporte] : null,
    camion: v.camiones || null,
    chofer: v.choferes || null
  };
});
```

---

## 🧪 CÓMO PROBAR LAS CORRECCIONES

### **Test 1: Drag & Drop** 🎯

1. **Ir a Planificación**
2. **Buscar una card con estado "Transporte Asignado" o "Camión Asignado"**
3. **Hacer clic y mantener** sobre la card
4. **Arrastrar** hacia otra celda (otro día/hora)
5. **Verificar en consola:**
   ```
   🎬 DRAG START: ...
   🎯 DRAG OVER detectado en TD
   🎯 DROP detectado: ...
   ✅ Mostrando modal de confirmación
   ```
6. **Verificar visual:** La card arrastrada debe tener opacidad 30% (muy transparente)
7. **Soltar** sobre la nueva celda
8. **Verificar:** Debe aparecer modal de confirmación

---

### **Test 2: Modal de Detalle en Planificación** 📋

1. **Ir a Planificación**
2. **Hacer clic** en una card que tenga transporte asignado
3. **Verificar en el modal:**
   - ✅ **Transporte:** Debe mostrar nombre del transporte (ej: "Transportes Nodexia Demo")
   - ✅ **Camión:** Debe mostrar patente + marca + modelo (ej: "ABC-123 - Ford F-100")
   - ✅ **Chofer:** Debe mostrar nombre completo (ej: "Juan Pérez")
   - ✅ **Teléfono Chofer:** Debe mostrar número (ej: "11-1234-5678")

---

### **Test 3: Lista de Viajes en Despacho** 📊

1. **Ir a Crear Despacho**
2. **Buscar un despacho con estado "Generado" o "Transporte Asignado"**
3. **Hacer clic en "Ver Viajes"** para expandir
4. **Abrir DevTools → Console**
5. **Verificar logs:**
   ```
   🔍 Viaje ID: uuid-123
     - camiones (join): { id: 'uuid', patente: 'ABC-123', marca: 'Ford', modelo: 'F-100' }
     - choferes (join): { id: 'uuid', nombre: 'Juan', apellido: 'Pérez', telefono: '11-1234-5678' }
     - id_camion: uuid-camion
     - id_chofer: uuid-chofer
   ```
6. **Verificar en la tabla:**
   - ✅ **Columna Chofer:** "Juan Pérez 📱 11-1234-5678"
   - ✅ **Columna Camión:** "🚛 ABC-123" + "Ford F-100"

---

## 🐛 SI AÚN NO FUNCIONA

### **Drag & Drop sigue sin funcionar:**

1. **Verificar en consola:**
   - ✅ Aparece "🎬 DRAG START"?
   - ✅ Aparece "🎯 DRAG OVER detectado en TD"? (debe aparecer MUCHAS veces)
   - ❌ NO aparece "🎯 DROP detectado"?

2. **Si NO aparece "DRAG OVER":**
   - Hay un elemento con z-index muy alto bloqueando
   - Revisar CSS de `.group`, `.relative`, etc.

3. **Si aparece "DRAG OVER" pero NO "DROP":**
   - Agregar log en `handleDrop`:
   ```typescript
   const handleDrop = async (e: React.DragEvent, dayName: string, timeSlot: string) => {
     console.log('🟢 handleDrop EJECUTADO'); // Agregar esta línea al inicio
     e.preventDefault();
     e.stopPropagation();
     ...
   ```

4. **Si "DROP" se ejecuta pero no aparece el modal:**
   - Verificar estado de `draggedDispatch`
   - Agregar log: `console.log('draggedDispatch:', draggedDispatch)`

---

### **Chofer/Camión siguen mostrando "Sin asignar":**

1. **Verificar logs en consola al expandir despacho:**
   ```
   🔍 Viaje ID: ...
     - camiones (join): ???  // ¿Qué aparece aquí?
     - choferes (join): ???  // ¿Qué aparece aquí?
   ```

2. **Si aparece `null` o `undefined`:**
   - El join de Supabase falló
   - Verificar que el viaje REALMENTE tenga `id_camion` e `id_chofer` en la BD
   - Ejecutar query manual en Supabase:
   ```sql
   SELECT 
     v.id, v.numero_viaje, v.id_camion, v.id_chofer,
     c.patente, ch.nombre, ch.apellido
   FROM viajes_despacho v
   LEFT JOIN camiones c ON v.id_camion = c.id
   LEFT JOIN choferes ch ON v.id_chofer = ch.id
   WHERE v.id = 'VIAJE_ID_AQUI';
   ```

3. **Si el join trae datos pero no se muestran:**
   - El problema está en el render
   - Verificar que `viaje.chofer` y `viaje.camion` existen
   - Agregar log en la tabla:
   ```typescript
   console.log('🔍 Viaje en tabla:', viaje);
   console.log('  - viaje.chofer:', viaje.chofer);
   console.log('  - viaje.camion:', viaje.camion);
   ```

---

## 📊 ESTRUCTURA DE DATOS FINAL

### **Viaje Completo con Todos los Datos:**

```typescript
{
  // IDs básicos
  id: 'viaje-uuid',
  numero_viaje: 1,
  estado: 'camion_asignado',
  despacho_id: 'despacho-uuid',
  
  // IDs de relaciones
  id_transporte: 'transporte-uuid',
  id_camion: 'camion-uuid',
  id_chofer: 'chofer-uuid',
  
  // Datos de joins (vienen de Supabase):
  camiones: {
    id: 'camion-uuid',
    patente: 'ABC-123',
    marca: 'Ford',
    modelo: 'F-100'
  },
  choferes: {
    id: 'chofer-uuid',
    nombre: 'Juan',
    apellido: 'Pérez',
    telefono: '11-1234-5678'
  },
  transportes: {
    id: 'transporte-uuid',
    nombre: 'Transportes Nodexia Demo',
    tipo_vehiculo: 'camion'
  },
  
  // Datos mapeados (para componentes):
  camion: {
    id: 'camion-uuid',
    patente: 'ABC-123',
    marca: 'Ford',
    modelo: 'F-100'
  },
  chofer: {
    id: 'chofer-uuid',
    nombre: 'Juan',
    apellido: 'Pérez',
    telefono: '11-1234-5678',
    nombre_completo: 'Juan Pérez'  // ✅ Construido en runtime
  },
  transporte: {
    id: 'transporte-uuid',
    nombre: 'Transportes Nodexia Demo',
    cuit: '20-12345678-9'
  }
}
```

---

## 📁 RESUMEN DE ARCHIVOS MODIFICADOS

1. **`components/Planning/PlanningGrid.tsx`**
   - Línea ~407: Cambiado `pointerEvents` para hacer la card arrastrada "invisible"
   - Línea ~420: Cambiado `opacity-50` a `opacity-30` para mejor visibilidad

2. **`pages/planificacion.tsx`**
   - Línea ~76: Cambiado `nombre_completo` a `nombre, apellido` en query de choferes
   - Línea ~124-131: Agregada construcción de `nombre_completo` en mapeo de viajes

3. **`pages/crear-despacho.tsx`**
   - Línea ~988-1000: Agregados logs de debugging en `handleToggleExpandDespacho`
   - Línea ~802-812: Agregados logs de debugging en `handleAssignSuccess`

---

## ✅ CHECKLIST DE VERIFICACIÓN

Antes de considerar las correcciones completas, verificar:

- [ ] **Drag & Drop:** Se puede arrastrar Y soltar una card
- [ ] **Drag & Drop:** Aparece modal de confirmación al soltar
- [ ] **Drag & Drop:** Los logs muestran "DROP detectado"
- [ ] **Modal Detalle:** Muestra nombre de transporte
- [ ] **Modal Detalle:** Muestra datos de camión (patente, marca, modelo)
- [ ] **Modal Detalle:** Muestra nombre completo de chofer
- [ ] **Modal Detalle:** Muestra teléfono de chofer
- [ ] **Lista Viajes:** Columna "Chofer" muestra nombre + teléfono
- [ ] **Lista Viajes:** Columna "Camión" muestra patente + marca + modelo
- [ ] **Logs:** Aparecen los logs "🔍 Viaje ID:" al expandir despacho
- [ ] **Logs:** Los joins de camiones y choferes traen datos

---

## 🎯 PRÓXIMOS PASOS

Una vez que estas 3 correcciones funcionen:

1. **Remover logs de debug** (los `console.log` agregados)
2. **Fase 2 de mejoras:**
   - Filtros avanzados (por estado, prioridad, transporte)
   - Vista de lista alternativa
   - Navegación semanal (anterior/siguiente)
   - Búsqueda por pedido_id
3. **Optimizaciones:**
   - Cachear datos de despachos en localStorage
   - Implementar infinite scroll en grilla
   - WebSocket para actualizaciones en tiempo real

---

**Fecha:** 13 de Noviembre 2025  
**Hora:** ~23:30  
**Estado:** ✅ Correcciones aplicadas, listo para testing completo
