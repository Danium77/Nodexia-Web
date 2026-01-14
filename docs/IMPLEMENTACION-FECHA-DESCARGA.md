# 📦 Implementación Fecha Programada de Descarga

## Decisión de Diseño

Basado en **benchmarking de plataformas líderes**:

| Plataforma | Modelo | Complejidad | Caso de Uso |
|------------|--------|-------------|-------------|
| **Uber Freight** | Campo único + ventana | Media | ✅ Recomendado |
| **Amazon Logistics** | Campo único + ventana | Media | ✅ Recomendado |
| **FedEx/UPS/DHL** | Sistema de eventos | Alta | Logística multi-punto |
| **Shopify** | Campo simple | Baja | E-commerce básico |

**Elegimos**: **Modelo de Uber Freight/Amazon** (Campo + Ventana)

### ¿Por qué?

✅ **Balance perfecto**: Funcionalidad completa sin complejidad excesiva  
✅ **Escalable**: Fácil migrar a eventos si crece  
✅ **UX clara**: Los usuarios entienden "ventanas de entrega"  
✅ **Performance**: No requiere queries complejas  

---

## Arquitectura Implementada

### Base de Datos

```sql
despachos
├── delivery_scheduled_date (DATE)      -- Fecha local
├── delivery_scheduled_time (TIME)      -- Hora local
├── delivery_scheduled_at (TIMESTAMPTZ) -- Timestamp UTC (principal)
└── delivery_window_hours (INT)         -- Ventana de tolerancia (ej: ±2hs)
```

**Estados calculados automáticamente**:
- `anticipado`: Más de 2hs antes de la ventana
- `en_ventana`: Dentro de la ventana de descarga
- `retrasado`: Pasó la ventana sin descargar
- `pendiente`: Sin fecha programada

### Frontend Types

```typescript
interface Despacho {
  // ... campos existentes
  
  // Descarga programada
  delivery_scheduled_date?: string;  // '2026-01-10'
  delivery_scheduled_time?: string;  // '14:00:00'
  delivery_scheduled_at?: string;    // ISO timestamp
  delivery_window_hours?: number;    // 2 (default)
  
  // Calculados (desde vista)
  delivery_status?: 'anticipado' | 'en_ventana' | 'retrasado' | 'pendiente';
  horas_hasta_descarga?: number;
}
```

---

## UI/UX - Diseño Visual

### Caso 1: Vista de Detalle de Viaje

```tsx
// En DetalleDespachoModal / TrackingView
<div className="border-t border-gray-700 pt-3 mt-3">
  <div className="flex items-center gap-2 mb-2">
    <span className="text-xs text-gray-400">📦 DESCARGA PROGRAMADA</span>
    {delivery_status === 'en_ventana' && (
      <span className="bg-green-500/20 text-green-400 text-[9px] px-2 py-0.5 rounded">
        En ventana
      </span>
    )}
    {delivery_status === 'retrasado' && (
      <span className="bg-red-500/20 text-red-400 text-[9px] px-2 py-0.5 rounded">
        Retrasado
      </span>
    )}
  </div>
  
  <div className="grid grid-cols-2 gap-3">
    <div>
      <p className="text-[9px] text-gray-500 uppercase">Fecha/Hora</p>
      <p className="text-sm text-white font-semibold">
        {formatDate(delivery_scheduled_at)}
      </p>
    </div>
    <div>
      <p className="text-[9px] text-gray-500 uppercase">Ventana</p>
      <p className="text-sm text-cyan-400">
        ±{delivery_window_hours}hs
      </p>
    </div>
  </div>
  
  {horas_hasta_descarga && (
    <div className="mt-2 flex items-center gap-2 text-xs">
      <span className="text-gray-400">⏱️</span>
      <span className="text-orange-400 font-semibold">
        {horas_hasta_descarga > 0 
          ? `Falta ${horas_hasta_descarga.toFixed(1)}hs`
          : `Retrasado ${Math.abs(horas_hasta_descarga).toFixed(1)}hs`
        }
      </span>
    </div>
  )}
</div>
```

### Caso 2: Timeline de Estados (Tracking)

```tsx
// Mostrar en la línea de tiempo del viaje
const timelineSteps = [
  { icon: '📦', label: 'Carga', time: scheduled_at },
  { icon: '🚚', label: 'Tránsito', time: actual_start },
  { icon: '📍', label: 'Descarga', time: delivery_scheduled_at, highlight: true },
  { icon: '✅', label: 'Entrega', time: completed_at }
];
```

### Caso 3: Filtros de Planificación

```tsx
// Agregar filtro por estado de descarga
<select>
  <option value="">Todas las descargas</option>
  <option value="anticipado">Anticipadas (>2hs)</option>
  <option value="en_ventana">En ventana ±2hs</option>
  <option value="retrasado">Retrasadas</option>
  <option value="sin_programar">Sin programar</option>
</select>
```

---

## Workflows Operativos

### 1. Crear Despacho con Descarga

```typescript
// Al crear despacho en formulario
const crearDespacho = async () => {
  const { data, error } = await supabase
    .from('despachos')
    .insert({
      // ... campos normales
      delivery_scheduled_date: '2026-01-10',
      delivery_scheduled_time: '14:00:00',
      delivery_window_hours: 2  // ±2 horas
    });
};
```

### 2. Alertas Automáticas

```sql
-- Vista para alertas de descarga
CREATE VIEW alertas_descarga AS
SELECT 
  d.pedido_id,
  d.delivery_scheduled_at,
  d.delivery_status,
  CASE
    WHEN delivery_status = 'retrasado' THEN 'URGENTE: Descarga retrasada'
    WHEN delivery_status = 'en_ventana' THEN 'INFO: En ventana de descarga'
    WHEN horas_hasta_descarga < 4 THEN 'AVISO: Descarga en menos de 4hs'
  END as mensaje_alerta
FROM vista_despachos_con_descarga
WHERE delivery_scheduled_at IS NOT NULL;
```

### 3. Notificaciones Push (Futuro)

```typescript
// Cuando entra en ventana de descarga
if (delivery_status === 'en_ventana') {
  await enviarNotificacion({
    tipo: 'descarga_proxima',
    titulo: 'Descarga Programada',
    mensaje: `${pedido_id} - Ventana de descarga activa`,
    destinatarios: [chofer_id, coordinador_id]
  });
}
```

---

## Validaciones Recomendadas

```typescript
// Validar lógica de fechas
const validarFechasDespacho = (data) => {
  const errors = [];
  
  // Descarga debe ser posterior a carga
  if (data.delivery_scheduled_at && data.scheduled_at) {
    if (new Date(data.delivery_scheduled_at) <= new Date(data.scheduled_at)) {
      errors.push('La descarga debe ser posterior a la carga');
    }
  }
  
  // Ventana razonable (entre 1 y 24 horas)
  if (data.delivery_window_hours) {
    if (data.delivery_window_hours < 1 || data.delivery_window_hours > 24) {
      errors.push('La ventana debe estar entre 1 y 24 horas');
    }
  }
  
  return errors;
};
```

---

## Métricas y KPIs

### Dashboard de Cumplimiento

```sql
SELECT 
  COUNT(*) FILTER (WHERE delivery_status = 'en_ventana') as entregas_a_tiempo,
  COUNT(*) FILTER (WHERE delivery_status = 'retrasado') as entregas_retrasadas,
  ROUND(
    COUNT(*) FILTER (WHERE delivery_status = 'en_ventana')::numeric / 
    NULLIF(COUNT(*), 0) * 100, 
    1
  ) as tasa_cumplimiento_pct
FROM vista_despachos_con_descarga
WHERE delivery_scheduled_at BETWEEN NOW() - INTERVAL '30 days' AND NOW();
```

---

## Migración de Datos Existentes

```sql
-- Estimar fecha de descarga basada en distancia
-- (simplificado: +4 horas desde carga por defecto)
UPDATE despachos
SET delivery_scheduled_at = scheduled_at + INTERVAL '4 hours',
    delivery_window_hours = 2
WHERE delivery_scheduled_at IS NULL 
  AND scheduled_at IS NOT NULL
  AND estado IN ('en_transito', 'asignado');
```

---

## Roadmap de Evolución

### Fase 1 (Actual): Campo Simple ✅
- Fecha/hora de descarga
- Ventana de tolerancia
- Estados calculados

### Fase 2 (Próximos 3 meses): Optimización
- Cálculo automático basado en distancia
- Integración con Google Maps ETA
- Alertas por email/SMS

### Fase 3 (Próximos 6 meses): Avanzado
- Sistema de eventos multi-punto
- Geofencing para descarga
- Confirmación con firma digital

---

## Comparación con Competencia

| Feature | Nodexia (v1) | Uber Freight | Amazon Logistics |
|---------|--------------|--------------|------------------|
| Fecha descarga | ✅ | ✅ | ✅ |
| Ventana tolerancia | ✅ | ✅ | ✅ |
| Estados automáticos | ✅ | ✅ | ✅ |
| ETA dinámico | ⏳ Fase 2 | ✅ | ✅ |
| Múltiples puntos | ⏳ Fase 3 | ✅ | ✅ |
| Firma digital | ⏳ Fase 3 | ✅ | ❌ |

**Conclusión**: Implementación competitiva para v1, con camino claro de evolución.
