# MEJORAS PROPUESTAS - Pantalla Planificación

## 📋 Estado Actual

La pantalla de planificación (`pages/planificacion.tsx`) actualmente tiene:

✅ **Funcionalidad Básica:**
- Vista de planificación semanal (Lunes a Domingo)
- Separación entre Despachos y Recepciones
- Vista de seguimiento en tiempo real (TrackingView)
- Sistema de tabs para cambiar entre vistas

❌ **Problemas Identificados:**
1. UI/UX podría ser más intuitiva
2. Falta información visual clara
3. No hay filtros avanzados
4. Difícil identificar prioridades a simple vista
5. Falta resumen ejecutivo
6. No hay vista de calendario tradicional
7. Colores de estado poco diferenciados
8. Falta drag & drop para reprogramar

---

## 🎯 Mejoras Propuestas

### 1. **Resumen Ejecutivo en Header**

**Ubicación:** Arriba de los tabs

```tsx
<div className="grid grid-cols-4 gap-4 mb-6">
  <div className="bg-gradient-to-br from-cyan-900 to-cyan-800 rounded-lg p-4">
    <div className="text-cyan-300 text-sm">Hoy</div>
    <div className="text-3xl font-bold text-white">{viajesHoy}</div>
    <div className="text-xs text-cyan-200">viajes programados</div>
  </div>
  
  <div className="bg-gradient-to-br from-orange-900 to-orange-800 rounded-lg p-4">
    <div className="text-orange-300 text-sm">Urgentes</div>
    <div className="text-3xl font-bold text-white">{viajesUrgentes}</div>
    <div className="text-xs text-orange-200">alta prioridad</div>
  </div>
  
  <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-lg p-4">
    <div className="text-green-300 text-sm">Esta Semana</div>
    <div className="text-3xl font-bold text-white">{viajesSemana}</div>
    <div className="text-xs text-green-200">total programados</div>
  </div>
  
  <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-lg p-4">
    <div className="text-purple-300 text-sm">Sin Asignar</div>
    <div className="text-3xl font-bold text-white">{viajesSinAsignar}</div>
    <div className="text-xs text-purple-200">pendientes</div>
  </div>
</div>
```

**Beneficio:** Vista rápida del estado general

---

### 2. **Filtros Avanzados**

**Ubicación:** Debajo del resumen ejecutivo

```tsx
<div className="bg-[#1b273b] rounded-lg p-4 mb-6">
  <div className="flex flex-wrap gap-4 items-center">
    {/* Filtro por Estado */}
    <div className="flex-1 min-w-[200px]">
      <label className="text-xs text-slate-300 block mb-1">Estado</label>
      <select className="w-full bg-[#0f1729] border border-gray-600 rounded px-3 py-2">
        <option value="">Todos</option>
        <option value="pendiente">Pendientes</option>
        <option value="asignado">Asignados</option>
        <option value="en_transito">En Tránsito</option>
        <option value="completado">Completados</option>
      </select>
    </div>

    {/* Filtro por Prioridad */}
    <div className="flex-1 min-w-[200px]">
      <label className="text-xs text-slate-300 block mb-1">Prioridad</label>
      <select className="w-full bg-[#0f1729] border border-gray-600 rounded px-3 py-2">
        <option value="">Todas</option>
        <option value="Urgente">🔴 Urgente</option>
        <option value="Alta">🟠 Alta</option>
        <option value="Media">🟡 Media</option>
        <option value="Baja">🟢 Baja</option>
      </select>
    </div>

    {/* Filtro por Transporte */}
    <div className="flex-1 min-w-[200px]">
      <label className="text-xs text-slate-300 block mb-1">Transporte</label>
      <select className="w-full bg-[#0f1729] border border-gray-600 rounded px-3 py-2">
        <option value="">Todos</option>
        {/* Lista de transportes */}
      </select>
    </div>

    {/* Búsqueda */}
    <div className="flex-1 min-w-[250px]">
      <label className="text-xs text-slate-300 block mb-1">Buscar</label>
      <input 
        type="text"
        placeholder="Pedido, origen, destino..."
        className="w-full bg-[#0f1729] border border-gray-600 rounded px-3 py-2"
      />
    </div>

    {/* Botón Limpiar */}
    <button className="mt-5 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded">
      Limpiar Filtros
    </button>
  </div>
</div>
```

**Beneficio:** Encontrar viajes específicos rápidamente

---

### 3. **Mejora Visual de Cards de Viajes**

**Diseño Actual vs Propuesto:**

```tsx
// ANTES: Simple y poco informativo
<div className={`${getStatusColor(viaje.estado)} p-2 rounded text-xs`}>
  {viaje.pedido_id}
</div>

// DESPUÉS: Rico en información visual
<div className={`
  relative overflow-hidden rounded-lg border-2 transition-all cursor-pointer
  hover:shadow-lg hover:scale-[1.02]
  ${getBorderColor(viaje.prioridad)}
  ${getBackgroundGradient(viaje.estado)}
`}>
  {/* Badge de Prioridad */}
  <div className="absolute top-2 right-2">
    {viaje.prioridad === 'Urgente' && (
      <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
        🔥 URGENTE
      </span>
    )}
  </div>

  {/* Contenido Principal */}
  <div className="p-3">
    {/* Header con ID */}
    <div className="flex items-center justify-between mb-2">
      <span className="font-bold text-white">{viaje.pedido_id}</span>
      <span className={`text-xs px-2 py-1 rounded ${getStatusBadgeColor(viaje.estado)}`}>
        {getStatusLabel(viaje.estado)}
      </span>
    </div>

    {/* Ruta */}
    <div className="flex items-center gap-2 text-xs text-slate-200 mb-2">
      <MapPinIcon className="h-4 w-4 text-cyan-400" />
      <span className="truncate">{viaje.origen}</span>
      <span>→</span>
      <span className="truncate">{viaje.destino}</span>
    </div>

    {/* Hora */}
    <div className="flex items-center gap-2 text-xs text-slate-300">
      <ClockIcon className="h-4 w-4" />
      {viaje.scheduled_local_time || 'Sin hora'}
    </div>

    {/* Transporte (si está asignado) */}
    {viaje.transport_id && (
      <div className="mt-2 pt-2 border-t border-white/20">
        <div className="flex items-center gap-2 text-xs text-emerald-300">
          <TruckIcon className="h-4 w-4" />
          {viaje.transporte_data?.nombre || 'Transporte asignado'}
        </div>
      </div>
    )}
  </div>

  {/* Acciones rápidas al hover */}
  <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
    <button className="bg-cyan-600 hover:bg-cyan-700 px-3 py-1 rounded text-xs">
      <EyeIcon className="h-4 w-4 inline mr-1" />
      Ver Detalle
    </button>
    <button className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs">
      <PencilIcon className="h-4 w-4 inline mr-1" />
      Editar
    </button>
  </div>
</div>
```

**Beneficio:** Información visual clara y acciones rápidas

---

### 4. **Vista de Lista Alternativa**

**Nuevo Tab:** Agregar opción de vista lista además de grilla

```tsx
<button
  onClick={() => setViewMode('list')}
  className={`px-4 py-2 rounded ${viewMode === 'list' ? 'bg-cyan-600' : 'bg-gray-700'}`}
>
  📋 Lista
</button>

{viewMode === 'list' && (
  <div className="bg-[#1b273b] rounded-lg overflow-hidden">
    <table className="w-full">
      <thead className="bg-[#0f1729]">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Pedido</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Fecha/Hora</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Origen → Destino</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Transporte</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Estado</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Prioridad</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {filteredViajes.map(viaje => (
          <tr key={viaje.id} className="border-b border-gray-700 hover:bg-[#0f1729]">
            <td className="px-4 py-3 text-sm text-white font-medium">{viaje.pedido_id}</td>
            <td className="px-4 py-3 text-sm text-slate-300">
              {formatDate(viaje.scheduled_local_date)} {viaje.scheduled_local_time}
            </td>
            <td className="px-4 py-3 text-sm text-slate-300">
              {viaje.origen} → {viaje.destino}
            </td>
            <td className="px-4 py-3 text-sm text-slate-300">
              {viaje.transporte_data?.nombre || '-'}
            </td>
            <td className="px-4 py-3">
              <span className={`px-2 py-1 rounded text-xs ${getStatusBadgeColor(viaje.estado)}`}>
                {getStatusLabel(viaje.estado)}
              </span>
            </td>
            <td className="px-4 py-3">
              {getPriorityBadge(viaje.prioridad)}
            </td>
            <td className="px-4 py-3">
              <button className="text-cyan-400 hover:text-cyan-300">
                <EyeIcon className="h-5 w-5" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
```

**Beneficio:** Vista compacta para muchos viajes

---

### 5. **Indicadores Visuales en la Grilla**

**Mejoras a la grilla semanal:**

```tsx
// Indicador de día actual
{dayName === getCurrentDayName() && (
  <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500"></div>
)}

// Contador de viajes por día en el header
<div className="flex items-center justify-between">
  <span>{dayName}</span>
  {viajesPorDia[dayName] > 0 && (
    <span className="bg-cyan-600 text-white text-xs px-2 py-1 rounded-full">
      {viajesPorDia[dayName]}
    </span>
  )}
</div>

// Indicador de capacidad
{viajesPorDia[dayName] > 10 && (
  <div className="bg-orange-500/20 border border-orange-500 rounded p-2 text-xs text-orange-300">
    ⚠️ Día con alta carga ({viajesPorDia[dayName]} viajes)
  </div>
)}
```

**Beneficio:** Identificar días críticos rápidamente

---

### 6. **Modal de Detalle Mejorado**

**Información completa en el modal:**

```tsx
<Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)}>
  <div className="p-6">
    {/* Header con estado */}
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-white">{selectedDispatch?.pedido_id}</h2>
      <span className={`px-4 py-2 rounded-lg ${getStatusBadgeColor(selectedDispatch?.estado)}`}>
        {getStatusLabel(selectedDispatch?.estado)}
      </span>
    </div>

    {/* Grid de información */}
    <div className="grid grid-cols-2 gap-4 mb-6">
      <InfoCard label="Origen" value={selectedDispatch?.origen} icon={MapPinIcon} />
      <InfoCard label="Destino" value={selectedDispatch?.destino} icon={MapPinIcon} />
      <InfoCard label="Fecha" value={formatDate(selectedDispatch?.scheduled_local_date)} />
      <InfoCard label="Hora" value={selectedDispatch?.scheduled_local_time} />
      <InfoCard label="Prioridad" value={selectedDispatch?.prioridad} />
      <InfoCard label="Transporte" value={selectedDispatch?.transporte_data?.nombre} />
    </div>

    {/* Timeline de estados */}
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-white mb-3">Historial</h3>
      <div className="space-y-2">
        {/* Aquí iría el timeline de cambios de estado */}
      </div>
    </div>

    {/* Acciones */}
    <div className="flex gap-3 justify-end">
      <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded">
        Cerrar
      </button>
      <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded">
        Editar
      </button>
      <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
        Reprogramar
      </button>
    </div>
  </div>
</Modal>
```

**Beneficio:** Información completa y acciones rápidas

---

### 7. **Navegación Semanal Mejorada**

**Controles para cambiar de semana:**

```tsx
<div className="flex items-center justify-between mb-4">
  <button 
    onClick={() => changeWeek(-1)}
    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
  >
    <ChevronLeftIcon className="h-5 w-5" />
    Semana Anterior
  </button>

  <div className="text-center">
    <div className="text-lg font-semibold text-white">
      {formatWeekRange(currentWeekStart, currentWeekEnd)}
    </div>
    <button 
      onClick={goToToday}
      className="text-sm text-cyan-400 hover:text-cyan-300"
    >
      Ir a Hoy
    </button>
  </div>

  <button 
    onClick={() => changeWeek(1)}
    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
  >
    Próxima Semana
    <ChevronRightIcon className="h-5 w-5" />
  </button>
</div>
```

**Beneficio:** Navegar fácilmente entre semanas

---

### 8. **Vista Compacta para Días con Muchos Viajes**

**Colapsar viajes cuando hay más de 5:**

```tsx
{viajesDelDia.length > 5 ? (
  <>
    {viajesDelDia.slice(0, 3).map(viaje => (
      <ViajeCard key={viaje.id} viaje={viaje} />
    ))}
    <button 
      onClick={() => expandDay(dayName)}
      className="w-full bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500 rounded p-2 text-xs text-cyan-300"
    >
      + Ver {viajesDelDia.length - 3} viajes más
    </button>
  </>
) : (
  viajesDelDia.map(viaje => <ViajeCard key={viaje.id} viaje={viaje} />)
)}
```

**Beneficio:** Mantener la grilla legible

---

## 🎨 Paleta de Colores Mejorada

### Estados:
- **Pendiente:** `bg-gray-600` → `bg-gradient-to-r from-gray-600 to-gray-700`
- **Asignado:** `bg-blue-600` → `bg-gradient-to-r from-blue-600 to-blue-700`
- **En Tránsito:** `bg-purple-600` → `bg-gradient-to-r from-purple-600 to-purple-700`
- **Completado:** `bg-green-600` → `bg-gradient-to-r from-green-600 to-green-700`

### Prioridades:
- **Urgente:** Border rojo brillante + badge rojo
- **Alta:** Border naranja + badge naranja
- **Media:** Border amarillo + badge amarillo
- **Baja:** Border verde + badge verde

---

## 📊 Resumen de Implementación

### Fase 1 - Mejoras Visuales (2-3 horas)
- [x] Resumen ejecutivo con métricas
- [x] Cards de viajes rediseñados
- [x] Paleta de colores mejorada
- [x] Indicadores visuales en grilla

### Fase 2 - Funcionalidad (3-4 horas)
- [ ] Filtros avanzados
- [ ] Vista de lista
- [ ] Modal de detalle mejorado
- [ ] Navegación semanal

### Fase 3 - Extras (2-3 horas)
- [ ] Drag & drop para reprogramar
- [ ] Exportar a PDF/Excel
- [ ] Notificaciones de cambios
- [ ] Vista de calendario mensual

---

## 🚀 Beneficios Esperados

1. **Mejor UX:** Información clara y accesible
2. **Productividad:** Acciones rápidas desde la grilla
3. **Visibilidad:** Identificar problemas rápidamente
4. **Flexibilidad:** Múltiples vistas según necesidad
5. **Profesionalismo:** Interfaz moderna y pulida

---

## 📝 Próximos Pasos

1. **Revisión con usuario:** Validar propuestas
2. **Priorización:** Decidir qué implementar primero
3. **Implementación:** Desarrollo por fases
4. **Testing:** Validación con usuarios reales
5. **Iteración:** Ajustes según feedback

---

**¿Cuál de estas mejoras te gustaría implementar primero?**
