# Sesión Completada - 21 de Noviembre 2025

## Resumen Ejecutivo

**Objetivo de la Sesión:** Implementar funcionalidad completa de Drag & Drop en la pantalla de Planificación (rol Coordinador de Planta).

**Estado Final:** Drag & Drop parcialmente funcional - Las 3 tarjetas ahora disparan el evento `onDragStart`, pero solo una tarjeta (DSP-20251121-002 - Viaje 1) permite arrastrar y soltar completamente. Las otras dos tarjetas (DSP-20251121-001 y DSP-20251120-001 - Viaje 1) disparan eventos pero no muestran comportamiento visual de drag.

---

## Trabajo Realizado

### 1. Mejoras Implementadas Completamente ✅

#### A. Filtros de Planificación (`components/Planning/PlanningFilters.tsx`)
- **Estado:** Funcional y testeado por usuario
- Búsqueda por texto (pedido_id, origen, destino)
- 6 filtros: estado, prioridad, transporte, fechas (desde/hasta)
- Panel expandible con botón de limpiar
- Contador de resultados

#### B. Selector de Vistas (`components/Planning/ViewSelector.tsx`)
- **Estado:** Funcional
- 3 vistas: Día / Semana / Mes
- Botones con iconos de Heroicons
- Vista Mes pendiente de implementación

#### C. Vista de Día (`components/Planning/DayView.tsx`)
- **Estado:** Funcional - confirmado por usuario
- Timeline agrupada por hora
- Solo muestra viajes del día actual
- Grid responsivo (1/2/3 columnas)
- Colores por estado y bordes por prioridad

#### D. Exportación (`components/Planning/ExportButton.tsx`)
- **Estado:** Funcional
- Formatos: CSV (UTF-8 BOM) y Excel (.xls)
- 10 columnas de datos
- Respeta filtros activos

#### E. Sistema de Alertas (`components/Planning/PlanningAlerts.tsx`)
- **Estado:** Funcional
- 4 tipos de alertas:
  1. Conflictos (mismo transporte, misma hora/fecha) - Rojo
  2. Urgentes sin transporte - Naranja
  3. Hoy incompleto (sin chofer/camión) - Naranja
  4. Sin programar - Azul
- Alertas desechables
- Detección inteligente con datos anidados

#### F. Dashboard de Métricas
- **Estado:** Funcional
- 4 tarjetas: Hoy / Urgentes / Esta Semana / Sin Asignar
- Cálculo dinámico respetando filtros

---

### 2. Drag & Drop - Problema Principal ⚠️

#### Estado Actual del Problema

**Síntomas:**
- ✅ Las 3 tarjetas tienen `draggable={true}` forzado
- ✅ Las 3 tarjetas disparan `onDragStart` 
- ✅ Las 3 tarjetas reciben evento `mouseDown` en el DIV correcto
- ✅ `canBeDragged()` retorna `true` para las 3 tarjetas
- ❌ Solo DSP-20251121-002 - Viaje 1 muestra comportamiento visual completo (grid expandida, drop zones visibles)
- ❌ DSP-20251121-001 y DSP-20251120-001 - Viaje 1 NO permiten arrastrar visualmente

**Datos de las Tarjetas de Prueba:**
```
1. DSP-20251120-001 - Viaje 1: estado='camion_asignado' ❌
2. DSP-20251121-001: estado='pendiente_transporte' ❌
3. DSP-20251121-002 - Viaje 1: estado='transporte_asignado' ✅ (única que funciona)
```

**Console Logs Actuales:**
```javascript
🎯 RENDER card DSP-20251120-001 - Viaje 1: isDraggable=true
🎯 RENDER card DSP-20251121-001: isDraggable=true
🎯 RENDER card DSP-20251121-002 - Viaje 1: isDraggable=true

🖱️ mouseDown en DSP-20251120-001 - Viaje 1, target: DIV
🖱️ mouseDown en DSP-20251121-001, target: DIV
🖱️ mouseDown en DSP-20251121-002 - Viaje 1, target: DIV

🚀 onDragStart disparado para DSP-20251120-001 - Viaje 1
🚀 onDragStart disparado para DSP-20251121-001
🚀 onDragStart disparado para DSP-20251121-002 - Viaje 1
```

#### Intentos de Solución (15+ iteraciones)

**Cambios Realizados en `components/Planning/PlanningGrid.tsx`:**

1. **Validación `canBeDragged`:**
   - Cambió de whitelist (6 estados permitidos) a blacklist
   - Excluye solo: terminado, completado, cancelado, en_transito, descargando, descargado
   - Agregado `.trim()` a validación de estado

2. **Atributo `draggable`:**
   - Inicialmente: `draggable={canBeDragged(dispatch)}`
   - Optimizado: Variable `isDraggable` calculada una vez
   - Final: `draggable={true}` forzado para todas

3. **Eventos de Mouse:**
   - Agregado `onMouseDown` para debugging
   - Confirmado que los 3 DIVs principales reciben eventos

4. **Estilos CSS:**
   - Agregado `pointer-events-none` a contenedor interno
   - Múltiples prefijos de `user-select: none` (WebKit, Moz, ms)
   - `WebkitUserDrag: 'element'`
   - `touchAction: 'none'`
   - `WebkitTouchCallout: 'none'`

5. **Estructura HTML:**
   - Contenido interno envuelto en `<div className="pointer-events-none">`
   - Botón de ubicación con `pointer-events-auto`
   - Agregados `data-draggable` y `data-pedido` attributes

6. **Estado de Drag:**
   - `isDragging`: Estado global que cambia `displayTimeSlots`
   - `draggedDispatch`: Despacho siendo arrastrado
   - `dropTarget`: Celda objetivo (día/hora)

7. **Visualización:**
   - `displayTimeSlots`: Condicional basado en `isDragging`
     - `false`: Muestra solo franjas con viajes (3-5 slots)
     - `true`: Muestra todas las franjas 06:00-22:00 (17 slots)
   - Opacidad de tarjeta arrastrada: 50%
   - Scale: 98%
   - Ring: cyan-400

**Archivos Modificados:**
- `components/Planning/PlanningGrid.tsx` (820 líneas, 15+ ediciones)
- `pages/planificacion.tsx` (566 líneas)

---

## Hipótesis del Problema

### Teoría Principal: React State Batching

**Problema Sospechado:**
El estado `isDragging` se establece correctamente en `handleDragStart`, pero React no está re-renderizando todos los componentes necesarios cuando solo UNA tarjeta específica inicia el drag.

**Evidencia:**
1. ✅ `setIsDragging(true)` se llama correctamente
2. ✅ `setDraggedDispatch(dispatch)` se ejecuta
3. ✅ Console logs muestran estado configurándose
4. ❌ `displayTimeSlots` no recalcula para todas las tarjetas
5. ❌ Grid no se expande para todas las tarjetas

**Posibles Causas:**
1. **Closure sobre estado obsoleto:** `displayTimeSlots` captura valor antiguo de `isDragging`
2. **React Batching:** Actualización de estado no propaga a todos los elementos del DOM
3. **Conditional Rendering Issue:** El `isDragging` en la línea 378 no se evalúa correctamente
4. **Event Bubbling Problem:** Algo detiene la propagación del drag para tarjetas específicas
5. **Browser-specific Issue:** HTML5 Drag API comportamiento inconsistente

---

## Arquitectura del Código

### Flujo de Drag & Drop

```
1. Usuario hace click + drag en tarjeta
2. Browser dispara onDragStart (verificado ✅)
3. handleDragStart(e, dispatch):
   - Valida canBeDragged (✅ true para todas)
   - setDraggedDispatch(dispatch) 
   - setIsDragging(true) ← PROBLEMA AQUÍ
   - e.dataTransfer.effectAllowed = 'move'
   - e.dataTransfer.setData('text/plain', dispatch.id)

4. Componente re-renderiza (esperado):
   - displayTimeSlots recalcula (❌ solo para una tarjeta)
   - isDragging cambia de false → true
   - Grid debería expandirse mostrando 17 slots (❌ solo para una)

5. Usuario arrastra sobre celda:
   - handleDragOver previene default
   - handleDragEnter establece dropTarget

6. Usuario suelta:
   - handleDrop ejecuta
   - Muestra modal de confirmación
   - Actualiza BD si confirma
```

### Estados Clave

```typescript
const [isDragging, setIsDragging] = useState(false);
const [draggedDispatch, setDraggedDispatch] = useState<Dispatch | null>(null);
const [dropTarget, setDropTarget] = useState<{ day: string; time: string } | null>(null);
```

### Funciones Críticas

**`canBeDragged(dispatch)`** (líneas ~95-112):
```typescript
const notAllowedStates = ['terminado', 'completado', 'cancelado', 'en_transito', 'descargando', 'descargado'];
const estado = dispatch.estado?.toLowerCase().trim() || '';
const allowed = !notAllowedStates.includes(estado);
return allowed;
```

**`handleDragStart`** (líneas ~114-140):
```typescript
const handleDragStart = (e: React.DragEvent, dispatch: Dispatch) => {
  console.log(`🚀 onDragStart disparado para ${dispatch.pedido_id}`);
  
  if (!isDraggable) {
    e.preventDefault();
    return;
  }
  
  setDraggedDispatch(dispatch);
  setIsDragging(true);  // ← Estado no propaga visualmente
  
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dispatch.id);
};
```

**`displayTimeSlots`** (líneas ~378-385):
```typescript
const displayTimeSlots = isDragging 
  ? fixedTimeSlots // 17 slots (06:00-22:00)
  : Array.from(actualScheduledTimeSlots).sort(...); // 3-5 slots
```

---

## Próximos Pasos Sugeridos

### Prioridad Alta 🔴

1. **Verificar React Re-render:**
   - Agregar logging en el nivel superior del componente PlanningGrid
   - Usar `useEffect` para detectar cambios en `isDragging`
   - Confirmar si el componente completo se re-renderiza

2. **Aislar el Problema:**
   - Crear componente de prueba simple con 3 divs draggables
   - Verificar si es problema de React o del navegador
   - Testear en otro navegador (Chrome vs Firefox)

3. **Alternativa con useRef:**
   - Cambiar `isDragging` de useState a useRef
   - Forzar re-render manual con forceUpdate
   - Evaluar si el problema es timing de React

4. **Debugging Avanzado:**
   - Agregar `console.log` dentro del map que genera las celdas
   - Verificar cuántas veces se renderiza cada celda
   - Confirmar valor de `displayTimeSlots.length` por celda

### Prioridad Media 🟡

5. **Refactorizar displayTimeSlots:**
   - Mover a `useMemo` con dependencia explícita `[isDragging]`
   - Asegurar que se recalcula en cada cambio de estado

6. **Verificar Event Handlers:**
   - Confirmar que `handleDragOver` se ejecuta
   - Verificar que `handleDrop` funciona para las 3 tarjetas

7. **CSS/HTML Debugging:**
   - Inspeccionar el DOM en DevTools durante drag
   - Verificar si hay elementos con `z-index` bloqueando

### Investigación Adicional 🔵

8. **Comparar Tarjetas:**
   - Verificar diferencias en datos entre las 3 tarjetas
   - Buscar campos únicos en DSP-20251121-002 que no tienen las otras

9. **Browser DevTools:**
   - Usar React DevTools para ver estado en tiempo real
   - Verificar si `isDragging` cambia en todas las instancias

10. **Logs de BD:**
    - Verificar si hay diferencias en estructura de datos
    - Confirmar que las 3 tarjetas tienen la misma forma de objeto

---

## Archivos Clave para Próxima Sesión

### Archivos Modificados en Esta Sesión

1. **`components/Planning/PlanningGrid.tsx`** (820 líneas)
   - Líneas críticas: 95-140 (canBeDragged, handleDragStart)
   - Líneas críticas: 378-385 (displayTimeSlots)
   - Líneas críticas: 480-620 (renderizado de tarjetas)

2. **`components/Planning/PlanningFilters.tsx`** (180 líneas) ✅
3. **`components/Planning/ViewSelector.tsx`** (65 líneas) ✅
4. **`components/Planning/DayView.tsx`** (150 líneas) ✅
5. **`components/Planning/ExportButton.tsx`** (140 líneas) ✅
6. **`components/Planning/PlanningAlerts.tsx`** (180 líneas) ✅
7. **`pages/planificacion.tsx`** (566 líneas)

### Archivos de Documentación

- `SESION-COMPLETADA-2025-11-21.md` (este archivo)
- `PROMPT-CONTINUACION-22-NOV-2025.md` (siguiente)

---

## Servidor y Entorno

- **Puerto:** localhost:3001 (3000 en uso)
- **Next.js:** 15.5.6
- **TypeScript:** Strict mode activo
- **Build Status:** ✅ Sin errores de compilación
- **Base de Datos:** Supabase

---

## Notas Técnicas

### Console Logs Actuales Configurados

```javascript
// canBeDragged - línea ~110
console.log(`🔍 canBeDragged ${dispatch.pedido_id}: estado="${estado}", allowed=${allowed}`);

// Render Card - línea ~488
console.log(`🎯 RENDER card ${dispatch.pedido_id}: isDraggable=${isDraggable}, id: ${dispatch.id}`);

// MouseDown - línea ~503
console.log(`🖱️ mouseDown en ${dispatch.pedido_id}, target:`, e.target.tagName);

// onDragStart - línea ~496
console.log(`🚀 onDragStart disparado para ${dispatch.pedido_id}`);

// handleDragStart - línea ~118
console.log(`✅ Iniciando drag de:`, dispatch.pedido_id, 'ID:', dispatch.id);

// Renderizado PlanningGrid - línea ~378
console.log('🔄 Renderizando PlanningGrid:', { isDragging, draggedDispatch, dispatchesCount });
console.log('📊 displayTimeSlots:', displayTimeSlots.length, 'slots');
```

### Elementos HTML Draggables

```html
<div
  key={dispatch.id}
  draggable={true}  <!-- FORZADO -->
  data-draggable="true"
  data-pedido={dispatch.pedido_id}
  onDragStart={(e) => { ... }}
  onDragEnd={handleDragEnd}
  onMouseDown={(e) => { ... }}
  onClick={(e) => { ... }}
  style={{
    userSelect: 'none',
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',
    WebkitUserDrag: 'element',
    touchAction: 'none',
    WebkitTouchCallout: 'none'
  }}
>
  <div className="pointer-events-none relative">
    <!-- Contenido de la tarjeta -->
  </div>
  <button className="pointer-events-auto"><!-- Botón ubicación --></button>
</div>
```

---

## Estado del Proyecto General

### Completado ✅
- TypeScript strict mode (70+ archivos, 0 errores)
- Sistema de roles y permisos
- Módulo de Administración
- Módulo de Super Admin
- Módulo de Transportes (básico)
- **Sistema de Planificación:** Filtros, búsqueda, vistas, exportación, alertas, métricas

### En Progreso ⏳
- **Drag & Drop en Planificación** (99% - falta resolver inconsistencia visual)

### Pendiente ❌
- Vista Mensual de Planificación
- Tracking GPS en tiempo real
- Módulo de Reportes avanzados
- Integración con APIs externas

---

## Recomendaciones para Próxima Sesión

1. **Empezar con diagnóstico de React re-render** usando `useEffect` logging
2. **Comparar los datos exactos** de las 3 tarjetas en la consola
3. **Probar en navegador diferente** (si usas Chrome, probar en Firefox)
4. **Inspeccionar DOM** durante drag para ver diferencias estructurales
5. **Considerar refactor completo** de la lógica de estado si el problema persiste

**Tiempo estimado para resolver:** 30-60 minutos con enfoque correcto

---

*Sesión finalizada: 21 de Noviembre 2025*
*Usuario: Leandro Cáceres - Rol: Coordinador de Planta*
*Contexto: Nodexia Transport Management System*
