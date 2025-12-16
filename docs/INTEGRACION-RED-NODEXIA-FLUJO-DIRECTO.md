# Integración Red Nodexia con Flujo Directo
**Fecha:** 7 de Diciembre, 2025  
**Status:** ✅ Implementado

## 📋 Resumen de Cambios

Se implementó la integración completa del sistema de Red Nodexia con el flujo de asignación directa, permitiendo que los viajes asignados desde la Red sigan el mismo flujo operativo que las asignaciones directas, manteniendo trazabilidad para reportes.

---

## 🎯 Requerimientos Cumplidos

### 1. **Flujo desde Coordinador de Planta**
✅ Una vez confirmada la asignación al transporte de la red:
- El despacho trae los datos del transporte asignado
- Pasa al tab de "Asignados" automáticamente
- Se guarda campo diferenciador `origen_asignacion='red_nodexia'` para reportes
- Mantiene ID de oferta aceptada y datos de Red Nodexia

### 2. **Flujo desde Transporte de Red**
✅ Una vez aceptada la oferta por el coordinador:
- El transporte ve el viaje en su panel normal (despachos-ofrecidos.tsx)
- Puede asignar chofer y camión igual que un viaje directo
- Badge visual 🌐 indica que vino de Red Nodexia
- El viaje sigue el flujo completo normal hasta finalización

---

## 🔧 Cambios Técnicos Implementados

### 1. **Migración de Base de Datos** 
📄 `sql/migrations/007_agregar_origen_asignacion.sql`

```sql
-- Agregar campo diferenciador
ALTER TABLE despachos 
ADD COLUMN IF NOT EXISTS origen_asignacion VARCHAR(20) DEFAULT 'directo' 
CHECK (origen_asignacion IN ('directo', 'red_nodexia'));

ALTER TABLE viajes_despacho 
ADD COLUMN IF NOT EXISTS origen_asignacion VARCHAR(20) DEFAULT 'directo' 
CHECK (origen_asignacion IN ('directo', 'red_nodexia'));

-- Índices para reportes
CREATE INDEX IF NOT EXISTS idx_despachos_origen_asignacion 
ON despachos(origen_asignacion);

CREATE INDEX IF NOT EXISTS idx_viajes_despacho_origen_asignacion 
ON viajes_despacho(origen_asignacion);
```

**Valores posibles:**
- `'directo'`: Asignación tradicional directa
- `'red_nodexia'`: Asignación a través de Red Nodexia

---

### 2. **Lógica de Aceptación de Oferta**
📄 `pages/crear-despacho.tsx` - Función `handleAceptarOfertaDesdeModal`

**Proceso completo al aceptar oferta:**

```typescript
// 1. Obtener viaje_id desde viajes_red_nodexia
const { data: viajeRed } = await supabase
  .from('viajes_red_nodexia')
  .select('viaje_id, empresa_solicitante_id')
  .eq('id', selectedViajeRedId)
  .single();

// 2. Obtener despacho_id desde viajes_despacho
const { data: viajeDespacho } = await supabase
  .from('viajes_despacho')
  .select('despacho_id, numero_viaje')
  .eq('id', viajeRed.viaje_id)
  .single();

// 3. Actualizar oferta aceptada
await supabase
  .from('ofertas_red_nodexia')
  .update({
    estado_oferta: 'aceptada',
    fecha_respuesta: new Date().toISOString()
  })
  .eq('id', ofertaId);

// 4. Rechazar demás ofertas
await supabase
  .from('ofertas_red_nodexia')
  .update({
    estado_oferta: 'rechazada',
    fecha_respuesta: new Date().toISOString()
  })
  .eq('viaje_red_id', selectedViajeRedId)
  .neq('id', ofertaId);

// 5. Actualizar viaje en red
await supabase
  .from('viajes_red_nodexia')
  .update({
    estado_red: 'asignado',
    transporte_asignado_id: transporteId,
    oferta_aceptada_id: ofertaId,
    fecha_asignacion: new Date().toISOString(),
    asignado_por: user?.id
  })
  .eq('id', selectedViajeRedId);

// 6. ⭐ ACTUALIZAR VIAJE_DESPACHO - Clave para flujo directo
await supabase
  .from('viajes_despacho')
  .update({
    id_transporte: transporteId,        // UUID de empresa
    estado: 'transporte_asignado',       // Cambia de 'pendiente' a 'asignado'
    fecha_asignacion_transporte: new Date().toISOString(),
    origen_asignacion: 'red_nodexia'     // 🏷️ Marca para reportes
  })
  .eq('id', viajeRed.viaje_id);

// 7. ⭐ ACTUALIZAR DESPACHO - Mueve a tab "Asignados"
await supabase
  .from('despachos')
  .update({
    transport_id: transportIdFinal,
    estado: 'asignado',
    origen_asignacion: 'red_nodexia'     // 🏷️ Marca para reportes
  })
  .eq('id', viajeDespacho.despacho_id);
```

**Resultado:**
- ✅ Despacho aparece en tab "Asignados" del coordinador
- ✅ Viaje aparece en "Despachos Ofrecidos" del transporte
- ✅ Campo `origen_asignacion` permite distinguir en reportes

---

### 3. **Vista del Transporte**
📄 `pages/transporte/despachos-ofrecidos.tsx`

**Cambios implementados:**

#### A) Interfaz actualizada
```typescript
interface Despacho {
  // ... campos existentes ...
  
  // 🌐 RED NODEXIA
  origen_asignacion?: 'directo' | 'red_nodexia';
}
```

#### B) Query incluye origen_asignacion
```typescript
const { data: viajesData } = await supabase
  .from('viajes_despacho')
  .select(`
    id,
    numero_viaje,
    estado,
    id_chofer,
    id_camion,
    despacho_id,
    id_transporte,
    observaciones,
    origen_asignacion,    // 🆕 Campo agregado
    despachos!inner ( ... )
  `)
  .eq('id_transporte', empresaId)
  .in('estado', [
    'pendiente',
    'transporte_asignado',  // ⭐ Incluye viajes de Red
    'camion_asignado',
    'confirmado_chofer',
    // ... otros estados ...
  ]);
```

#### C) Badge visual agregado
```typescript
{/* Pedido ID */}
<div className="min-w-[120px] flex items-center gap-2">
  <span className="text-white font-bold text-sm">
    {despacho.pedido_id}
  </span>
  
  {despacho.origen_asignacion === 'red_nodexia' && (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold 
                     bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 
                     flex items-center gap-0.5">
      🌐 Red
    </span>
  )}
</div>
```

**Resultado:**
- ✅ Transporte ve el viaje inmediatamente después de aceptación
- ✅ Badge 🌐 indica origen desde Red Nodexia
- ✅ Puede asignar chofer/camión normalmente

---

### 4. **Modal de Confirmación Elegante**
📄 `components/Transporte/VerEstadoRedNodexiaModal.tsx`

**Reemplazó:** `window.confirm` y `alert`

**Nuevo flujo:**
```typescript
// Estados
const [ofertaSeleccionada, setOfertaSeleccionada] = useState<OfertaRedCompleta | null>(null);
const [showConfirmacion, setShowConfirmacion] = useState(false);

// Al hacer clic en "Seleccionar"
const handleSeleccionarTransporte = (oferta: OfertaRedCompleta) => {
  setOfertaSeleccionada(oferta);
  setShowConfirmacion(true);  // Muestra modal de confirmación
};

// Al confirmar
const handleConfirmarSeleccion = () => {
  if (ofertaSeleccionada && onAceptarOferta) {
    onAceptarOferta(ofertaSeleccionada.id, ofertaSeleccionada.transporte_id);
    setShowConfirmacion(false);
  }
};
```

**Diseño del modal:**
- Título: "Confirmar Asignación" con ícono ✓
- Tarjeta con datos del transporte (nombre, ubicación, estrellas, viajes)
- Warning: "Esta acción cerrará el viaje y rechazará otras ofertas"
- Botones: "Cancelar" (gris) y "Confirmar Asignación" (cyan)

---

## 📊 Flujo Completo Integrado

### Fase 1: Publicación en Red Nodexia
```
Coordinador → "Abrir en Red Nodexia"
  ↓
viajes_red_nodexia.estado_red = 'abierto'
  ↓
Transportes no vinculados ven la oferta
```

### Fase 2: Oferta del Transporte
```
Transporte → "Aceptar Viaje"
  ↓
ofertas_red_nodexia.estado_oferta = 'pendiente'
  ↓
Coordinador ve ofertas en modal "Ver Estado"
```

### Fase 3: Aceptación (⭐ NUEVO FLUJO)
```
Coordinador → Modal Confirmación → "Confirmar Asignación"
  ↓
┌─────────────────────────────────────────────────┐
│ 1. ofertas_red_nodexia                         │
│    - oferta aceptada: estado_oferta='aceptada' │
│    - otras ofertas: estado_oferta='rechazada'  │
├─────────────────────────────────────────────────┤
│ 2. viajes_red_nodexia                          │
│    - estado_red='asignado'                     │
│    - transporte_asignado_id=UUID               │
│    - oferta_aceptada_id=UUID                   │
├─────────────────────────────────────────────────┤
│ 3. viajes_despacho ⭐ INTEGRACIÓN              │
│    - id_transporte=UUID                        │
│    - estado='transporte_asignado'              │
│    - origen_asignacion='red_nodexia' 🏷️       │
├─────────────────────────────────────────────────┤
│ 4. despachos ⭐ INTEGRACIÓN                    │
│    - transport_id=integer                      │
│    - estado='asignado'                         │
│    - origen_asignacion='red_nodexia' 🏷️       │
└─────────────────────────────────────────────────┘
  ↓
✅ Despacho en tab "Asignados" (coordinador)
✅ Viaje en "Despachos Ofrecidos" (transporte)
```

### Fase 4: Operación Normal (⭐ MISMO FLUJO QUE DIRECTO)
```
Transporte → Asigna Chofer + Camión
  ↓
viajes_despacho.estado = 'camion_asignado'
  ↓
Chofer → Confirma viaje → en_transito → en_planta → ...
  ↓
⭐ TODO EL FLUJO OPERATIVO IGUAL QUE VIAJE DIRECTO
  ↓
Viaje completado
```

---

## 🎨 Indicadores Visuales

### Para Coordinador de Planta
**Tab "Asignados":**
- Despacho aparece con datos del transporte
- Sin diferencia visual (operación normal)
- Badge de estado "Asignado" verde

### Para Transporte de Red
**Página "Despachos Ofrecidos":**
```
┌────────────────────────────────────────────┐
│ DSP-20251205-002 🌐 Red                   │
│ [👤 Sin Chofer] [🚛 Sin Camión]           │
│ 📍 Rosario → 📍 Molino Santa Rosa         │
│ 🕐 05/12 20:00                             │
│                                            │
│ [Asignar Chofer] [Asignar Camión]         │
└────────────────────────────────────────────┘
```
- Badge cyan "🌐 Red" indica origen Red Nodexia
- Funcionalidad idéntica a viaje directo

---

## 📈 Beneficios para Reportes

### Query para reportes de origen
```sql
-- Reporte de viajes por origen de asignación
SELECT 
  origen_asignacion,
  COUNT(*) as total_viajes,
  COUNT(CASE WHEN estado = 'completado' THEN 1 END) as completados,
  AVG(EXTRACT(EPOCH FROM (fecha_confirmacion_entrega - fecha_creacion))/3600) as horas_promedio
FROM viajes_despacho
WHERE fecha_creacion >= '2025-01-01'
GROUP BY origen_asignacion;

-- Resultado esperado:
-- origen_asignacion | total_viajes | completados | horas_promedio
-- directo           | 450          | 425         | 18.5
-- red_nodexia       | 85           | 80          | 20.2
```

### Indicadores clave
- **Ratio Red vs Directo**: Medir adopción de Red Nodexia
- **Eficiencia comparativa**: Tiempos de entrega Red vs Directo
- **Calidad de transportes**: Rating promedio por origen
- **Costos**: Comparar tarifa promedio Red vs Directo

---

## ✅ Checklist de Validación

### Flujo Coordinador
- [x] Despacho con viaje en Red aparece con badge "EN RED"
- [x] Modal "Ver Estado" muestra transportes con ofertas
- [x] Modal de confirmación elegante (sin alerts)
- [x] Al confirmar, despacho pasa a tab "Asignados"
- [x] Despacho muestra datos del transporte asignado

### Flujo Transporte
- [x] Transporte ve viaje inmediatamente después de aceptación
- [x] Badge 🌐 indica que vino de Red Nodexia
- [x] Puede asignar chofer normalmente
- [x] Puede asignar camión normalmente
- [x] Estados operativos funcionan igual que directo

### Base de Datos
- [x] Campo `origen_asignacion` agregado a `despachos`
- [x] Campo `origen_asignacion` agregado a `viajes_despacho`
- [x] Índices creados para performance de reportes
- [x] Valores por defecto 'directo' para registros existentes

### Trazabilidad
- [x] `viajes_red_nodexia` mantiene relación con `viajes_despacho`
- [x] `ofertas_red_nodexia` mantiene ID de oferta aceptada
- [x] Timestamps de asignación guardados correctamente
- [x] Usuario que aceptó la oferta registrado

---

## 🚀 Próximos Pasos Sugeridos

### Mejoras Futuras
1. **Dashboard de Red Nodexia**
   - Métricas de adopción
   - Comparativa Red vs Directo
   - Top transportes de Red

2. **Notificaciones**
   - Push notification al transporte cuando se acepta su oferta
   - Email de confirmación con detalles del viaje

3. **Calificaciones específicas**
   - Rating separado para viajes de Red
   - Feedback de coordinadores sobre transportes de Red

4. **Optimizaciones**
   - Matching automático basado en ubicación
   - Sugerencias de tarifa competitiva
   - Predicción de disponibilidad

---

## 📝 Notas Técnicas

### Campos Clave
- `viajes_despacho.id_transporte`: UUID de empresa de transporte
- `viajes_despacho.origen_asignacion`: Enum ('directo' | 'red_nodexia')
- `viajes_red_nodexia.viaje_id`: FK a viajes_despacho.id
- `viajes_red_nodexia.oferta_aceptada_id`: FK a ofertas_red_nodexia.id

### Estados Importantes
- Viaje Red: `abierto` → `con_ofertas` → `asignado` → `cerrado`
- Viaje Despacho: `pendiente` → `transporte_asignado` → `camion_asignado` → ...
- Oferta: `pendiente` → `aceptada` o `rechazada`

### Performance
- Índices en `origen_asignacion` para queries rápidas
- JOIN con `viajes_red_nodexia` solo cuando sea necesario
- Cache de datos de transporte en el frontend

---

## 🐛 Debugging

### Logs importantes
```typescript
console.log('🎯 Aceptando oferta:', { ofertaId, transporteId, viajeRedId });
console.log('📦 Viaje en red encontrado:', viajeRed);
console.log('🚛 Viaje despacho encontrado:', viajeDespacho);
console.log('✅ Asignación completada exitosamente');
```

### Queries de validación
```sql
-- Ver viajes de Red con su estado de asignación
SELECT 
  vrn.id as viaje_red_id,
  vrn.estado_red,
  vrn.transporte_asignado_id,
  vd.estado as estado_viaje,
  vd.origen_asignacion,
  d.estado as estado_despacho
FROM viajes_red_nodexia vrn
JOIN viajes_despacho vd ON vd.id = vrn.viaje_id
JOIN despachos d ON d.id = vd.despacho_id
WHERE vrn.estado_red = 'asignado'
ORDER BY vrn.fecha_asignacion DESC;
```

---

## 📧 Contacto
Para dudas o mejoras sobre esta integración, contactar al equipo de desarrollo.

---

**Última actualización:** 7 de Diciembre, 2025  
**Versión:** 1.0.0  
**Status:** ✅ Producción
