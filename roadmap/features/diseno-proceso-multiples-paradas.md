# 🚛 Diseño de Proceso de Múltiples Paradas

---

## 📋 Metadata

| Campo | Valor |
|-------|-------|
| **Fecha de creación** | 09 de Enero, 2026 |
| **Prioridad** | 🟡 Media-Alta |
| **Estado** | 📝 Propuesta - Pendiente Diseño Completo |
| **Responsable** | Por definir |
| **Estimación** | 3-4 semanas (Backend + Frontend + Testing) |
| **Dependencias** | Diseño de proceso de cierre de entregas |

---

## 🎯 Contexto y Problema

### Necesidad del Negocio

En operaciones de **carga general consolidada**, es común que un mismo camión realice entregas en **múltiples destinos** durante una misma ruta. Por ejemplo:

**Caso de Uso Real:**
```
Origen: Depósito Central (Rosario)
Destinos: 
  1. Cliente A (San Lorenzo) - 5 pallets
  2. Cliente B (Capitán Bermúdez) - 8 pallets
  3. Cliente C (Fray Luis Beltrán) - 3 pallets

Total: 1 camión, 1 despacho, 3 paradas de entrega
```

### Limitación Actual del Sistema

**Estructura actual de BD:**
```sql
despachos {
  id UUID,
  origen TEXT,           -- ✅ Un solo origen (correcto)
  destino TEXT,          -- ❌ Un solo destino (limitación)
  origen_id UUID,        -- Una ubicación
  destino_id UUID        -- Una ubicación (limitación)
}
```

**Problema:**
- El sistema actual solo soporta 1 origen → 1 destino
- Para rutas consolidadas, se deben crear múltiples despachos separados
- No hay tracking unificado de la ruta completa
- Reportes fragmentados

### Impacto de NO Implementarlo

- ❌ Duplicación de datos (múltiples despachos para 1 viaje real)
- ❌ Imposibilidad de calcular costo total de ruta
- ❌ Reportes inexactos (1 viaje aparece como N viajes)
- ❌ Complejidad operativa innecesaria

---

## 🎨 Solución Propuesta

### Opción Elegida: Tabla de Paradas (Normalizada)

**Estructura de Base de Datos:**

```sql
-- Nueva tabla: despacho_paradas
CREATE TABLE despacho_paradas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  despacho_id UUID NOT NULL REFERENCES despachos(id) ON DELETE CASCADE,
  ubicacion_id UUID NOT NULL REFERENCES ubicaciones(id),
  orden_entrega INTEGER NOT NULL,           -- Secuencia: 1, 2, 3...
  
  -- Información de la entrega
  cantidad_bultos INTEGER,
  peso_estimado_kg DECIMAL(10,2),
  volumen_estimado_m3 DECIMAL(10,2),
  tipo_mercancia TEXT,
  
  -- Estado de la parada
  estado TEXT DEFAULT 'pendiente',          -- pendiente, en_ruta, entregado, rechazado, parcial
  fecha_hora_llegada TIMESTAMPTZ,
  fecha_hora_salida TIMESTAMPTZ,
  tiempo_permanencia_minutos INTEGER,       -- Calculado: salida - llegada
  
  -- Proof of Delivery (POD)
  firma_receptor TEXT,                      -- Base64 o URL
  foto_entrega TEXT[],                      -- Array de URLs
  documento_remito TEXT,                    -- URL del remito firmado
  nombre_receptor TEXT,
  dni_receptor TEXT,
  
  -- Observaciones y excepciones
  observaciones TEXT,
  motivo_rechazo TEXT,
  cantidad_rechazada INTEGER,
  
  -- GPS tracking por parada
  latitud_entrega DECIMAL(10,8),
  longitud_entrega DECIMAL(11,8),
  
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT valid_orden CHECK (orden_entrega > 0),
  CONSTRAINT valid_estado CHECK (estado IN ('pendiente', 'en_ruta', 'entregado', 'rechazado', 'parcial'))
);

-- Índices para performance
CREATE INDEX idx_paradas_despacho ON despacho_paradas(despacho_id);
CREATE INDEX idx_paradas_ubicacion ON despacho_paradas(ubicacion_id);
CREATE INDEX idx_paradas_estado ON despacho_paradas(estado);
CREATE INDEX idx_paradas_orden ON despacho_paradas(despacho_id, orden_entrega);

-- Función para auto-calcular tiempo de permanencia
CREATE OR REPLACE FUNCTION calcular_tiempo_permanencia()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fecha_hora_salida IS NOT NULL AND NEW.fecha_hora_llegada IS NOT NULL THEN
    NEW.tiempo_permanencia_minutos := EXTRACT(EPOCH FROM (NEW.fecha_hora_salida - NEW.fecha_hora_llegada)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calcular_tiempo_permanencia
  BEFORE UPDATE ON despacho_paradas
  FOR EACH ROW
  EXECUTE FUNCTION calcular_tiempo_permanencia();
```

---

## 🔄 Relación con Tablas Existentes

### Diagrama de Entidades

```
despachos (tabla existente)
    ↓ 1:N
despacho_paradas (NUEVA)
    ↓ N:1
ubicaciones (tabla existente)

despachos
    ↓ 1:N
viajes_despacho (tabla existente)
    ↓ (vincular con paradas)
estados_por_parada (futuro - opcional)
```

### Modificaciones a Tablas Existentes

**tabla `despachos`:**
```sql
-- Mantener campos actuales por compatibilidad
-- origen, destino, origen_id, destino_id se usan como "resumen"
-- Si hay paradas, estos campos muestran: "Primer origen → Último destino"

-- Agregar campo indicador
ALTER TABLE despachos 
  ADD COLUMN tiene_multiples_paradas BOOLEAN DEFAULT FALSE,
  ADD COLUMN cantidad_paradas INTEGER DEFAULT 1;

-- Función para actualizar automáticamente
CREATE OR REPLACE FUNCTION actualizar_cantidad_paradas()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE despachos 
  SET cantidad_paradas = (
    SELECT COUNT(*) FROM despacho_paradas WHERE despacho_id = NEW.despacho_id
  ),
  tiene_multiples_paradas = (
    SELECT COUNT(*) > 1 FROM despacho_paradas WHERE despacho_id = NEW.despacho_id
  )
  WHERE id = NEW.despacho_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_cantidad_paradas
  AFTER INSERT OR DELETE ON despacho_paradas
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_cantidad_paradas();
```

---

## 📊 Consideraciones para Reportes

### Métricas Clave Necesarias

1. **Eficiencia de Ruta**
   - Tiempo total de ruta
   - Tiempo de conducción vs tiempo de paradas
   - Kilometraje total vs kilometraje productivo

2. **Performance de Entregas**
   - % de entregas exitosas vs rechazadas
   - Tiempo promedio por parada
   - Paradas que exceden tiempo estimado

3. **Análisis de Costos**
   - Costo por km vs costo por parada
   - Costo total de ruta consolidada
   - ROI de consolidación vs envíos separados

4. **Tracking Operativo**
   - Paradas completadas / Total de paradas
   - Estado actual del viaje
   - Paradas pendientes

### Queries de Ejemplo para Reportes

```sql
-- Reporte: Eficiencia de entregas por despacho
SELECT 
  d.pedido_id,
  d.cantidad_paradas,
  COUNT(CASE WHEN dp.estado = 'entregado' THEN 1 END) as entregas_exitosas,
  COUNT(CASE WHEN dp.estado = 'rechazado' THEN 1 END) as entregas_rechazadas,
  ROUND(AVG(dp.tiempo_permanencia_minutos), 2) as tiempo_promedio_parada,
  SUM(dp.tiempo_permanencia_minutos) as tiempo_total_paradas
FROM despachos d
LEFT JOIN despacho_paradas dp ON d.id = dp.despacho_id
WHERE d.tiene_multiples_paradas = TRUE
GROUP BY d.id, d.pedido_id, d.cantidad_paradas;

-- Reporte: Paradas más lentas (top 10)
SELECT 
  u.nombre as ubicacion,
  COUNT(*) as total_visitas,
  ROUND(AVG(dp.tiempo_permanencia_minutos), 2) as tiempo_promedio,
  MAX(dp.tiempo_permanencia_minutos) as tiempo_maximo
FROM despacho_paradas dp
JOIN ubicaciones u ON dp.ubicacion_id = u.id
WHERE dp.estado = 'entregado'
GROUP BY u.id, u.nombre
ORDER BY tiempo_promedio DESC
LIMIT 10;

-- Reporte: Estado actual de ruta multi-parada
SELECT 
  d.pedido_id,
  dp.orden_entrega,
  u.nombre as destino,
  dp.estado,
  dp.cantidad_bultos,
  dp.fecha_hora_llegada,
  dp.observaciones
FROM despachos d
JOIN despacho_paradas dp ON d.id = dp.despacho_id
JOIN ubicaciones u ON dp.ubicacion_id = u.id
WHERE d.id = 'UUID_DESPACHO'
ORDER BY dp.orden_entrega;
```

---

## 🎨 Diseño de UI/UX

### 1. Pantalla: Crear Despacho (Modificación)

**Wireframe Conceptual:**

```
┌─────────────────────────────────────────────┐
│ Crear Despacho                              │
├─────────────────────────────────────────────┤
│ Origen: [Depósito Central     ▼]            │
│                                             │
│ ☐ Este despacho tiene múltiples paradas     │
│                                             │
│ ┌─ Paradas de Entrega ──────────────────┐  │
│ │                                        │  │
│ │ Parada 1                          [X]  │  │
│ │ Destino: [Cliente A         ▼]        │  │
│ │ Bultos: [5]  Peso: [250kg]            │  │
│ │                                        │  │
│ │ Parada 2                          [X]  │  │
│ │ Destino: [Cliente B         ▼]        │  │
│ │ Bultos: [8]  Peso: [400kg]            │  │
│ │                                        │  │
│ │ [+ Agregar Parada]                    │  │
│ └────────────────────────────────────────┘  │
│                                             │
│ Tipo Carga: [Paletizada ▼]                 │
│ [Guardar Despacho]                         │
└─────────────────────────────────────────────┘
```

**Funcionalidad:**
- Toggle para activar/desactivar modo multi-parada
- Botón "Agregar Parada" dinámico
- Drag & drop para reordenar paradas
- Validación: mínimo 2 paradas si está activado

### 2. Vista: Tracking de Ruta Multi-Parada

**Wireframe Conceptual:**

```
┌─────────────────────────────────────────────┐
│ Despacho DSP-20260109-001                   │
│ Ruta: Depósito → 3 paradas                 │
├─────────────────────────────────────────────┤
│                                             │
│ ├─● Origen: Depósito Central                │
│ │  ✓ Salió: 08:30                          │
│ │                                           │
│ ├─✓ Parada 1: Cliente A                    │
│ │  ✓ Entregado: 09:45 (5 bultos)           │
│ │  ⏱ 15 min                                 │
│ │                                           │
│ ├─⊙ Parada 2: Cliente B (EN RUTA)          │
│ │  ⏱ ETA: 10:30                            │
│ │  📦 8 bultos pendientes                   │
│ │                                           │
│ └─○ Parada 3: Cliente C                    │
│    ⏱ ETA: 11:15                            │
│    📦 3 bultos pendientes                   │
│                                             │
│ [Ver en Mapa] [Descargar Reporte]          │
└─────────────────────────────────────────────┘
```

**Estados Visuales:**
- ● = Completado (verde)
- ⊙ = En progreso (amarillo)
- ○ = Pendiente (gris)
- ✗ = Rechazado (rojo)

### 3. Modal: Registrar Entrega por Parada

```
┌─────────────────────────────────────────────┐
│ Registrar Entrega - Cliente A               │
├─────────────────────────────────────────────┤
│ Bultos entregados: [5] de 5                 │
│                                             │
│ Estado: ○ Entregado                         │
│         ○ Rechazado                         │
│         ○ Entrega Parcial                   │
│                                             │
│ Receptor: [Juan Pérez________]              │
│ DNI:      [30123456__________]              │
│                                             │
│ Firma:  [Canvas para firmar]                │
│                                             │
│ Foto:   [📷 Tomar Foto]                     │
│         [📎 Adjuntar Remito]                │
│                                             │
│ Observaciones:                              │
│ [____________________________________]      │
│                                             │
│ [Cancelar] [Registrar Entrega]             │
└─────────────────────────────────────────────┘
```

---

## ⚙️ Lógica de Negocio

### Estados del Despacho Multi-Parada

```typescript
// Estado del despacho completo se deriva de las paradas
function calcularEstadoDespacho(paradas: Parada[]): EstadoDespacho {
  const todasEntregadas = paradas.every(p => p.estado === 'entregado');
  const algunaRechazada = paradas.some(p => p.estado === 'rechazado');
  const algunaEnRuta = paradas.some(p => p.estado === 'en_ruta');
  const todasPendientes = paradas.every(p => p.estado === 'pendiente');

  if (todasEntregadas) return 'completado';
  if (algunaRechazada && todasEntregadas) return 'completado_con_rechazos';
  if (algunaEnRuta) return 'en_transito';
  if (todasPendientes) return 'pendiente';
  
  return 'en_proceso';
}
```

### Reglas de Validación

1. **Al crear despacho:**
   - Si modo multi-parada activo → mínimo 2 paradas
   - Orden de paradas debe ser secuencial (1, 2, 3...)
   - No puede haber paradas duplicadas (mismo ubicacion_id)

2. **Durante el viaje:**
   - No se puede marcar parada N como entregada si parada N-1 está pendiente
   - (Excepto si se habilita "Saltar parada" con justificación)

3. **Al cerrar despacho:**
   - Todas las paradas deben estar en estado final (entregado/rechazado/parcial)
   - Si hay rechazos, requiere documentación de motivo

### Cálculos Automáticos

```sql
-- Trigger: Actualizar estado del despacho cuando cambia estado de parada
CREATE OR REPLACE FUNCTION actualizar_estado_despacho_por_paradas()
RETURNS TRIGGER AS $$
DECLARE
  todas_entregadas BOOLEAN;
  alguna_rechazada BOOLEAN;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE estado = 'entregado') = COUNT(*),
    COUNT(*) FILTER (WHERE estado = 'rechazado') > 0
  INTO todas_entregadas, alguna_rechazada
  FROM despacho_paradas
  WHERE despacho_id = NEW.despacho_id;

  UPDATE despachos 
  SET estado = CASE
    WHEN todas_entregadas AND NOT alguna_rechazada THEN 'completado'
    WHEN todas_entregadas AND alguna_rechazada THEN 'completado_con_excepciones'
    ELSE 'en_proceso'
  END
  WHERE id = NEW.despacho_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 🚧 Plan de Implementación

### Fase 1: Diseño y Planificación (1 semana)
- [ ] Definir proceso completo de cierre de entregas
- [ ] Diseñar flujo de estados detallado
- [ ] Crear mockups de UI completos
- [ ] Validar con usuarios clave (coordinadores)
- [ ] Aprobar estructura de reportes necesarios

### Fase 2: Backend (1-1.5 semanas)
- [ ] Crear migración SQL para tabla `despacho_paradas`
- [ ] Implementar triggers y funciones automáticas
- [ ] Crear endpoints API:
  - `POST /api/despachos/[id]/paradas` - Crear paradas
  - `PUT /api/despachos/paradas/[id]` - Actualizar estado parada
  - `GET /api/despachos/[id]/paradas` - Listar paradas
  - `DELETE /api/despachos/paradas/[id]` - Eliminar parada
- [ ] Implementar RLS policies
- [ ] Tests unitarios de lógica de negocio

### Fase 3: Frontend (1-1.5 semanas)
- [ ] Modificar formulario crear-despacho.tsx
  - Toggle multi-parada
  - Componente ParadasList
  - Drag & drop para ordenar
- [ ] Crear componente TrackingMultiParada
- [ ] Crear modal RegistrarEntregaModal
- [ ] Integrar con APIs
- [ ] Responsive design para mobile (chofer)

### Fase 4: Testing y Ajustes (3-5 días)
- [ ] Testing funcional completo
- [ ] Testing de reportes
- [ ] Validación con usuarios
- [ ] Ajustes finales
- [ ] Documentación de usuario

### Fase 5: Deployment (1-2 días)
- [ ] Migración en producción (con backup)
- [ ] Monitoreo post-deploy
- [ ] Capacitación a usuarios
- [ ] Soporte activo primera semana

**Tiempo Total Estimado:** 3-4 semanas

---

## ⚠️ Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Complejidad UI confunde usuarios | Media | Alto | Mockups validados, testing con usuarios |
| Performance con muchas paradas (50+) | Baja | Medio | Paginación, lazy loading |
| Datos históricos incompatibles | Alta | Bajo | Migración gradual, flag `tiene_multiples_paradas` |
| Reportes lentos | Media | Medio | Índices optimizados, vistas materializadas |

---

## ✅ Criterios de Aceptación

### Funcionales
- [ ] Usuario puede crear despacho con 2-N paradas
- [ ] Paradas se pueden reordenar visualmente
- [ ] Chofer puede registrar entrega por parada desde mobile
- [ ] Sistema calcula automáticamente tiempos de permanencia
- [ ] Proof of delivery se captura por parada (foto + firma)
- [ ] Reportes muestran métricas por parada y totales de ruta

### Técnicos
- [ ] Todas las queries < 200ms con 1000 despachos
- [ ] RLS implementado correctamente
- [ ] Zero downtime en deployment
- [ ] Cobertura de tests > 80%
- [ ] Documentación técnica completa

### UX
- [ ] Flow completo testeable en <5 minutos
- [ ] Mobile-friendly para choferes
- [ ] Estados visuales claros e intuitivos
- [ ] Mensajes de error descriptivos

---

## 🔗 Dependencias

### Bloqueantes (Deben completarse ANTES)
1. **Diseño de proceso de cierre de entregas**
   - Definir estados finales
   - Documentación requerida por entrega
   - Flujo de excepciones

2. **Estructura de reportes**
   - KPIs críticos definidos
   - Dashboard de análisis diseñado

### Deseables (Mejorarían la implementación)
1. Sistema de notificaciones push (para alertas de paradas)
2. Integración con GPS tracking en tiempo real
3. OCR para lectura automática de remitos

---

## 📚 Referencias

### Documentos Relacionados
- `docs/ESTRUCTURA-BD-RECURSOS-TRANSPORTE.md` - Estructura actual
- `docs/FLUJO-ESTADOS-OPERACIONES.md` - Estados del sistema
- `.session/CONTEXTO-ACTUAL.md` - Estado general del proyecto

### Inspiración / Benchmarks
- Sistema de entregas de Uber Freight
- Rutas de distribución de DHL
- Tracking multi-parada de Seur

---

## 💬 Notas Adicionales

### Consideraciones Futuras
- Optimización de rutas automática (algoritmo TSP)
- Estimación de tiempos por parada usando ML
- Integración con Waze/Google Maps para rutas sugeridas
- Sistema de calificación de ubicaciones (facilidad de descarga)

### Preguntas Pendientes
1. ¿Cuál es el máximo de paradas realista? (para dimensionar UI)
2. ¿Se permiten modificar paradas una vez iniciado el viaje?
3. ¿Qué pasa si cliente rechaza entrega en parada intermedia?
4. ¿Hay diferencia de pricing por cantidad de paradas?

---

**Documento creado por:** GitHub Copilot  
**Fecha:** 09 de Enero, 2026  
**Revisión:** v1.0  
**Próxima revisión:** Al definir proceso de cierre de entregas

---

## 📝 Changelog

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 09-Ene-2026 | v1.0 | Documento inicial - Propuesta completa |
