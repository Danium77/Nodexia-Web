# Sistema de Estado EXPIRADO - Guía de Implementación

## Fecha: 09-Enero-2026

## 📋 Descripción General

Sistema automático para marcar viajes como **expirados** cuando lleguen a su fecha/hora programada sin tener chofer y camión asignados. Los viajes expirados:

- ✅ Quedan registrados para indicadores y reportes
- ✅ Desaparecen de "Seguimiento en Tiempo Real"
- ✅ Se muestran en planificación con estado visual distintivo
- ✅ Permiten análisis de eficiencia operativa

## 🗂️ Archivos Modificados

### Backend (SQL)
- **`sql/migrations/013_estado_expirado_sistema.sql`**: Migración completa del sistema

### Frontend (TypeScript/React)
- **`lib/types.ts`**: Agregado estado 'expirado' a `EstadoUnidadViaje`
- **`components/Planning/TrackingView.tsx`**: Filtrado de viajes activos

## 🚀 Pasos de Implementación

### 1. Ejecutar Migración SQL

```sql
-- Ejecutar en Supabase SQL Editor o cliente PostgreSQL
\i sql/migrations/013_estado_expirado_sistema.sql
```

**Nota**: El script incluye una ejecución inicial de `marcar_viajes_expirados()` que marcará todos los viajes históricos que ya expiraron.

### 2. Verificar Instalación

```sql
-- Verificar que el estado existe
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'estado_unidad_viaje'::regtype 
ORDER BY enumsortorder;

-- Debería incluir 'expirado' en la lista

-- Verificar funciones creadas
\df marcar_viajes_expirados
\df ejecutar_expiracion_viajes
\df get_metricas_expiracion

-- Verificar vista
\d+ vista_viajes_expirados
```

### 3. Configurar Automatización (IMPORTANTE)

#### Opción A: Supabase Edge Function con Cron (Recomendado)

Crear un Edge Function que se ejecute cada 15 minutos:

```typescript
// supabase/functions/expirar-viajes/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data, error } = await supabaseClient.rpc('ejecutar_expiracion_viajes')

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

Configurar en Supabase Dashboard > Edge Functions > Add a schedule:
```
0,15,30,45 * * * *  # Cada 15 minutos
```

#### Opción B: pg_cron (Si tienes acceso al servidor PostgreSQL)

```sql
-- Crear job cron
SELECT cron.schedule(
    'marcar-viajes-expirados',
    '*/15 * * * *',  -- Cada 15 minutos
    $$SELECT ejecutar_expiracion_viajes();$$
);

-- Verificar jobs
SELECT * FROM cron.job;
```

#### Opción C: Llamada desde Frontend (Temporal/Desarrollo)

En `pages/planificacion.tsx`, agregar:

```typescript
useEffect(() => {
  const verificarExpiracion = async () => {
    try {
      await supabase.rpc('ejecutar_expiracion_viajes');
    } catch (error) {
      console.error('Error verificando expiración:', error);
    }
  };

  // Ejecutar al cargar
  verificarExpiracion();

  // Ejecutar cada 15 minutos
  const interval = setInterval(verificarExpiracion, 15 * 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

## 📊 Uso de Indicadores y Reportes

### Consultar Viajes Expirados

```sql
-- Ver todos los viajes expirados con detalles
SELECT * FROM vista_viajes_expirados
ORDER BY fecha_expiracion DESC
LIMIT 10;

-- Métricas del último mes
SELECT * FROM get_metricas_expiracion(
    NOW() - INTERVAL '30 days',
    NOW()
);

-- Resultado ejemplo:
-- total_expirados: 15
-- por_falta_chofer: 8
-- por_falta_camion: 3
-- por_falta_ambos: 4
-- urgentes_expirados: 5
-- promedio_horas_retraso: 12.5
-- tasa_expiracion_pct: 7.2
```

### Dashboard de Viajes Expirados

```sql
-- Viajes expirados por día (últimos 7 días)
SELECT 
    DATE(fecha_expiracion) AS fecha,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE era_urgente) AS urgentes
FROM vista_viajes_expirados
WHERE fecha_expiracion >= NOW() - INTERVAL '7 days'
GROUP BY DATE(fecha_expiracion)
ORDER BY fecha DESC;

-- Top transportes con más viajes expirados
SELECT 
    transporte_nombre,
    COUNT(*) AS viajes_expirados,
    ROUND(AVG(horas_despues_programado), 1) AS promedio_horas_retraso
FROM vista_viajes_expirados
WHERE fecha_expiracion >= NOW() - INTERVAL '30 days'
GROUP BY transporte_nombre
ORDER BY viajes_expirados DESC
LIMIT 10;
```

## 🎨 Visualización en Frontend

### Seguimiento en Tiempo Real

Los viajes con estados inactivos **no aparecen** en la pantalla:
- `expirado`
- `viaje_completado`
- `entregado`
- `cancelado`
- `descarga_completada`

### Planificación (Vistas: Día, Semana, Mes)

Los viajes expirados **sí aparecen** pero con:
- Badge distintivo: `⚠️ Expirado` en rojo
- Color de tarjeta: `bg-red-700`
- Tooltip explicando razón de expiración

### Indicador de Expirados

Agregar nueva tarjeta en `planificacion.tsx`:

```typescript
const getMetrics = () => {
  // ... código existente ...
  
  const viajesExpirados = filteredDispatches.filter(
    v => v.estado === 'expirado'
  ).length;
  
  return {
    // ... métricas existentes ...
    expirados: viajesExpirados
  };
};

// En el JSX:
<div className="bg-gradient-to-br from-[#1b273b] to-[#0f1821] rounded-lg p-3 border border-red-500/20 hover:border-red-500/40 transition-all shadow-lg">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-gray-400 text-[10px] uppercase tracking-wider">Expirados</p>
      <p className="text-2xl font-bold text-white mt-1">{metrics.expirados}</p>
    </div>
    <div className="text-red-400 text-2xl bg-red-500/10 p-2 rounded-lg">⚠️</div>
  </div>
</div>
```

## 🔍 Testing y Validación

### Prueba Manual de Expiración

```sql
-- 1. Crear un viaje de prueba con fecha pasada
INSERT INTO despachos (
    pedido_id,
    origen,
    destino,
    scheduled_date_time,
    created_by
) VALUES (
    'TEST-EXP-001',
    'Test Origen',
    'Test Destino',
    NOW() - INTERVAL '2 hours',  -- Fecha en el pasado
    (SELECT id FROM usuarios LIMIT 1)
) RETURNING id;

-- 2. Crear viaje sin recursos
INSERT INTO viajes_despacho (
    despacho_id,
    numero_viaje,
    estado
) VALUES (
    '<ID_DEL_DESPACHO_ANTERIOR>',
    1,
    'pendiente'
);

-- 3. Ejecutar función de expiración
SELECT * FROM marcar_viajes_expirados();

-- 4. Verificar que el viaje fue marcado como expirado
SELECT * FROM vista_viajes_expirados
WHERE pedido_id = 'TEST-EXP-001';
```

### Test en Frontend

1. Abrir `Planificación`
2. Verificar que viajes expirados muestran badge rojo
3. Ir a `Seguimiento en Tiempo Real`
4. Verificar que viajes expirados NO aparecen en la lista

## ⚡ Optimizaciones

### Índices Recomendados

```sql
-- Índice compuesto para búsqueda eficiente de viajes a expirar
CREATE INDEX IF NOT EXISTS idx_viajes_expiracion 
ON viajes_despacho (estado, chofer_id, camion_id) 
WHERE estado IN ('pendiente', 'asignado');

-- Índice en despachos para join eficiente
CREATE INDEX IF NOT EXISTS idx_despachos_scheduled 
ON despachos (scheduled_date_time) 
WHERE scheduled_date_time IS NOT NULL;
```

### Limpieza de Datos Históricos (Opcional)

```sql
-- Archivar viajes expirados muy antiguos (>6 meses)
-- Solo si se implementa tabla de archivo
CREATE TABLE viajes_expirados_archivo AS
SELECT * FROM vista_viajes_expirados
WHERE fecha_expiracion < NOW() - INTERVAL '6 months';

-- NO EJECUTAR sin estrategia de respaldo
```

## 📈 KPIs y Métricas Sugeridas

1. **Tasa de Expiración**: `(Viajes Expirados / Total Viajes) * 100`
2. **Tiempo Promedio de Retraso**: Horas desde fecha programada hasta expiración
3. **Viajes Urgentes Expirados**: Impacto en prioridades
4. **Por Transporte**: Identificar transportes con más problemas
5. **Tendencia Mensual**: Ver si mejora o empeora con el tiempo

## 🚨 Monitoreo y Alertas

### Alertas Sugeridas

```sql
-- Alerta: Muchos viajes expirando (>5 en una hora)
SELECT COUNT(*) AS viajes_expirados_ultima_hora
FROM vista_viajes_expirados
WHERE fecha_expiracion >= NOW() - INTERVAL '1 hour'
HAVING COUNT(*) > 5;

-- Alerta: Viaje urgente expirado
SELECT * FROM vista_viajes_expirados
WHERE era_urgente = TRUE
AND fecha_expiracion >= NOW() - INTERVAL '1 hour';
```

## 📝 Notas Importantes

1. **No se eliminan datos**: Los viajes expirados permanecen en la BD para análisis
2. **Reversible**: Si un viaje expirado recibe recursos, se puede cambiar estado manualmente
3. **Auditable**: La vista incluye timestamp de expiración para trazabilidad
4. **Escalable**: La función procesa solo viajes en estados tempranos (eficiente)

## 🔗 Referencias

- Migración SQL: `sql/migrations/013_estado_expirado_sistema.sql`
- Tipos TypeScript: `lib/types.ts` (línea ~538)
- Componente Tracking: `components/Planning/TrackingView.tsx`
- Documentación Sistema Dual: `docs/ESTADO-DUAL-VIAJES.md`

## 📞 Soporte

Para dudas o problemas:
1. Revisar logs de Supabase
2. Ejecutar `SELECT * FROM get_metricas_expiracion();`
3. Verificar que el cron job esté activo
