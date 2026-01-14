# Documentación: Sistema Dual de Estados

**Fecha:** 10 de Enero 2026  
**Versión:** 2.0 (Definitivo)  
**Basado en:** Excel "Flujo de Estados"

---

## 📋 Resumen Ejecutivo

El sistema implementa **dos dimensiones de estados independientes pero sincronizadas**:

1. **Estado CARGA** (17 estados): Ciclo de vida del producto y documentación
2. **Estado UNIDAD** (17 estados): Ubicación física y operación del camión/chofer

**Ventajas del sistema dual:**
- ✅ Separación de responsabilidades por actor
- ✅ Tracking preciso de cada dimensión
- ✅ Flexibilidad para incidencias sin bloquear flujo
- ✅ Métricas independientes (tiempo de carga vs tiempo de viaje)
- ✅ Alineado con industria (Uber Freight, Amazon Relay)

---

## 🎯 Estados de CARGA (17 estados)

Refleja el **producto y documentación**:

### **FASE 1: PLANIFICACIÓN**
| # | Estado | Actor | Descripción |
|---|--------|-------|-------------|
| 1 | `pendiente_asignacion` | Coordinador Planta | Despacho creado, esperando asignación |
| 2 | `transporte_asignado` | Coordinador Planta | Transporte asignado |

### **FASE 2: ASIGNACIÓN RECURSOS**
| # | Estado | Actor | Descripción |
|---|--------|-------|-------------|
| 3 | `camion_asignado` | Coordinador Transporte | Camión y chofer asignados |

### **FASE 3: TRÁNSITO A ORIGEN**
| # | Estado | Actor | Descripción |
|---|--------|-------|-------------|
| 4 | `en_transito_origen` | Chofer | Viajando hacia planta de carga |

### **FASE 4: OPERACIÓN EN ORIGEN**
| # | Estado | Actor | Descripción |
|---|--------|-------|-------------|
| 5 | `en_playa_origen` | Control Acceso | En planta esperando carga |
| 6 | `llamado_carga` | Supervisor Carga | Llamado a posición de carga |
| 7 | `cargando` | Supervisor Carga | Proceso de carga en progreso |
| 8 | `cargado` | Supervisor Carga | Carga completada |

### **FASE 5: EGRESO Y TRÁNSITO**
| # | Estado | Actor | Descripción |
|---|--------|-------|-------------|
| 9 | `egresado_origen` | Control Acceso | Salida autorizada de planta |
| 10 | `en_transito_destino` | Chofer | Viajando hacia destino |

### **FASE 6: OPERACIÓN EN DESTINO**
| # | Estado | Actor | Descripción |
|---|--------|-------|-------------|
| 11 | `arribado_destino` | Chofer | Arribó a destino |
| 12 | `llamado_descarga` | Supervisor Descarga | Llamado a descarga |
| 13 | `descargando` | Supervisor Descarga | Proceso de descarga |
| 14 | `entregado` | Supervisor Descarga | Producto entregado |

### **FASE 7: FINALIZACIÓN**
| # | Estado | Actor | Descripción |
|---|--------|-------|-------------|
| 15 | `disponible` | Sistema | Unidad lista para nuevo viaje |

### **ESTADOS FINALES**
| # | Estado | Actor | Descripción |
|---|--------|-------|-------------|
| 16 | `completado` | Sistema | Viaje completado exitosamente |
| 17 | `cancelado` | Coordinador Planta | Viaje cancelado |
| 18 | `expirado` | Sistema (Cron) | Sin recursos a tiempo |

---

## 🚛 Estados de UNIDAD (17 estados)

Refleja la **ubicación física del camión**:

### **FASE 1: ASIGNACIÓN**
| # | Estado | Actor | Descripción |
|---|--------|-------|-------------|
| 1 | `camion_asignado` | Coordinador Transporte | Camión y chofer asignados |

### **FASE 2: TRÁNSITO A ORIGEN**
| # | Estado | Actor | Descripción |
|---|--------|-------|-------------|
| 2 | `en_transito_origen` | Chofer | Viajando hacia planta |

### **FASE 3: OPERACIÓN EN ORIGEN**
| # | Estado | Actor | Descripción |
|---|--------|-------|-------------|
| 3 | `ingresado_origen` | Control Acceso | Ingreso registrado en portería |
| 4 | `en_playa_origen` | Control Acceso | En playa de espera |
| 5 | `llamado_carga` | Supervisor Carga | Llamado a carga |
| 6 | `cargando` | Supervisor Carga | Cargando |

### **FASE 4: EGRESO**
| # | Estado | Actor | Descripción |
|---|--------|-------|-------------|
| 7 | `egreso_origen` | Control Acceso | Egresando de planta |

### **FASE 5: TRÁNSITO A DESTINO**
| # | Estado | Actor | Descripción |
|---|--------|-------|-------------|
| 8 | `en_transito_destino` | Chofer | Viajando a destino |

### **FASE 6: OPERACIÓN EN DESTINO**
| # | Estado | Actor | Descripción |
|---|--------|-------|-------------|
| 9 | `arribado_destino` | Chofer | Arribó a destino |
| 10 | `ingresado_destino` | Control Acceso Destino | Ingreso registrado |
| 11 | `llamado_descarga` | Supervisor Descarga | Llamado a descarga |
| 12 | `descargando` | Supervisor Descarga | Descargando |
| 13 | `vacio` | Supervisor Descarga | Camión vacío |

### **FASE 7: FINALIZACIÓN**
| # | Estado | Actor | Descripción |
|---|--------|-------|-------------|
| 14 | `disponible` | Sistema | ✅ **ESTADO FINAL REUTILIZABLE**: Unidad lista para nuevo viaje |

### **ESTADOS FINALES NO REUTILIZABLES**
| # | Estado | Actor | Descripción |
|---|--------|-------|-------------|
| 15 | `cancelado` | Coordinador | Viaje cancelado (unidad no reutilizable) |
| 16 | `expirado` | Sistema (Cron) | Viaje expirado (unidad no reutilizable) |
| 17 | `incidencia` | Cualquier actor | En resolución de incidencia |

**⚠️ IMPORTANTE SOBRE ESTADO 'DISPONIBLE':**
- La unidad **termina** en estado `disponible` (no pasa a `completado`)
- El coordinador de transporte puede **ver** qué camiones están `disponible`
- Al asignar un **nuevo viaje**, la unidad pasa: `disponible` → `camion_asignado` (nuevo ciclo)
- La **carga** sí pasa a `completado` (el producto fue entregado, fin del ciclo)

---

## 🔄 Sincronización Automática

Algunos estados se sincronizan automáticamente vía triggers:

| Acción Manual | Estado CARGA | Estado UNIDAD (AUTO) |
|---------------|--------------|----------------------|
| Asignar camión+chofer | `camion_asignado` | `camion_asignado` ✅ |
| Supervisor llama a carga | `llamado_carga` | `llamado_carga` ✅ |
| Supervisor inicia carga | `cargando` | `cargando` ✅ |
| Chofer sale de planta | `en_transito_destino` | `en_transito_destino` ✅ |
| Supervisor llama a descarga | `llamado_descarga` | `llamado_descarga` ✅ |
| Supervisor inicia descarga | `descargando` | `descargando` ✅ |
| Supervisor confirma vacío | → `disponible` | `vacio` → `disponible` ✅ |
| Sistema finaliza CARGA | `disponible` → `completado` | Mantiene `disponible` ⚠️ |

**⚠️ IMPORTANTE:** Cuando la CARGA pasa a `completado`, la UNIDAD **NO cambia** - queda en `disponible` para reasignación.

---

## 👥 Permisos por Rol

### **Coordinador Planta**
**Estados CARGA que puede modificar:**
- `transporte_asignado` (asignar transporte)
- `cancelado` (cancelar viaje)

**Estados UNIDAD:** Ninguno (solo visualiza)

---

### **Coordinador Transporte**
**Estados CARGA que puede modificar:**
- `camion_asignado` (asignar camión+chofer)
- `cancelado` (cancelar antes de salida)

**Estados UNIDAD que puede modificar:**
- `camion_asignado`
- `cancelado`

**Función especial:**
- `obtener_unidades_disponibles()` - Ver camiones en estado `disponible` para asignar a nuevo viaje

---

### **Chofer**
**Estados CARGA que puede modificar:**
- `en_transito_origen`
- `en_transito_destino`
- `arribado_destino`

**Estados UNIDAD que puede modificar:**
- `en_transito_origen`
- `arribado_destino`
- `en_transito_destino`

---

### **Control de Acceso**
**Estados CARGA que puede modificar:**
- `en_playa_origen`
- `egresado_origen`

**Estados UNIDAD que puede modificar:**
- `ingresado_origen`
- `en_playa_origen`
- `egreso_origen`
- `ingresado_destino`

---

### **Supervisor de Carga/Descarga**
**Estados CARGA que puede modificar:**
- `llamado_carga`
- `cargando`
- `cargado`
- `llamado_descarga`
- `descargando`
- `entregado`

**Estados UNIDAD que puede modificar:**
- `llamado_carga`
- `cargando`
- `llamado_descarga`
- `descargando`
- `vacio`

---

## 🚨 Manejo de Incidencias

Las **incidencias NO son estados**, son **registros en tabla separada** (`incidencias`).

### **Tipos de Incidencia:**
- `faltante_carga` - Producto faltante
- `rechazo_carga` - Carga rechazada por calidad
- `demora_excesiva` - Retraso significativo
- `documentacion_incorrecta` - Problemas con documentación
- `averia_camion` - Problema mecánico
- `accidente` - Accidente de tránsito
- `otro` - Otros casos

### **Severidad:**
- `baja` - No afecta el viaje
- `media` - Requiere atención
- `alta` - Bloquea el viaje
- `critica` - Requiere cancelación

### **Estados de Resolución:**
- `reportada` → `en_revision` → `en_resolucion` → `resuelta` → `cerrada`

### **Importante:**
- El **viaje mantiene su estado** mientras hay incidencia
- Solo si `requiere_cancelacion = true` → Coordinador cambia viaje a `cancelado`
- Las incidencias se consultan por `viaje_id`

---

## 📊 Queries Útiles

### **Ver estado completo de un viaje:**
```sql
SELECT 
  v.id,
  d.pedido_id,
  v.estado_carga,
  v.estado_unidad,
  c.patente AS camion,
  ch.nombre AS chofer,
  (SELECT COUNT(*) FROM incidencias i 
   WHERE i.viaje_id = v.id 
     AND i.estado_incidencia NOT IN ('resuelta', 'cerrada')) AS incidencias_activas
FROM viajes_despacho v
JOIN despachos d ON v.despacho_id = d.id
LEFT JOIN camiones c ON v.camion_id = c.id
LEFT JOIN choferes ch ON v.chofer_id = ch.id
WHERE v.id = 'tu-viaje-id';
```

### **Viajes activos (con recursos asignados):**
```sql
SELECT * FROM vista_viajes_estados
WHERE tiene_recursos = true
  AND categoria_estado IN ('en_transito', 'operacion_activa')
ORDER BY updated_at DESC;
```

### **Unidades disponibles para asignar (Coordinador Transporte):**
```sql
-- Ver camiones+choferes disponibles para nuevo viaje
SELECT * FROM obtener_unidades_disponibles();

-- Resultado:
-- camion_id | chofer_id | patente | nombre_chofer | empresa_id | ultimo_viaje_completado
-- abc-123   | def-456   | ABC123  | Juan Pérez    | empresa-1  | 2026-01-10 14:30:00
```

### **Viajes expirados:**
```sql
SELECT * FROM vista_viajes_expirados_analytics
WHERE fecha_expiracion >= NOW() - INTERVAL '7 days'
ORDER BY fecha_expiracion DESC;
```

### **Incidencias activas:**
```sql
SELECT 
  i.*,
  v.estado_carga,
  v.estado_unidad,
  d.pedido_id
FROM incidencias i
JOIN viajes_despacho v ON i.viaje_id = v.id
JOIN despachos d ON v.despacho_id = d.id
WHERE i.estado_incidencia NOT IN ('resuelta', 'cerrada')
  AND i.severidad IN ('alta', 'critica')
ORDER BY i.created_at DESC;
```

---

## 🎨 Uso en Frontend

### **Selector de Estados por Rol:**
```typescript
// Obtener estados permitidos desde backend
const { data: estadosCargaPermitidos } = await supabase
  .rpc('estados_carga_permitidos_chofer');

const { data: estadosUnidadPermitidos } = await supabase
  .rpc('estados_unidad_permitidos_chofer');

// Renderizar selector
<select>
  {estadosCargaPermitidos.map(estado => (
    <option key={estado} value={estado}>
      {LABELS_ESTADOS_CARGA[estado]}
    </option>
  ))}
</select>
```

### **Badges de Estado:**
```typescript
const COLORES_ESTADO_CARGA = {
  'pendiente_asignacion': 'gray',
  'transporte_asignado': 'blue',
  'camion_asignado': 'green',
  'en_transito_origen': 'yellow',
  'cargando': 'orange',
  'en_transito_destino': 'yellow',
  'descargando': 'orange',
  'completado': 'green',
  'cancelado': 'red',
  'expirado': 'red'
};

<Badge color={COLORES_ESTADO_CARGA[viaje.estado_carga]}>
  {viaje.estado_carga}
</Badge>
```

### **Reportar Incidencia:**
```typescript
const reportarIncidencia = async (viajeId: string) => {
  const { error } = await supabase
    .from('incidencias')
    .insert({
      viaje_id: viajeId,
      tipo_incidencia: 'demora_excesiva',
      severidad: 'media',
      titulo: 'Retraso en planta origen',
      descripcion: 'Camión en playa hace 3 horas',
      reportado_por_user_id: userId,
      reportado_por_rol: 'supervisor'
    });
  
  // El viaje MANTIENE su estado actual
  // No se modifica estado_carga ni estado_unidad
};
```

---

## 🔧 Migración desde Sistema Anterior

La migración automática mapea:

| Estado Antiguo | Estado CARGA Nuevo | Estado UNIDAD Nuevo |
|----------------|-------------------|---------------------|
| `pendiente` | `pendiente_asignacion` | `NULL` (sin unidad) |
| `transporte_asignado` | `transporte_asignado` | `NULL` o `camion_asignado` |
| `en_transito` | `en_transito_destino` | `en_transito_destino` |
| `completado` | `completado` | `completado` |
| `cancelado` | `cancelado` | `cancelado` |

---

## ✅ Checklist de Implementación

- [x] Migración SQL ejecutada
- [x] Tipos TypeScript actualizados
- [x] Funciones helper por rol creadas
- [x] Triggers de sincronización configurados
- [x] Tabla incidencias creada
- [ ] Componentes UI actualizados
- [ ] Selectores de estado por rol
- [ ] Badges/indicadores visuales
- [ ] Modal de incidencias
- [ ] Testing completo

---

## 📞 Soporte

**Archivos Relacionados:**
- SQL: `sql/migrations/015_sistema_estados_duales_v2.sql`
- Tipos: `lib/types.ts` (líneas 530-750)
- Excel: Flujo de Estados (10 Ene 2026)

**Consultas:**
Revisar documentación en código o consultar con el equipo de desarrollo.
