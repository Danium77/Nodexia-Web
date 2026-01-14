# 🤖 Sistema de Asignación Automática por Prioridad

---

## 📋 Metadata

| Campo | Valor |
|-------|-------|
| **Fecha de creación** | 09 de Enero, 2026 |
| **Prioridad** | 🟡 Media |
| **Estado** | 📝 Propuesta |
| **Responsable** | Por definir |
| **Estimación** | 2-3 semanas |
| **Dependencias** | Ninguna (feature independiente) |

---

## 🎯 Contexto y Problema

### Necesidad del Negocio

En operaciones logísticas con **múltiples transportes disponibles**, el coordinador debe asignar manualmente cada despacho. El proceso actual:

1. Coordinador crea despacho
2. Coordinador busca transporte disponible
3. Coordinador asigna manualmente
4. Si transporte no responde, **debe reasignar manualmente**

**Problema:** Este proceso manual consume tiempo y es propenso a olvidos.

### Caso de Uso Real

```
Ejemplo: Despacho urgente creado a las 8:00 AM
- 8:00: Asignado manualmente a "Transportes Premium S.A." (prioridad 1)
- 8:30: Premium NO responde/acepta
- Coordinador debe recordar reasignar
- 9:00: Reasignado manualmente a "Logística Rápida SRL" (prioridad 2)
- 9:20: Acepta

Tiempo perdido: 1h 20min
```

**Con sistema automático:**
```
- 8:00: Asignado automáticamente a "Transportes Premium S.A."
- 8:30: Sistema auto-reasigna a "Logística Rápida SRL"
- 8:45: Acepta
Tiempo perdido: 45min
```

---

## 🎨 Solución Propuesta

### Concepto: "Cascada de Asignación"

El sistema ofrece el despacho a transportes en **orden de prioridad**, con **timeout configurable** por nivel.

```
Despacho creado
    ↓
Asignar a Transporte Prioridad 1
    ↓ (timeout: 30 min)
¿Aceptó? → SÍ → ✅ Asignado
    ↓ NO
Asignar a Transporte Prioridad 2
    ↓ (timeout: 20 min)
¿Aceptó? → SÍ → ✅ Asignado
    ↓ NO
Asignar a Transporte Prioridad 3
    ↓ (timeout: 15 min)
¿Aceptó? → SÍ → ✅ Asignado
    ↓ NO
Abrir a Red Nodexia (todos los transportes)
```

---

## 🗄️ Estructura de Base de Datos

### Nueva Tabla: `listas_prioridad_transportes`

```sql
CREATE TABLE listas_prioridad_transportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  nombre_lista TEXT NOT NULL,                      -- Ej: "Prioridad Zona Norte"
  descripcion TEXT,
  
  -- Configuración de timeouts
  timeout_nivel_1_minutos INTEGER DEFAULT 30,
  timeout_nivel_2_minutos INTEGER DEFAULT 20,
  timeout_nivel_3_minutos INTEGER DEFAULT 15,
  timeout_nivel_4_minutos INTEGER DEFAULT 10,
  
  -- Comportamiento al agotar opciones
  accion_sin_respuestas TEXT DEFAULT 'abrir_red_nodexia', -- 'abrir_red_nodexia', 'notificar_coordinador', 'cancelar'
  
  -- Metadata
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_timeouts CHECK (
    timeout_nivel_1_minutos > 0 AND
    timeout_nivel_2_minutos > 0 AND
    timeout_nivel_3_minutos > 0
  )
);

-- Índices
CREATE INDEX idx_listas_prioridad_empresa ON listas_prioridad_transportes(empresa_id);
CREATE INDEX idx_listas_prioridad_activa ON listas_prioridad_transportes(activa);
```

### Nueva Tabla: `transportes_en_lista_prioridad`

```sql
CREATE TABLE transportes_en_lista_prioridad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id UUID NOT NULL REFERENCES listas_prioridad_transportes(id) ON DELETE CASCADE,
  transporte_id UUID NOT NULL REFERENCES empresas(id),
  
  -- Orden de prioridad
  nivel_prioridad INTEGER NOT NULL,                -- 1, 2, 3, 4...
  orden_dentro_nivel INTEGER DEFAULT 1,            -- Si hay varios en mismo nivel
  
  -- Condiciones opcionales
  solo_para_tipo_carga TEXT[],                     -- NULL = todos, o ['paletizada', 'granel']
  solo_para_urgencias BOOLEAN DEFAULT FALSE,       -- TRUE = solo se usa si prioridad = 'Urgente'
  
  -- Metadata
  activo BOOLEAN DEFAULT TRUE,
  fecha_agregado TIMESTAMPTZ DEFAULT NOW(),
  agregado_por UUID REFERENCES auth.users(id),
  
  -- Constraints
  UNIQUE(lista_id, transporte_id),
  CONSTRAINT valid_prioridad CHECK (nivel_prioridad > 0 AND nivel_prioridad <= 10)
);

-- Índices
CREATE INDEX idx_transportes_lista ON transportes_en_lista_prioridad(lista_id);
CREATE INDEX idx_transportes_nivel ON transportes_en_lista_prioridad(nivel_prioridad);
```

### Nueva Tabla: `historial_asignacion_automatica`

```sql
CREATE TABLE historial_asignacion_automatica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  despacho_id UUID NOT NULL REFERENCES despachos(id),
  lista_prioridad_id UUID REFERENCES listas_prioridad_transportes(id),
  
  -- Transporte al que se asignó
  transporte_id UUID NOT NULL REFERENCES empresas(id),
  nivel_prioridad INTEGER NOT NULL,
  
  -- Resultado
  estado TEXT NOT NULL,                            -- 'ofrecido', 'aceptado', 'rechazado', 'timeout', 'cancelado'
  fecha_ofrecido TIMESTAMPTZ DEFAULT NOW(),
  fecha_respuesta TIMESTAMPTZ,
  tiempo_respuesta_minutos INTEGER,
  motivo_rechazo TEXT,
  
  -- Próxima acción
  proximo_transporte_id UUID REFERENCES empresas(id),
  reasignado_automaticamente BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_historial_despacho ON historial_asignacion_automatica(despacho_id);
CREATE INDEX idx_historial_transporte ON historial_asignacion_automatica(transporte_id);
CREATE INDEX idx_historial_estado ON historial_asignacion_automatica(estado);
```

---

## ⚙️ Lógica de Negocio

### Flujo Principal

```typescript
// Función que se ejecuta cuando se crea un despacho
async function iniciarAsignacionAutomatica(despacho_id: string, empresa_id: string) {
  
  // 1. Obtener lista de prioridad activa de la empresa
  const listaPrioridad = await obtenerListaPrioridadActiva(empresa_id);
  
  if (!listaPrioridad) {
    // No hay lista configurada, asignación manual tradicional
    return { tipo: 'manual' };
  }
  
  // 2. Obtener transportes ordenados por prioridad
  const transportes = await obtenerTransportesOrdenados(listaPrioridad.id, despacho);
  
  if (transportes.length === 0) {
    return { tipo: 'sin_transportes' };
  }
  
  // 3. Asignar al primer transporte de la lista
  const primerTransporte = transportes[0];
  const timeout = obtenerTimeout(primerTransporte.nivel_prioridad, listaPrioridad);
  
  await asignarYProgramarTimeout(
    despacho_id,
    primerTransporte,
    timeout,
    transportes.slice(1) // Resto de transportes como fallback
  );
  
  return { tipo: 'automatica', transporte_actual: primerTransporte };
}

// Función que se ejecuta al cumplirse el timeout
async function manejarTimeout(historial_id: string) {
  const historial = await obtenerHistorial(historial_id);
  
  // Marcar como timeout
  await actualizarHistorial(historial_id, {
    estado: 'timeout',
    fecha_respuesta: new Date(),
    tiempo_respuesta_minutos: calcularTiempo(historial.fecha_ofrecido)
  });
  
  // Obtener siguiente transporte
  const siguienteTransporte = await obtenerSiguienteTransporte(
    historial.lista_prioridad_id,
    historial.nivel_prioridad
  );
  
  if (!siguienteTransporte) {
    // No hay más transportes, abrir a red o notificar
    await ejecutarAccionFinal(historial.despacho_id, historial.lista_prioridad_id);
    return;
  }
  
  // Reasignar automáticamente
  await reasignarATransporte(
    historial.despacho_id,
    siguienteTransporte,
    historial.lista_prioridad_id
  );
}

// Función que se ejecuta cuando transporte acepta/rechaza
async function manejarRespuestaTransporte(
  historial_id: string, 
  acepta: boolean, 
  motivo?: string
) {
  const historial = await obtenerHistorial(historial_id);
  
  if (acepta) {
    await actualizarHistorial(historial_id, {
      estado: 'aceptado',
      fecha_respuesta: new Date(),
      tiempo_respuesta_minutos: calcularTiempo(historial.fecha_ofrecido)
    });
    
    // Cancelar timeout programado
    await cancelarTimeout(historial_id);
    
    // Confirmar asignación definitiva
    await confirmarAsignacion(historial.despacho_id, historial.transporte_id);
    
  } else {
    // Rechazó - proceder igual que timeout
    await actualizarHistorial(historial_id, {
      estado: 'rechazado',
      motivo_rechazo: motivo,
      fecha_respuesta: new Date()
    });
    
    await manejarTimeout(historial_id);
  }
}
```

---

## 🎨 Diseño de UI/UX

### Pantalla: Configurar Lista de Prioridades

```
┌────────────────────────────────────────────────────┐
│ 🎯 Listas de Prioridad de Transportes              │
├────────────────────────────────────────────────────┤
│                                                    │
│ ┌─ Lista: Prioridad General ──────────────────┐   │
│ │  ✅ Activa                                   │   │
│ │                                              │   │
│ │  ⏱ Timeouts:                                 │   │
│ │  • Nivel 1: [30] minutos                    │   │
│ │  • Nivel 2: [20] minutos                    │   │
│ │  • Nivel 3: [15] minutos                    │   │
│ │                                              │   │
│ │  📋 Transportes (ordenados por prioridad):   │   │
│ │                                              │   │
│ │  🥇 Nivel 1                                  │   │
│ │    • Transportes Premium S.A.          [↑↓] │   │
│ │    • Logística Express SRL             [↑↓] │   │
│ │                                              │   │
│ │  🥈 Nivel 2                                  │   │
│ │    • Cargas del Sur                    [↑↓] │   │
│ │    • Norte Logística                   [↑↓] │   │
│ │                                              │   │
│ │  🥉 Nivel 3                                  │   │
│ │    • Otros transportes...              [↑↓] │   │
│ │                                              │   │
│ │  [+ Agregar Transporte]                     │   │
│ │                                              │   │
│ │  Si nadie responde:                         │   │
│ │  ○ Abrir a Red Nodexia                      │   │
│ │  ○ Notificar coordinador                    │   │
│ │  ○ Cancelar despacho                        │   │
│ │                                              │   │
│ │  [Guardar] [Desactivar]                     │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ [+ Nueva Lista de Prioridad]                      │
└────────────────────────────────────────────────────┘
```

### Vista: Asignación Automática en Progreso

```
┌────────────────────────────────────────────────────┐
│ Despacho DSP-20260109-001                          │
│ Centro de Distribución → Supermercados La Economía│
├────────────────────────────────────────────────────┤
│                                                    │
│ 🤖 Asignación Automática en Progreso              │
│                                                    │
│ ┌─ Timeline ─────────────────────────────────┐    │
│ │                                            │    │
│ │ 08:00 ✅ Ofrecido a Transportes Premium    │    │
│ │       ⏱ Esperando respuesta (25 min)      │    │
│ │       ⏳ Timeout en 5 minutos              │    │
│ │                                            │    │
│ │ 08:30 ⏸ Si no responde:                    │    │
│ │       → Logística Express SRL              │    │
│ │                                            │    │
│ │ 08:50 ⏸ Si no responde:                    │    │
│ │       → Cargas del Sur                     │    │
│ │                                            │    │
│ └────────────────────────────────────────────┘    │
│                                                    │
│ [Cancelar Automática] [Asignar Manualmente]       │
└────────────────────────────────────────────────────┘
```

---

## 📊 Métricas y Reportes

### KPIs del Sistema

1. **Tasa de aceptación por nivel:**
   - Nivel 1: X% aceptan
   - Nivel 2: Y% aceptan
   - Nivel 3: Z% aceptan

2. **Tiempo promedio de respuesta:**
   - Por transporte
   - Por nivel
   - Por tipo de carga

3. **Efectividad de listas:**
   - % de despachos asignados sin llegar a Red Nodexia
   - Nivel promedio en que se asigna

### Queries de Ejemplo

```sql
-- Reporte: Efectividad de transportes por nivel
SELECT 
  t.nombre as transporte,
  tp.nivel_prioridad,
  COUNT(*) as ofertas_recibidas,
  COUNT(*) FILTER (WHERE h.estado = 'aceptado') as aceptados,
  ROUND(
    COUNT(*) FILTER (WHERE h.estado = 'aceptado')::DECIMAL / COUNT(*) * 100, 
    2
  ) as tasa_aceptacion,
  ROUND(AVG(h.tiempo_respuesta_minutos), 2) as tiempo_promedio_respuesta
FROM historial_asignacion_automatica h
JOIN transportes_en_lista_prioridad tp ON h.transporte_id = tp.transporte_id
JOIN empresas t ON t.id = h.transporte_id
GROUP BY t.id, t.nombre, tp.nivel_prioridad
ORDER BY tp.nivel_prioridad, tasa_aceptacion DESC;
```

---

## 🔄 Plan de Implementación

### Fase 1: Backend (1 semana)
- [ ] Crear tablas de BD
- [ ] Implementar lógica de cascada de asignación
- [ ] Sistema de timeouts (usando cron jobs o Supabase Functions)
- [ ] APIs para gestionar listas de prioridad
- [ ] Tests unitarios

### Fase 2: Frontend (1 semana)
- [ ] Pantalla "Configurar Listas de Prioridad"
- [ ] Drag & drop para ordenar transportes
- [ ] Vista de asignación en progreso
- [ ] Notificaciones en tiempo real (Supabase Realtime)
- [ ] Historial de asignaciones automáticas

### Fase 3: Testing (3-5 días)
- [ ] Pruebas de flujo completo
- [ ] Validar timeouts funcionan correctamente
- [ ] Testing de edge cases (todos rechazan, transporte inactivo, etc.)

**Tiempo Total:** 2-3 semanas

---

## ⚠️ Riesgos y Consideraciones

### Riesgos Técnicos

| Riesgo | Mitigación |
|--------|------------|
| Timeout no se dispara correctamente | Usar Supabase Edge Functions con cron, backup con polling |
| Múltiples asignaciones simultáneas | Transactions con locks optimistas |
| Transporte fuera de servicio | Verificar disponibilidad antes de asignar |

### Consideraciones de Negocio

**¿Qué pasa si…?**

1. **Transporte acepta después del timeout?**
   - Sistema rechaza automáticamente
   - Notifica que ya fue reasignado

2. **Coordinador quiere asignar manualmente mientras está en automático?**
   - Permitir override manual
   - Cancelar proceso automático
   - Registrar en historial

3. **Prioridad cambia después de iniciado el proceso?**
   - No afecta procesos en curso
   - Solo aplica a futuros despachos

---

## ✅ Criterios de Aceptación

### Funcionales
- [ ] Coordinador puede crear múltiples listas de prioridad
- [ ] Sistema asigna automáticamente siguiendo orden configurado
- [ ] Timeout se respeta (±1 minuto de precisión)
- [ ] Transporte recibe notificación de asignación
- [ ] Historial completo de asignaciones visualizable

### Técnicos
- [ ] Timeouts precisos (error < 5%)
- [ ] Sin duplicación de asignaciones
- [ ] Performance: < 500ms para reasignar
- [ ] Logs completos para auditoría

---

## 🔗 Referencias

- Sistema similar: Uber Freight (cascada de choferes)
- Documentación Supabase Edge Functions
- Algoritmos de Round-Robin para distribución equitativa

---

**Documento creado por:** GitHub Copilot  
**Fecha:** 09 de Enero, 2026  
**Versión:** v1.0
