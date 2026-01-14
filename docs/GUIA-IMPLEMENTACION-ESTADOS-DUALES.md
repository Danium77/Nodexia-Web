-- =====================================================
-- GUÍA DE IMPLEMENTACIÓN: Sistema Dual de Estados
-- =====================================================
-- Fecha: 2026-01-09
-- Migración: 015_sistema_estados_duales.sql
-- =====================================================

## 📋 PASO 1: EJECUTAR MIGRACIÓN EN SUPABASE

### Abrir SQL Editor en Supabase:
1. Ir a https://supabase.com/dashboard/project/lkdcofsfjnluzzzwoir
2. Click en "SQL Editor" (menú lateral izquierdo)
3. Click en "New query"
4. Copiar TODO el contenido de `sql/migrations/015_sistema_estados_duales.sql`
5. Click en "Run" (Ctrl+Enter)

### Verificación Post-Ejecución:
```sql
-- 1. Verificar que las columnas nuevas existen
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'viajes_despacho'
  AND column_name IN ('estado_unidad', 'estado_carga')
ORDER BY column_name;

-- 2. Ver estados actuales de viajes existentes
SELECT 
  id,
  estado AS estado_legacy,
  estado_unidad,
  estado_carga,
  chofer_id IS NOT NULL AS tiene_chofer,
  camion_id IS NOT NULL AS tiene_camion,
  created_at
FROM viajes_despacho
ORDER BY created_at DESC;

-- 3. Verificar triggers automáticos creados
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'viajes_despacho'
  AND trigger_name LIKE 'trigger_auto_%'
ORDER BY trigger_name;

-- 4. Verificar funciones helper por rol
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'estados_%permitidos%'
ORDER BY routine_name;
```

**Resultado Esperado:**
- ✅ 2 nuevas columnas: `estado_unidad`, `estado_carga` (ambas NOT NULL)
- ✅ 3 viajes migrados con estados: `asignado` + `documentacion_preparada`
- ✅ 9 triggers automáticos creados (trigger_auto_*)
- ✅ 6 funciones helper creadas (estados_*_permitidos_*)

---

## 📊 PASO 2: ENTENDER EL SISTEMA DUAL

### Separación de Responsabilidades

**Estado UNIDAD** (20 estados):
- Tracking físico del camión/chofer
- Ejemplo: `pendiente` → `asignado` → `confirmado_chofer` → `en_transito_origen` → `arribo_origen` → `ingreso_planta` → `en_playa_espera` → `en_proceso_carga` → `cargado` → `egreso_planta` → `en_transito_destino` → `arribo_destino` → `viaje_completado`

**Estado CARGA** (14 estados):
- Tracking del producto y documentación
- Ejemplo: `pendiente` → `documentacion_preparada` → `llamado_carga` → `posicionado_carga` → `iniciando_carga` → `cargando` → `carga_completada` → `documentacion_validada` → `en_transito` → `arribado_destino` → `descargado` → `entregado` → `completado`

### Transiciones Automáticas (9 triggers)

| Evento | Estado CARGA Cambia | Estado UNIDAD Se Actualiza Automáticamente |
|--------|---------------------|---------------------------------------------|
| 1 | Asignación chofer+camión | → `documentacion_preparada` |
| 2 | `iniciando_carga` | → `en_proceso_carga` |
| 3 | `carga_completada` | → `cargado` |
| 4 | `documentacion_validada` | → `egreso_planta` |
| 5 | Egreso autorizado | → `en_transito_destino` + `en_transito` |
| 6 | `arribo_destino` (unidad) | → `arribado_destino` (carga) |
| 7 | `iniciando_descarga` | → `en_descarga` |
| 8 | `descargado` | → `vacio` |
| 9 | `entregado` | → `disponible_carga` + `completado` |

---

## 🎯 PASO 3: VISIBILIDAD POR ROL EN FRONTEND

### Estados Permitidos por Rol

**CHOFER** (5 estados de unidad):
```typescript
const estadosChofer = [
  'confirmado_chofer',
  'en_transito_origen',
  'arribo_origen',
  'arribo_destino',
  'viaje_completado'
];
```

**CONTROL ACCESO** (5 estados de unidad):
```typescript
const estadosControlAcceso = [
  'ingreso_planta',
  'en_playa_espera',
  'documentacion_validada',
  'ingreso_destino',
  'egreso_destino'
];
```

**SUPERVISOR CARGA** (5 estados de carga):
```typescript
const estadosSupervisorCarga = [
  'llamado_carga',
  'posicionado_carga',
  'iniciando_carga',
  'cargando',
  'carga_completada'
];
```

**OPERADOR DESCARGA** (4 estados de carga):
```typescript
const estadosOperadorDescarga = [
  'iniciando_descarga',
  'descargando',
  'descargado',
  'entregado'
];
```

**COORDINADOR TRANSPORTE** (2 estados de unidad):
```typescript
const estadosCoordTransporte = [
  'asignado',
  'cancelado'
];
```

### Uso en Componentes React

```typescript
// Obtener estados permitidos desde Supabase
const { data: estadosPermitidos } = await supabase.rpc(
  'estados_permitidos_chofer' // o función según rol
);

// Filtrar selector de estados
<EstadoSelector
  estadosDisponibles={estadosPermitidos}
  estadoActual={viaje.estado_unidad}
  onChange={(nuevoEstado) => updateEstado(viaje.id, nuevoEstado)}
/>
```

---

## 🔧 PASO 4: EJEMPLO DE ACTUALIZACIÓN DE ESTADO

### Desde Frontend (Chofer reporta arribo):

```typescript
// components/Chofer/ViajeCard.tsx
const reportarArribo = async (viajeId: string) => {
  const { error } = await supabase
    .from('viajes_despacho')
    .update({ 
      estado_unidad: 'arribo_origen' 
    })
    .eq('id', viajeId);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  // Notificar control acceso
  await enviarNotificacion({
    tipo: 'arribo_camion',
    viajeId,
    mensaje: 'Camión ABC123 arribó a planta'
  });
};
```

### Row Level Security (RLS) Automático:

La migración ya creó políticas RLS que validan:
- ✅ Chofer solo puede actualizar SUS viajes
- ✅ Solo puede poner estados de `estados_permitidos_chofer()`
- ✅ Control acceso solo actualiza viajes de SU planta
- ✅ Validación automática sin código adicional

---

## 📱 PASO 5: COMPONENTES A ACTUALIZAR

### 1. TrackingView.tsx (Ya actualizado)
```typescript
// Filtrar solo viajes "trackeables" (con chofer + camión)
const viajesActivos = viajes.filter(v => 
  v.chofer_id && 
  v.camion_id &&
  !['viaje_completado', 'cancelado', 'expirado'].includes(v.estado_unidad)
);
```

### 2. EstadosBadge.tsx (Crear componente)
```typescript
// components/ui/EstadosBadge.tsx
export function EstadoUnidadBadge({ estado }: { estado: EstadoUnidadViaje }) {
  const config = {
    'pendiente': { color: 'gray', label: 'Pendiente' },
    'asignado': { color: 'blue', label: 'Asignado' },
    'confirmado_chofer': { color: 'green', label: 'Confirmado' },
    'en_transito_origen': { color: 'yellow', label: 'En Tránsito' },
    'arribo_origen': { color: 'orange', label: 'Arribó Origen' },
    // ... todos los estados
  };
  
  const { color, label } = config[estado];
  return <Badge variant={color}>{label}</Badge>;
}
```

### 3. Modal de Viajes Expirados (Actualizar)
```typescript
// components/Dashboard/ViajesExpiradosModal.tsx
const viajes = await supabase
  .from('vista_viajes_expirados_analytics')
  .select('*')
  .eq('estado_unidad', 'expirado'); // ← Cambiar de 'estado' a 'estado_unidad'
```

---

## 🧪 PASO 6: TESTING

### Prueba 1: Trigger Automático de Asignación
```sql
-- Asignar chofer + camión a viaje pendiente
UPDATE viajes_despacho
SET 
  chofer_id = '123e4567-e89b-12d3-a456-426614174000',
  camion_id = '223e4567-e89b-12d3-a456-426614174000',
  estado_unidad = 'asignado'
WHERE id = 'tu-viaje-id';

-- Verificar que estado_carga cambió automáticamente
SELECT estado_unidad, estado_carga
FROM viajes_despacho
WHERE id = 'tu-viaje-id';

-- Resultado esperado:
-- estado_unidad: 'asignado'
-- estado_carga: 'documentacion_preparada' ← 🤖 AUTOMÁTICO
```

### Prueba 2: Flujo Completo de Carga
```sql
-- Simular flujo completo
UPDATE viajes_despacho SET estado_carga = 'llamado_carga' WHERE id = 'tu-viaje-id';
-- Verificar: estado_unidad debe seguir igual

UPDATE viajes_despacho SET estado_carga = 'iniciando_carga' WHERE id = 'tu-viaje-id';
-- Verificar: estado_unidad cambió a 'en_proceso_carga' ← 🤖 AUTOMÁTICO

UPDATE viajes_despacho SET estado_carga = 'cargando' WHERE id = 'tu-viaje-id';
-- Verificar: estado_unidad sigue en 'en_proceso_carga'

UPDATE viajes_despacho SET estado_carga = 'carga_completada' WHERE id = 'tu-viaje-id';
-- Verificar: estado_unidad cambió a 'cargado' ← 🤖 AUTOMÁTICO
```

### Prueba 3: RLS (Row Level Security)
```sql
-- Intentar actualizar viaje de otro chofer (debe fallar)
-- Ejecutar como chofer user_id = 'chofer-A'
UPDATE viajes_despacho
SET estado_unidad = 'arribo_origen'
WHERE chofer_id = 'chofer-B'; -- ← Chofer diferente

-- Resultado esperado: 0 rows affected (bloqueado por RLS)
```

---

## 🔍 PASO 7: MONITOREO

### Query para ver Transiciones Automáticas
```sql
-- Ver viajes que tuvieron transiciones automáticas en las últimas 24h
SELECT 
  v.id,
  d.pedido_id,
  v.estado_unidad,
  v.estado_carga,
  v.updated_at,
  EXTRACT(EPOCH FROM (NOW() - v.updated_at))/60 AS minutos_desde_actualizacion
FROM viajes_despacho v
JOIN despachos d ON v.despacho_id = d.id
WHERE v.updated_at >= NOW() - INTERVAL '24 hours'
  AND v.estado_carga IN (
    'documentacion_preparada',
    'en_transito',
    'arribado_destino',
    'completado'
  )
ORDER BY v.updated_at DESC;
```

### Dashboard de Estados
```sql
-- Distribución de estados actuales
SELECT 
  estado_unidad,
  COUNT(*) AS cantidad,
  ARRAY_AGG(DISTINCT estado_carga) AS estados_carga_asociados
FROM viajes_despacho
WHERE estado_unidad NOT IN ('viaje_completado', 'cancelado', 'expirado')
GROUP BY estado_unidad
ORDER BY cantidad DESC;
```

---

## 🎓 BUENAS PRÁCTICAS

### ✅ DO (Hacer):
1. **Usar nombres descriptivos de estados** en la UI según contexto
2. **Validar transiciones** en el frontend antes de enviar
3. **Mostrar SOLO estados permitidos** por rol en selectores
4. **Agregar tooltips** explicando qué significa cada estado
5. **Notificar automáticamente** a roles relevantes al cambiar estado
6. **Registrar timestamps** de cambios importantes

### ❌ DON'T (No hacer):
1. **No permitir saltos de estados** (validar secuencia lógica)
2. **No mostrar estados técnicos** al usuario (ej: `disponible_carga`)
3. **No hardcodear listas de estados** (usar funciones helper)
4. **No actualizar ambos estados** si uno es automático
5. **No confiar solo en frontend** (RLS valida en servidor)

---

## 📈 PRÓXIMOS PASOS

1. ✅ **EJECUTAR MIGRACIÓN** en Supabase (15 minutos)
2. ⏳ **Actualizar componentes existentes** para usar `estado_unidad` + `estado_carga`
3. ⏳ **Crear componente `EstadoSelector`** con validación por rol
4. ⏳ **Agregar badges/indicadores visuales** de estados
5. ⏳ **Implementar notificaciones** por transiciones de estado
6. ⏳ **Dashboard de métricas** por estado (tiempo en cada etapa)

---

## 🆘 TROUBLESHOOTING

### Problema: "column estado_unidad does not exist"
**Solución:** Ejecutar migración completa 015_sistema_estados_duales.sql

### Problema: "check constraint violation"
**Solución:** Verificar que el estado existe en el CHECK constraint. Ver lista completa en migración.

### Problema: "Row level security prevents update"
**Solución:** Verificar que el usuario tiene permiso para ese estado. Consultar `estados_permitidos_*()` según rol.

### Problema: "Trigger no ejecuta automáticamente"
**Solución:** Verificar que el trigger existe con:
```sql
SELECT * FROM information_schema.triggers 
WHERE event_object_table = 'viajes_despacho';
```

---

## 📞 SOPORTE

**Documentación Relacionada:**
- [DIAGRAMA-FLUJO-ESTADOS-CRUZADOS.md](../docs/DIAGRAMA-FLUJO-ESTADOS-CRUZADOS.md) - Timeline completo
- [FLUJO-ESTADOS-OPERACIONES.md](../docs/FLUJO-ESTADOS-OPERACIONES.md) - Definiciones técnicas
- [CORRECCIONES-ESTADOS-DUALES.md](../docs/CORRECCIONES-ESTADOS-DUALES.md) - Historia de correcciones

**Consultas SQL Útiles:**
```sql
-- Ver estructura completa de estados
\d+ viajes_despacho

-- Ver todas las políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'viajes_despacho';

-- Ver funciones helper disponibles
\df estados_*
```
