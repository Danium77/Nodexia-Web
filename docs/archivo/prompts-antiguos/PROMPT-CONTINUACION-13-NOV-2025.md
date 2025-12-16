# PROMPT DE CONTINUACIÓN - 13 de Noviembre 2025

## 📍 ESTADO ACTUAL

Estamos implementando **mejoras en la pantalla de Planificación** del coordinador de planta.

### Completado en esta sesión (12 Nov):
- ✅ Sistema de notificaciones completo y funcional
- ✅ Cancelación/reasignación de viajes operativa
- ✅ AutoComplete deshabilitado en formularios
- ✅ Limpieza de datos al reasignar viajes

### Iniciado (12 Nov - En progreso):
- 🔄 Mejoras visuales en Planificación (Fase 1)
- 🔄 Drag & Drop para reprogramar viajes

---

## 🎯 TRABAJO EN PROGRESO

### Mejoras Planificación - Fase 1

#### 1. Resumen Ejecutivo ✅
**Archivo:** `pages/planificacion.tsx`

**Implementado:**
- Cards con métricas: Hoy, Urgentes, Esta Semana, Sin Asignar
- Gradientes de colores por categoría
- Cálculo dinámico de métricas

**Código agregado:**
```typescript
const metrics = React.useMemo(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const viajesHoy = dispatches.filter(v => v.scheduled_local_date === todayStr).length;
  const viajesUrgentes = dispatches.filter(v => v.prioridad === 'Urgente' || v.prioridad === 'Alta').length;
  const viajesSinAsignar = dispatches.filter(v => !v.transport_id && (v.estado === 'pendiente' || v.estado === 'transporte_asignado')).length;

  return {
    hoy: viajesHoy,
    urgentes: viajesUrgentes,
    semana: dispatches.length,
    sinAsignar: viajesSinAsignar
  };
}, [dispatches]);
```

#### 2. Drag & Drop para Reprogramar 🔄
**Archivo:** `components/Planning/PlanningGrid.tsx`

**Funcionalidad:**
- Arrastrar viajes pendientes/asignados a nuevas fechas/horas
- Modal de confirmación antes de guardar
- Update a BD (tabla `despachos`: `scheduled_local_date`, `scheduled_local_time`)
- Restricciones: Solo viajes en estados `pendiente`, `transporte_asignado`, `camion_asignado`

**Funciones agregadas:**
```typescript
- canBeDragged(dispatch): Verifica si se puede arrastrar
- handleDragStart(): Inicia el arrastre
- handleDragOver(): Permite soltar
- handleDrop(): Procesa el drop y muestra modal
- confirmReschedule(): Guarda en BD y recarga datos
```

**Estado actual:** Funciones creadas, falta integrar en el render de cards

#### 3. Cards Visuales Mejorados 🔄
**Pendiente implementar:**
- Gradientes según prioridad
- Border colors según prioridad (rojo=Urgente, naranja=Alta, amarillo=Media, verde=Baja)
- Badge de prioridad si es Urgente
- Iconos para transporte, hora, origen/destino
- Atributo `draggable` en cards que se pueden arrastrar
- Cursor `grab` vs `not-allowed`

---

## 📝 PRÓXIMOS PASOS

### Paso 1: Completar Cards Mejorados con Drag & Drop
Modificar el render de las cards en `PlanningGrid.tsx` (líneas 340-440) para:

```tsx
<div
  key={dispatch.id}
  draggable={canBeDragged(dispatch)}
  onDragStart={(e) => handleDragStart(e, dispatch)}
  className={`
    group relative p-3 rounded-lg mb-2 last:mb-0 
    transition-all duration-300 border-2
    ${getPriorityBorderColor(dispatch.prioridad)}
    bg-gradient-to-br ${getPriorityGradient(dispatch.prioridad)}
    ${canBeDragged(dispatch) 
      ? 'cursor-grab hover:cursor-grab active:cursor-grabbing hover:shadow-lg hover:scale-105' 
      : 'cursor-not-allowed opacity-60'
    }
    ${selectedDispatch?.id === dispatch.id ? 'ring-2 ring-cyan-500' : ''}
  `}
>
  {/* Badge de Prioridad si es Urgente */}
  {dispatch.prioridad === 'Urgente' && (
    <div className="absolute -top-2 -right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg z-10">
      🔥 URGENTE
    </div>
  )}

  {/* Header con ID y Estado */}
  <div className="flex items-center justify-between mb-2">
    <span className="font-bold text-white text-sm">{dispatch.pedido_id}</span>
    <span className={`text-xs px-2 py-1 rounded ${getStatusBadgeColor(dispatch.estado)}`}>
      {getStatusLabel(dispatch.estado)}
    </span>
  </div>

  {/* Ruta */}
  <div className="flex items-center gap-2 text-xs text-slate-200 mb-2">
    <MapPinIcon className="h-4 w-4 text-cyan-400 flex-shrink-0" />
    <span className="truncate">{dispatch.origen}</span>
    <span className="flex-shrink-0">→</span>
    <span className="truncate">{dispatch.destino}</span>
  </div>

  {/* Hora */}
  <div className="flex items-center gap-2 text-xs text-slate-300 mb-2">
    <ClockIcon className="h-4 w-4 flex-shrink-0" />
    {dispatch.scheduled_local_time || 'Sin hora'}
  </div>

  {/* Transporte (si está asignado) */}
  {dispatch.transport_id && (
    <div className="flex items-center gap-2 text-xs text-emerald-300">
      <TruckIcon className="h-4 w-4 flex-shrink-0" />
      <span className="truncate">{dispatch.transporte_data?.nombre || 'Transporte asignado'}</span>
    </div>
  )}

  {/* Indicador de drag */}
  {canBeDragged(dispatch) && (
    <div className="absolute bottom-1 right-1 text-xs text-slate-500">
      ⋮⋮
    </div>
  )}
</div>
```

### Paso 2: Agregar Zonas Drop en Celdas
Modificar las celdas vacías para que acepten drops:

```tsx
<td 
  key={`${day}-${time}`} 
  className="px-2 py-2 border-l border-gray-800 align-top"
  onDragOver={handleDragOver}
  onDrop={(e) => handleDrop(e, day, time)}
>
  {despachosInSlot.length > 0 ? (
    // ... cards aquí
  ) : (
    <div className="h-full min-h-[80px] w-full border-2 border-dashed border-gray-700 rounded-md 
                    opacity-20 hover:opacity-40 hover:border-cyan-500 transition-all
                    flex items-center justify-center">
      <span className="text-gray-600 text-xs">Soltar aquí</span>
    </div>
  )}
</td>
```

### Paso 3: Modal de Confirmación
Agregar al final del componente (antes del último `</div>`):

```tsx
{/* Modal de Confirmación de Reprogramación */}
{showRescheduleModal && rescheduleData && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
    <div className="bg-[#1b273b] rounded-lg shadow-xl max-w-md w-full border border-cyan-700">
      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-4">
          📅 Confirmar Reprogramación
        </h3>

        <div className="space-y-4 mb-6">
          <div>
            <div className="text-sm text-slate-400 mb-1">Viaje</div>
            <div className="text-white font-semibold">{rescheduleData.dispatch.pedido_id}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-slate-400 mb-1">Fecha Actual</div>
              <div className="text-white">{rescheduleData.dispatch.scheduled_local_date}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400 mb-1">Nueva Fecha</div>
              <div className="text-cyan-400 font-semibold">{rescheduleData.newDate}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-slate-400 mb-1">Hora Actual</div>
              <div className="text-white">{rescheduleData.dispatch.scheduled_local_time}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400 mb-1">Nueva Hora</div>
              <div className="text-cyan-400 font-semibold">{rescheduleData.newTime}</div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3 mb-6">
          <p className="text-sm text-yellow-300">
            ⚠️ Esta acción actualizará la fecha y hora del viaje. 
            {rescheduleData.dispatch.transport_id && ' El transporte asignado será notificado.'}
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={() => {
              setShowRescheduleModal(false);
              setRescheduleData(null);
            }}
            disabled={rescheduling}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={confirmReschedule}
            disabled={rescheduling}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {rescheduling ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Reprogramando...
              </>
            ) : (
              '✓ Confirmar'
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

### Paso 4: Indicadores Visuales en la Grilla
Agregar en el header de cada columna (día):

```tsx
{/* Indicador de día actual */}
{dayName === getCurrentDayName() && (
  <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500"></div>
)}

{/* Contador de viajes */}
{viajesPorDia[dayName] > 0 && (
  <span className="bg-cyan-600 text-white text-xs px-2 py-1 rounded-full ml-2">
    {viajesPorDia[dayName]}
  </span>
)}
```

---

## 🔧 ARCHIVOS MODIFICADOS

### Completados:
- ✅ `pages/planificacion.tsx` - Resumen ejecutivo agregado

### En Progreso:
- 🔄 `components/Planning/PlanningGrid.tsx` - Drag & drop y cards mejorados

---

## 📊 TESTING REQUERIDO

Una vez completada la implementación, probar:

1. **Resumen Ejecutivo:**
   - Verificar que métricas se calculan correctamente
   - Verificar que se actualizan al cambiar datos

2. **Drag & Drop:**
   - Arrastrar viaje pendiente a nueva fecha/hora → Debe abrir modal
   - Confirmar reprogramación → Debe actualizar BD y recargar
   - Intentar arrastrar viaje en tránsito → NO debe permitir
   - Soltar en celda con otros viajes → Debe agregar a la lista

3. **Cards Mejorados:**
   - Viajes urgentes muestran badge rojo
   - Border color correcto según prioridad
   - Iconos visibles y legibles
   - Hover funciona correctamente

4. **Indicadores:**
   - Día actual marcado con línea cyan
   - Contadores de viajes correctos

---

## ⏭️ SIGUIENTE FASE

Una vez completada Fase 1, continuar con:

**Fase 2 - Funcionalidad Avanzada:**
1. Filtros avanzados (estado, prioridad, transporte, búsqueda)
2. Vista de lista alternativa (tabla compacta)
3. Modal de detalle mejorado
4. Navegación semanal (anterior/siguiente, ir a hoy)

---

## 💡 NOTAS TÉCNICAS

### Estructura de datos del viaje:
```typescript
{
  id: string;                    // ID del viaje
  despacho_id: string;           // ID del despacho padre
  pedido_id: string;             // ID legible
  origen: string;
  destino: string;
  estado: string;                // 'pendiente', 'transporte_asignado', etc.
  scheduled_local_date: string;  // 'YYYY-MM-DD'
  scheduled_local_time: string;  // 'HH:MM:SS'
  prioridad: string;             // 'Urgente', 'Alta', 'Media', 'Baja'
  transport_id: string | null;   // UUID o null
  transporte_data?: { nombre: string };
}
```

### Update a BD para reprogramar:
```typescript
await supabase
  .from('despachos')
  .update({
    scheduled_local_date: newDate,
    scheduled_local_time: newTime
  })
  .eq('id', despacho_id);
```

---

**Fecha:** 12-13 de Noviembre 2025
**Estado:** Fase 1 en progreso - 60% completado
