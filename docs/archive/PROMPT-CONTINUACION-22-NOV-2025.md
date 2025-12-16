# Prompt de Continuación - Sesión 22 Noviembre 2025

## Contexto Inmediato

Estamos trabajando en la **pantalla de Planificación** del sistema Nodexia (rol: Coordinador de Planta). La funcionalidad de **Drag & Drop para reprogramar viajes** está 95% completa pero tiene un problema crítico de inconsistencia visual.

---

## Problema Actual: Drag & Drop Inconsistente

### Síntoma
**Solo 1 de 3 tarjetas permite arrastrar y soltar completamente**, a pesar de que las 3 disparan los eventos correctos.

### Tarjetas de Prueba
```
1. DSP-20251120-001 - Viaje 1 (estado: camion_asignado) ❌ No funciona visualmente
2. DSP-20251121-001 (estado: pendiente_transporte) ❌ No funciona visualmente
3. DSP-20251121-002 - Viaje 1 (estado: transporte_asignado) ✅ Funciona perfectamente
```

### Evidencia de la Sesión Anterior

**Console Logs Confirmados:**
```javascript
// Las 3 tarjetas se renderizan correctamente
🎯 RENDER card DSP-20251120-001 - Viaje 1: isDraggable=true
🎯 RENDER card DSP-20251121-001: isDraggable=true
🎯 RENDER card DSP-20251121-002 - Viaje 1: isDraggable=true

// Las 3 reciben eventos de mouse
🖱️ mouseDown en DSP-20251120-001 - Viaje 1, target: DIV
🖱️ mouseDown en DSP-20251121-001, target: DIV
🖱️ mouseDown en DSP-20251121-002 - Viaje 1, target: DIV

// Las 3 disparan onDragStart ✅ (ESTO ES NUEVO)
🚀 onDragStart disparado para DSP-20251120-001 - Viaje 1
🚀 onDragStart disparado para DSP-20251121-001
🚀 onDragStart disparado para DSP-20251121-002 - Viaje 1
```

**Comportamiento Visual:**
- ✅ DSP-20251121-002: Grid se expande mostrando 17 slots horarios, drop zones visibles, puede soltar
- ❌ DSP-20251121-001: Grid NO se expande, permanece con 3-5 slots, no muestra drop zones
- ❌ DSP-20251120-001: Grid NO se expande, permanece con 3-5 slots, no muestra drop zones

---

## ¿Qué Funciona Correctamente?

### Completado al 100% ✅

1. **Filtros de Planificación**
   - Búsqueda por texto (pedido, origen, destino)
   - 6 filtros: estado, prioridad, transporte, fechas
   - Panel expandible, botón limpiar

2. **Selector de Vistas**
   - 3 opciones: Día / Semana / Mes
   - Vista Día y Semana funcionales

3. **Vista de Día**
   - Timeline con agrupación por hora
   - Solo viajes del día actual
   - Grid responsivo

4. **Exportación**
   - CSV (UTF-8 BOM) y Excel
   - 10 columnas de datos
   - Respeta filtros

5. **Sistema de Alertas**
   - 4 tipos: Conflictos, Urgentes, Hoy incompleto, Sin programar
   - Desechables, detección inteligente

6. **Dashboard de Métricas**
   - 4 tarjetas con contadores dinámicos

### Drag & Drop: Lógica Backend ✅

- ✅ `canBeDragged()` valida estados correctamente
- ✅ `handleDragStart()` se ejecuta para todas las tarjetas
- ✅ `setIsDragging(true)` se llama
- ✅ `setDraggedDispatch(dispatch)` guarda el despacho
- ✅ `handleDrop()` actualiza la base de datos
- ✅ Modal de confirmación funciona

---

## ¿Qué NO Funciona?

### Drag & Drop: Visualización ❌

**Problema Central:**
El estado `isDragging` se establece correctamente en `handleDragStart`, pero **React no re-renderiza correctamente** para mostrar:

1. Grid expandida (17 slots en lugar de 3-5)
2. Drop zones visibles (celdas con borde punteado)
3. Feedback visual durante drag

**Código Sospechoso:**
```typescript
// Línea ~378 en PlanningGrid.tsx
const displayTimeSlots = isDragging 
  ? fixedTimeSlots // 17 slots (06:00-22:00) ← Debería activarse
  : Array.from(actualScheduledTimeSlots).sort(...); // 3-5 slots ← Se queda aquí
```

**Hipótesis:**
- React State Batching: El cambio de `isDragging` no propaga a todo el árbol de componentes
- Closure sobre estado obsoleto: `displayTimeSlots` captura el valor viejo
- Conditional Rendering Issue: La evaluación de `isDragging` no se actualiza
- React no detecta que debe re-renderizar las celdas de la tabla

---

## Archivos Críticos

### Archivo Principal: `components/Planning/PlanningGrid.tsx` (820 líneas)

**Secciones Clave:**

1. **Estados (líneas ~50-55):**
```typescript
const [isDragging, setIsDragging] = useState(false);
const [draggedDispatch, setDraggedDispatch] = useState<Dispatch | null>(null);
const [dropTarget, setDropTarget] = useState<{ day: string; time: string } | null>(null);
```

2. **canBeDragged (líneas ~95-112):**
```typescript
const canBeDragged = (dispatch: Dispatch) => {
  const notAllowedStates = ['terminado', 'completado', 'cancelado', 'en_transito', 'descargando', 'descargado'];
  const estado = dispatch.estado?.toLowerCase().trim() || '';
  const allowed = !notAllowedStates.includes(estado);
  console.log(`🔍 canBeDragged ${dispatch.pedido_id}: estado="${estado}", allowed=${allowed}`);
  return allowed;
};
```

3. **handleDragStart (líneas ~114-140):**
```typescript
const handleDragStart = (e: React.DragEvent, dispatch: Dispatch) => {
  console.log(`🚀 onDragStart disparado para ${dispatch.pedido_id}`);
  
  if (!isDraggable) {
    console.log(`❌ Cancelando drag - no permitido`);
    e.preventDefault();
    return;
  }
  
  setDraggedDispatch(dispatch);
  setIsDragging(true);  // ← PROBLEMA: No propaga visualmente
  
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dispatch.id);
};
```

4. **displayTimeSlots (líneas ~378-385):**
```typescript
console.log('🔄 Renderizando PlanningGrid:', { isDragging, draggedDispatch, dispatchesCount });

const displayTimeSlots = isDragging 
  ? fixedTimeSlots // Mostrar todas las franjas durante drag
  : Array.from(actualScheduledTimeSlots).sort((a, b) => { ... });

console.log('📊 displayTimeSlots:', displayTimeSlots.length, 'slots');
```

5. **Renderizado de Tarjetas (líneas ~480-620):**
```typescript
despachosInSlot.map(dispatch => {
  const isBeingDragged = draggedDispatch?.id === dispatch.id;
  const isDraggable = canBeDragged(dispatch);
  
  return (
    <div
      key={dispatch.id}
      draggable={true}  // ← FORZADO en sesión anterior
      data-draggable="true"
      data-pedido={dispatch.pedido_id}
      onDragStart={(e) => { ... }}
      onDragEnd={handleDragEnd}
      onMouseDown={(e) => { ... }}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitUserDrag: 'element',
        touchAction: 'none',
        // ... múltiples propiedades anti-select
      }}
    >
      <div className="pointer-events-none relative">
        {/* Contenido de la tarjeta */}
      </div>
    </div>
  );
})
```

---

## Estrategia Sugerida para Esta Sesión

### Paso 1: Diagnóstico con useEffect (5 min)

Agregar logging para confirmar que `isDragging` cambia:

```typescript
useEffect(() => {
  console.log('🔥 isDragging cambió a:', isDragging);
  console.log('🔥 draggedDispatch:', draggedDispatch?.pedido_id);
  console.log('🔥 displayTimeSlots.length:', displayTimeSlots.length);
}, [isDragging, draggedDispatch]);
```

### Paso 2: Forzar Recalculo con useMemo (10 min)

Cambiar `displayTimeSlots` a `useMemo`:

```typescript
const displayTimeSlots = useMemo(() => {
  console.log('♻️ Recalculando displayTimeSlots con isDragging:', isDragging);
  return isDragging 
    ? fixedTimeSlots 
    : Array.from(actualScheduledTimeSlots).sort(...);
}, [isDragging, actualScheduledTimeSlots]);
```

### Paso 3: Verificar Re-render de Celdas (5 min)

Agregar logging en el map de celdas:

```typescript
displayTimeSlots.map((time, timeIndex) => {
  console.log(`📍 Renderizando celda ${time}, total slots: ${displayTimeSlots.length}`);
  return <tr>...</tr>;
})
```

### Paso 4: Comparar Datos de Tarjetas (5 min)

Imprimir objeto completo de cada dispatch:

```typescript
console.log('🔍 Dispatch completo:', JSON.stringify(dispatch, null, 2));
```

### Paso 5: Solución Alternativa - forceUpdate (si falla lo anterior)

```typescript
const [, forceUpdate] = useReducer(x => x + 1, 0);

const handleDragStart = (e: React.DragEvent, dispatch: Dispatch) => {
  setDraggedDispatch(dispatch);
  setIsDragging(true);
  forceUpdate(); // ← Forzar re-render
  // ...
};
```

---

## Comandos Útiles

```powershell
# Servidor en ejecución
npm run dev  # localhost:3001

# Ver logs en tiempo real
# (Ya en ejecución en terminal)

# Build para verificar errores TypeScript
npm run build
```

---

## Contexto del Sistema

**Proyecto:** Nodexia Transport Management System  
**Usuario:** Leandro Cáceres  
**Rol Activo:** Coordinador de Planta  
**Pantalla:** `/planificacion` (Planning Screen)  
**Base de Datos:** Supabase  
**Framework:** Next.js 15.5.6, TypeScript Strict  

---

## Objetivo de Esta Sesión

**Resolver el problema de inconsistencia visual en Drag & Drop** para que las 3 tarjetas (y cualquier tarjeta con estado permitido) puedan ser arrastradas y soltadas correctamente.

**Criterio de Éxito:**
- ✅ Las 3 tarjetas de prueba muestran grid expandida al arrastrar
- ✅ Drop zones visibles para las 3 tarjetas
- ✅ Feedback visual consistente (opacidad, ring, scale)
- ✅ Modal de confirmación aparece al soltar
- ✅ Base de datos se actualiza correctamente

**Tiempo Estimado:** 30-60 minutos

---

## Instrucción para GitHub Copilot

```
Hola! Estoy continuando la sesión de ayer sobre Drag & Drop en la pantalla de Planificación.

PROBLEMA: Solo 1 de 3 tarjetas permite drag & drop visual completo, aunque las 3 disparan onDragStart correctamente.

Las 3 tarjetas tienen:
- ✅ draggable={true}
- ✅ onDragStart se ejecuta
- ✅ canBeDragged() retorna true
- ✅ mouseDown funciona

Pero solo DSP-20251121-002 - Viaje 1 muestra:
- Grid expandida (17 slots)
- Drop zones visibles
- Feedback visual completo

Las otras 2 tarjetas (DSP-20251121-001 y DSP-20251120-001) NO muestran estos cambios visuales.

Hipótesis: El estado isDragging cambia pero React no re-renderiza correctamente el componente para actualizar displayTimeSlots.

Archivo principal: components/Planning/PlanningGrid.tsx (líneas críticas: 378-385, 480-620)

Por favor, ayúdame a diagnosticar y resolver este problema usando la estrategia sugerida en PROMPT-CONTINUACION-22-NOV-2025.md
```

---

*Documento preparado: 21 de Noviembre 2025*  
*Próxima sesión: 22 de Noviembre 2025*
