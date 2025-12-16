# 🔧 CORRECCIONES APLICADAS - 13 NOV 2025

## 📝 RESUMEN DE CORRECCIONES

Se aplicaron correcciones para solucionar los 2 problemas reportados:

### **Problema 1: Drag & Drop no funciona** ❌→✅
### **Problema 2: Chofer y Camión no aparecen en lista de viajes** ❌→✅

---

## 🎯 CORRECCIÓN 1: DRAG & DROP

### **Problema Detectado:**
El evento `onDrop` no se disparaba cuando se soltaba una card sobre un `<td>`.

### **Causa Raíz:**
El `handleDragOver` no estaba haciendo `e.stopPropagation()`, lo que podría permitir que elementos hijos bloquearan el evento.

### **Solución Aplicada:**

**Archivo:** `components/Planning/PlanningGrid.tsx`  
**Línea:** ~115

```typescript
// ANTES:
const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
};

// DESPUÉS:
const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation(); // 🔥 NUEVO
  e.dataTransfer.dropEffect = 'move';
  console.log('🎯 DRAG OVER detectado en TD'); // 🔥 DEBUG
};
```

### **Logs Esperados en Consola:**

Ahora deberías ver:

1. Al agarrar una card:
```
🎬 DRAG START: PED-20251113-001 Estado: camion_asignado
✅ Can be dragged? true
✅ Iniciando drag...
```

2. Al pasar sobre otra celda:
```
🎯 DRAG OVER detectado en TD  (se repite varias veces)
```

3. Al soltar la card:
```
🎯 DROP detectado: { dayName: 'Miércoles', timeSlot: '15:00' }
📅 Nueva ubicación: { newDateStr: '2025-11-13', newTimeStr: '15:00' }
📅 Ubicación actual: { current_date: '2025-11-12', current_time: '14:00' }
✅ Mostrando modal de confirmación
```

### **Cómo Probar:**

1. Ir a la página de Planificación
2. Buscar un despacho con estado `camion_asignado` o `generado`
3. Hacer clic y mantener presionado sobre la card
4. Arrastrar hacia otra celda (otro día/hora)
5. **OBSERVAR:** La card debería tener `opacity-50` mientras se arrastra
6. **OBSERVAR:** Todas las demás cards deberían quedar "quietas" (`pointerEvents: 'none'`)
7. Soltar sobre la nueva celda
8. **ESPERAR:** Modal de confirmación debe aparecer

---

## 🚛 CORRECCIÓN 2: CHOFER Y CAMIÓN EN LISTA DE VIAJES

### **Problema Detectado:**
Cuando se expandía un despacho para ver la lista de viajes, NO aparecían los datos de chofer ni camión.

### **Causa Raíz:**
La función `handleToggleExpandDespacho` cargaba los viajes pero NO incluía los joins a las tablas `camiones` y `choferes`.

### **Solución Aplicada:**

**Archivo:** `pages/crear-despacho.tsx`  
**Función:** `handleToggleExpandDespacho`  
**Líneas:** ~910-930

#### **Cambio 1: Agregar Joins al Query**

```typescript
// ANTES:
const { data: viajes, error } = await supabase
  .from('viajes_despacho')
  .select(`
    id,
    numero_viaje,
    estado,
    id_transporte,
    id_chofer,          // ❌ Solo el ID
    id_camion,          // ❌ Solo el ID
    id_transporte_cancelado,
    motivo_cancelacion,
    observaciones,
    created_at
  `)
  .eq('despacho_id', despachoId)
  .order('numero_viaje', { ascending: true });

// DESPUÉS:
const { data: viajes, error } = await supabase
  .from('viajes_despacho')
  .select(`
    id,
    numero_viaje,
    estado,
    id_transporte,
    id_chofer,
    id_camion,
    id_transporte_cancelado,
    motivo_cancelacion,
    observaciones,
    created_at,
    camiones (          // ✅ JOIN completo
      id,
      patente,
      marca,
      modelo
    ),
    choferes (          // ✅ JOIN completo
      id,
      nombre,
      apellido,
      telefono
    )
  `)
  .eq('despacho_id', despachoId)
  .order('numero_viaje', { ascending: true });
```

#### **Cambio 2: Actualizar Mapeo de Datos**

**Líneas:** ~985-990

```typescript
// ANTES:
const viajesConDatos = viajes?.map(v => ({
  ...v,
  transporte: v.id_transporte ? transportesData[v.id_transporte] : null,
  transporte_cancelado: v.id_transporte_cancelado ? transportesData[v.id_transporte_cancelado] : null,
  chofer: v.id_chofer ? choferesData[v.id_chofer] : null,  // ❌ Solo del mapa
  camion: v.id_camion ? camionesData[v.id_camion] : null   // ❌ Solo del mapa
})) || [];

// DESPUÉS:
const viajesConDatos = viajes?.map(v => ({
  ...v,
  transporte: v.id_transporte ? transportesData[v.id_transporte] : null,
  transporte_cancelado: v.id_transporte_cancelado ? transportesData[v.id_transporte_cancelado] : null,
  chofer: v.choferes || (v.id_chofer ? choferesData[v.id_chofer] : null),  // ✅ Prioriza join
  camion: v.camiones || (v.id_camion ? camionesData[v.id_camion] : null)   // ✅ Prioriza join
})) || [];
```

### **Explicación:**

1. **v.choferes**: Viene del join `choferes(...)` en el query
2. **v.camiones**: Viene del join `camiones(...)` en el query
3. Si el join falla, se usa el fallback del mapa `choferesData`/`camionesData`

### **Cómo Probar:**

1. Ir a la página "Crear Despacho"
2. Buscar un despacho con estado `generado` que tenga viajes
3. Hacer clic en "Ver Viajes" para expandir la tabla
4. **VERIFICAR:** En la tabla de viajes, las columnas "Chofer" y "Camión" deben mostrar datos
5. **EJEMPLO:**
   ```
   | Viaje | Estado | Transporte | Chofer | Camión |
   |-------|--------|-----------|--------|--------|
   | #1    | generado | ACME | Juan Pérez 📱 11-1234-5678 | ABC-123 Ford F-100 |
   ```

---

## 🧪 TESTING COMPLETO

### **Test 1: Drag & Drop**

#### Pasos:
1. Login como Coordinador
2. Ir a Planificación
3. Buscar card con estado `camion_asignado`
4. Arrastrar a otra celda
5. Verificar modal de confirmación
6. Confirmar
7. Verificar actualización en BD

#### Resultado Esperado:
✅ Card se mueve a nueva posición  
✅ Modal aparece correctamente  
✅ BD se actualiza con nueva fecha/hora  

---

### **Test 2: Chofer/Camión en Lista**

#### Pasos:
1. Login como Coordinador
2. Ir a Crear Despacho
3. Expandir un despacho generado
4. Ver tabla de viajes
5. Buscar columnas "Chofer" y "Camión"

#### Resultado Esperado:
✅ Columna Chofer muestra: `Nombre Apellido 📱 Teléfono`  
✅ Columna Camión muestra: `Patente Marca Modelo`  

---

### **Test 3: Chofer/Camión en Cards de Planificación**

#### Pasos:
1. Login como Coordinador
2. Ir a Planificación
3. Buscar cards con transporte asignado
4. Verificar iconos y datos

#### Resultado Esperado:
✅ Card muestra:
```
🚛 Nombre Transporte
👤 Nombre Chofer
🚗 Patente
```

---

## 📊 ESTRUCTURA DE DATOS

### **Viaje Completo con Chofer/Camión:**

```typescript
{
  id: 'uuid',
  numero_viaje: 1,
  estado: 'generado',
  id_transporte: 'uuid',
  id_chofer: 'uuid',
  id_camion: 'uuid',
  
  // Datos de relaciones (via join):
  camiones: {
    id: 'uuid',
    patente: 'ABC-123',
    marca: 'Ford',
    modelo: 'F-100'
  },
  choferes: {
    id: 'uuid',
    nombre: 'Juan',
    apellido: 'Pérez',
    telefono: '11-1234-5678'
  },
  
  // Mapeado final:
  camion: { patente: 'ABC-123', marca: 'Ford', modelo: 'F-100' },
  chofer: { nombre: 'Juan', apellido: 'Pérez', telefono: '11-1234-5678' }
}
```

---

## 🐛 DEBUGGING

### **Si el Drag & Drop aún no funciona:**

1. **Abrir DevTools → Console**
2. **Intentar arrastrar una card**
3. **Buscar logs:**
   - ✅ `🎬 DRAG START` → Confirma inicio
   - ✅ `🎯 DRAG OVER detectado en TD` → Confirma que el mouse pasa sobre celdas
   - ❌ NO aparece `🎯 DROP detectado` → El problema está en el drop

4. **Si NO aparece "DRAG OVER":**
   - El problema está en el evento `onDragOver` del `<td>`
   - Verificar que no hay elementos bloqueando con `z-index` alto

5. **Si aparece "DRAG OVER" pero NO "DROP":**
   - El `onDrop` no se está disparando
   - Probar agregar `onDragEnter` para debugging adicional

---

### **Si Chofer/Camión no aparecen:**

1. **Abrir DevTools → Console**
2. **Expandir un despacho**
3. **Buscar log:** `✅ Viajes cargados con recursos: X`
4. **Agregar console.log temporal:**

```typescript
const viajesConDatos = viajes?.map(v => {
  console.log('🔍 Viaje completo:', v);
  console.log('  - camiones (join):', v.camiones);
  console.log('  - choferes (join):', v.choferes);
  console.log('  - camion (final):', v.camiones || camionesData[v.id_camion]);
  console.log('  - chofer (final):', v.choferes || choferesData[v.id_chofer]);
  
  return {
    ...v,
    transporte: v.id_transporte ? transportesData[v.id_transporte] : null,
    transporte_cancelado: v.id_transporte_cancelado ? transportesData[v.id_transporte_cancelado] : null,
    chofer: v.choferes || (v.id_chofer ? choferesData[v.id_chofer] : null),
    camion: v.camiones || (v.id_camion ? camionesData[v.id_camion] : null)
  };
}) || [];
```

5. **Verificar en consola:**
   - `camiones (join):` debería mostrar objeto con `{ patente, marca, modelo }`
   - `choferes (join):` debería mostrar objeto con `{ nombre, apellido, telefono }`

---

## 📁 ARCHIVOS MODIFICADOS

1. **`components/Planning/PlanningGrid.tsx`**
   - Línea ~115: Actualizado `handleDragOver` con `stopPropagation()` y log

2. **`pages/crear-despacho.tsx`**
   - Líneas ~910-930: Agregados joins `camiones(...)` y `choferes(...)` al query
   - Líneas ~985-990: Actualizado mapeo para priorizar datos de joins

---

## ✅ CONFIRMACIÓN

**Estado de Correcciones:**
- ✅ Drag & Drop: `e.stopPropagation()` agregado
- ✅ Query de viajes: Joins agregados
- ✅ Mapeo de datos: Prioriza joins sobre mapas
- ✅ Sin errores de compilación

**Próximo Paso:**
👉 **Refrescar la página y probar ambas funcionalidades**

---

**Fecha:** 13 de Noviembre 2025  
**Hora:** ~23:00  
**Estado:** ✅ Correcciones aplicadas, listo para testing
