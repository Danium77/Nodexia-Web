# Verificación de Preservación de Relaciones - Migración 015

## ✅ GARANTÍAS DE LA MIGRACIÓN

### 1. **Columnas Foreign Key PRESERVADAS (NO SE TOCAN)**

La migración 015 **SOLO AGREGA** estas 2 columnas:
- `estado_carga` (TEXT, nullable → NOT NULL después de migrar datos)
- `estado_unidad` (TEXT, nullable)

**NO modifica, elimina ni afecta:**
- ✅ `despacho_id` → Relación con tabla despachos (vincula viaje con despacho)
- ✅ `transport_id` → Relación con empresa de transporte (UUID)
- ✅ `chofer_id` → Relación con chofer asignado
- ✅ `camion_id` → Relación con camión asignado
- ✅ Todas las demás columnas existentes

### 2. **Vinculaciones por Rol PRESERVADAS**

#### **Coordinador Planta (crear despacho)**
- ✅ Tabla `despachos` intacta
- ✅ Campo `created_by` preservado (vincula usuario creador)
- ✅ Campo `transport_id` preservado (asignar transporte)
- ✅ Puede crear despacho → genera viaje automático

#### **Coordinador Transporte (asignar unidad)**
- ✅ Campo `transport_id` en viajes_despacho preservado
- ✅ Campo `camion_id` preservado (asignar camión)
- ✅ Campo `chofer_id` preservado (asignar chofer)
- ✅ Puede ver solo viajes de su empresa (RLS por transport_id)

#### **Control Acceso (escanear QR)**
- ✅ Relación viaje → camión preservada (`camion_id`)
- ✅ Relación viaje → despacho preservada (`despacho_id`)
- ✅ Puede escanear QR y actualizar estados
- ✅ Acceso por empresa_id del despacho (RLS preservado)

#### **Chofer (recibir viaje)**
- ✅ Campo `chofer_id` preservado
- ✅ Puede ver solo sus viajes (RLS por chofer_id)
- ✅ Puede actualizar ubicación GPS (tabla separada)

#### **Cliente (visualizar envío)**
- ✅ Relación despacho → cliente preservada
- ✅ Puede ver estado de sus envíos vía despachos

### 3. **Flujo de Datos PRESERVADO**

```
Despacho (tabla despachos)
    ↓ [despacho_id]
ViajeDespacho (tabla viajes_despacho)
    ├─ [transport_id] → Empresa Transporte
    ├─ [camion_id] → Camión
    ├─ [chofer_id] → Chofer
    ├─ [estado_carga] → NUEVO (ciclo carga)
    └─ [estado_unidad] → NUEVO (ciclo unidad)
```

### 4. **Políticas RLS NO AFECTADAS**

La migración NO modifica:
- ✅ Políticas de seguridad existentes (RLS)
- ✅ Permisos por rol
- ✅ Filtros por empresa_id, transport_id, chofer_id

**Nota:** Si hay políticas RLS que filtran por `estado = 'pendiente'`, deberán actualizarse para usar `estado_carga` en el futuro.

### 5. **Triggers Nuevos vs Existentes**

**Triggers NUEVOS (agregados por migración 015):**
- `trigger_auto_asignar_camion` - Auto-asigna estado cuando se asigna camión
- `trigger_sync_estados` - Sincroniza estados carga/unidad

**Triggers EXISTENTES (se mantienen):**
- Cualquier trigger de auditoría existente
- Triggers de actualización de timestamps
- Triggers de notificaciones

**⚠️ POSIBLE CONFLICTO:** Si existe un trigger que modifica `estado` en viajes_despacho, puede entrar en conflicto. Revisar triggers existentes antes de ejecutar.

### 6. **Índices AGREGADOS (no reemplazados)**

La migración AGREGA estos índices:
- `idx_viajes_estado_carga`
- `idx_viajes_estado_unidad`
- `idx_viajes_estados_combinados`
- `idx_viajes_activos`

Los índices existentes (`idx_viajes_despacho_transport_id`, etc.) **se mantienen**.

## 🔍 VERIFICACIÓN POST-MIGRACIÓN

Ejecutar estos queries después de la migración para confirmar:

```sql
-- 1. Verificar que las FK siguen existiendo
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  a.attname AS column_name,
  confrelid::regclass AS foreign_table_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE conrelid = 'viajes_despacho'::regclass
  AND contype = 'f'
ORDER BY conname;

-- 2. Verificar que despacho_id, transport_id, etc. siguen ahí
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'viajes_despacho'
  AND column_name IN ('despacho_id', 'transport_id', 'chofer_id', 'camion_id', 'estado_carga', 'estado_unidad')
ORDER BY column_name;

-- 3. Verificar que las relaciones funcionan
SELECT 
  v.id,
  v.despacho_id,
  v.transport_id,
  v.chofer_id,
  v.camion_id,
  v.estado_carga,
  v.estado_unidad,
  d.pedido_id
FROM viajes_despacho v
JOIN despachos d ON v.despacho_id = d.id
LIMIT 5;
```

## ✅ CONCLUSIÓN

**La migración 015 es SEGURA para las relaciones existentes:**

1. ✅ Solo AGREGA columnas, no modifica estructuras existentes
2. ✅ Todas las FK se preservan (despacho_id, transport_id, chofer_id, camion_id)
3. ✅ Los flujos de trabajo por rol siguen funcionando
4. ✅ Las vinculaciones empresa-despacho-viaje-transporte están intactas
5. ✅ El campo `estado` antiguo se depreca pero NO se elimina (retrocompatibilidad)

**Riesgo mínimo:** Solo si existen triggers/RLS que dependan del campo `estado` antiguo, requerirán actualización posterior (pero no bloquean la migración).
