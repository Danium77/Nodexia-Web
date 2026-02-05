# 🗄️ PLAN DE MIGRACIÓN - BASE DE DATOS

**Fecha de creación:** 05-FEB-2026  
**Estado:** En implementación  
**Objetivo:** Resolver inconsistencias de nomenclatura y duplicaciones en BD  
**Basado en:** [AUDITORIA-INCONSISTENCIAS-BD.md](./AUDITORIA-INCONSISTENCIAS-BD.md)

---

## 🎯 PROBLEMAS IDENTIFICADOS

### 1. 🔴 Nombres de Campos Inconsistentes
**Problema:** Convención mezclada entre `id_tabla` vs `tabla_id`
- ❌ Código viejo: `id_chofer`, `id_camion`, `id_acoplado`
- ✅ BD actual: `chofer_id`, `camion_id`, `acoplado_id`

**Impacto:** Pantallas muestran "Sin asignar" en lugar de datos reales

### 2. 🔴 Duplicación de Tablas GPS  
**Problema:** Dos tablas para tracking GPS
- 🗂️ `tracking_gps` (tabla vieja/alternativa)
- 🗂️ `ubicaciones_choferes` (tabla nueva/principal)

**Impacto:** Datos dispersos, código complejo, confusión operativa

### 3. 🟡 Registros Faltantes
**Problema:** Viajes sin registro en `estado_unidad_viaje`
**Impacto:** Indicadores de estado no se muestran en viajes activos

---

## 📋 ESTRATEGIA DE MIGRACIÓN

### 🚀 PRINCIPIOS
1. **Zero Downtime:** Sistema debe funcionar durante migración
2. **Rollback Safe:** Cambios reversibles en caso de problemas  
3. **Testing Exhaustivo:** Validar cada fase antes de continuar
4. **Documentación Completa:** Registrar todos los cambios

### ⏱️ DURACIÓN ESTIMADA
- **Total:** 2-3 horas
- **Por fase:** 30-45 minutos cada una
- **Testing:** 30 minutos entre fases

---

## 📊 FASE 1: VIEWS DE COMPATIBILIDAD

**Objetivo:** Crear aliases temporales para mantener compatibilidad

### 1.1 Views para Tablas GPS
```sql
-- Crear view para mantener compatibilidad con código que busca tracking_gps
CREATE OR REPLACE VIEW tracking_gps AS 
SELECT 
    id,
    chofer_id as id_chofer,  -- Alias para compatibilidad
    chofer_id,
    latitud,
    longitud,
    timestamp as fecha_hora,
    timestamp,
    created_at
FROM ubicaciones_choferes;
```

### 1.2 Verificar Estructura de ubicaciones_choferes
```sql
-- Confirmar estructura actual
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ubicaciones_choferes' 
ORDER BY ordinal_position;
```

### 1.3 Scripts de Rollback
```sql
-- En caso de problemas, eliminar views
DROP VIEW IF EXISTS tracking_gps_legacy;
DROP VIEW IF EXISTS tracking_gps;
```

**Archivos a crear:**
- `sql/migracion/01-crear-views-compatibilidad.sql`
- `sql/migracion/01-rollback-views.sql`

---

## 🔧 FASE 2: ACTUALIZAR CÓDIGO

**Objetivo:** Corregir 8 archivos con convención inconsistente

### 2.1 Archivos Identificados
1. ✅ `pages/api/gps/registrar-ubicacion.ts` - **YA CORREGIDO**
2. ❌ `lib/hooks/useRedNodexia.tsx` - Líneas 194, 198
3. ❌ `types/red-nodexia.ts` - Líneas 248-249
4. ❌ `types/missing-types.ts` - Líneas 98-100
5. ❌ `pages/transporte/cargas-en-red.tsx` - Línea 444
6. ❌ `pages/crear-despacho.tsx` - Líneas 1180, 1183-1185
7. ❌ `pages/chofer/viajes.tsx` - Línea 97
8. ❌ `components/Transporte/AceptarDespachoModal.tsx` - Líneas 159, 200

### 2.2 Patrón de Reemplazo
```typescript
// ❌ ANTES (convención vieja)
const chofer = viaje.id_chofer;
const camion = viaje.id_camion;
const acoplado = viaje.id_acoplado;

// ✅ DESPUÉS (convención correcta)
const chofer = viaje.chofer_id;
const camion = viaje.camion_id;
const acoplado = viaje.acoplado_id;
```

### 2.3 Validación por Archivo
- Buscar todas las referencias a `id_chofer`, `id_camion`, `id_acoplado`
- Reemplazar por `chofer_id`, `camion_id`, `acoplado_id`
- Verificar que tipos TypeScript sean consistentes
- Testing individual por archivo

---

## 🗂️ FASE 3: MIGRACIÓN DE DATOS

**Objetivo:** Migrar datos históricos y consolidar tablas

### 3.1 Análisis Previo
```sql
-- Verificar si tracking_gps tiene datos únicos
SELECT 
    COUNT(*) as total_tracking_gps,
    (SELECT COUNT(*) FROM ubicaciones_choferes) as total_ubicaciones,
    COUNT(DISTINCT chofer_id) as choferes_unicos_tracking
FROM tracking_gps;
```

### 3.2 Script de Migración (si es necesario)
```sql
-- Solo si tracking_gps tiene datos únicos
INSERT INTO ubicaciones_choferes (chofer_id, latitud, longitud, timestamp, created_at)
SELECT 
    id_chofer as chofer_id,
    latitud,
    longitud,
    fecha_hora as timestamp,
    COALESCE(created_at, fecha_hora) as created_at
FROM tracking_gps t
WHERE NOT EXISTS (
    SELECT 1 FROM ubicaciones_choferes u 
    WHERE u.chofer_id = t.id_chofer 
    AND u.timestamp = t.fecha_hora
);
```

### 3.3 Fix Estados Unidad Viaje
```sql
-- Crear registros faltantes en estado_unidad_viaje
INSERT INTO estado_unidad_viaje (viaje_id, estado, updated_at)
SELECT 
    v.id as viaje_id,
    CASE 
        WHEN v.estado = 'confirmado' THEN 'confirmado'
        WHEN v.estado = 'en_curso' THEN 'en_ruta'
        WHEN v.estado = 'finalizado' THEN 'finalizado'
        ELSE 'asignado'
    END as estado,
    v.updated_at
FROM viajes_despacho v
WHERE NOT EXISTS (
    SELECT 1 FROM estado_unidad_viaje e 
    WHERE e.viaje_id = v.id
);
```

**Archivos a crear:**
- `sql/migracion/03-migrar-datos-gps.sql`
- `sql/migracion/03-fix-estado-unidad-viaje.sql`

---

## ✅ FASE 4: TESTING COMPLETO

**Objetivo:** Verificar que todo funciona correctamente

### 4.1 Testing Manual por Pantalla

**GPS y Tracking:**
- [ ] `/chofer/tracking-gps` - Envío de coordenadas ✅
- [ ] `/transporte/viajes-activos` - Visualización en mapa ✅  
- [ ] `/chofer/viajes` - Estado de viajes ✅

**Gestión de Recursos:**
- [ ] `/crear-despacho` - Asignación de chofer/camión/acoplado ✅
- [ ] `/planificacion` - Vista de viajes programados ✅
- [ ] `/transporte/cargas-en-red` - Red Nodexia ✅

**Indicadores y Estados:**
- [ ] Badges de estado en viajes activos ✅
- [ ] Contadores en dashboard ✅
- [ ] Indicadores LED en planificación ✅

### 4.2 Validación de Datos
```sql
-- Verificar integridad después de migración
SELECT 
    'viajes_despacho' as tabla,
    COUNT(*) as total,
    COUNT(chofer_id) as con_chofer,
    COUNT(camion_id) as con_camion,
    COUNT(acoplado_id) as con_acoplado
FROM viajes_despacho
WHERE estado NOT IN ('cancelado', 'expirado')

UNION ALL

SELECT 
    'ubicaciones_choferes',
    COUNT(*),
    COUNT(DISTINCT chofer_id),
    NULL,
    NULL
FROM ubicaciones_choferes;
```

### 4.3 Testing TypeScript
```bash
# Verificar que errores no aumentaron
pnpm type-check | Select-Object -First 20
```

---

## 🧹 FASE 5: CLEANUP Y DOCUMENTACIÓN

**Objetivo:** Limpiar elementos temporales y documentar cambios

### 5.1 Eliminar Elementos Temporales
```sql
-- Solo si migración fue exitosa
DROP VIEW IF EXISTS tracking_gps;
DROP TABLE IF EXISTS tracking_gps; -- Solo si ya no se usa
```

### 5.2 Actualizar Documentación
- [ ] Actualizar `docs/ESTRUCTURA-BD-RECURSOS-TRANSPORTE.md`
- [ ] Marcar issues como resueltos en `docs/PROBLEMAS-CONOCIDOS.md`
- [ ] Crear `docs/MIGRACION-BD-COMPLETADA.md` con resumen

### 5.3 Git Commit
```bash
git add .
git commit -m "feat: migración BD - consolidar nomenclatura y tablas GPS

- Corregidos 8 archivos: id_chofer → chofer_id
- Consolidada tabla GPS: tracking_gps → ubicaciones_choferes
- Fix registros faltantes en estado_unidad_viaje
- Views temporales para compatibilidad durante migración
- Testing completo de todas las pantallas de transporte

Resolves: AUDITORIA-INCONSISTENCIAS-BD.md
"
```

---

## 🎯 CRITERIOS DE ÉXITO

### ✅ Funcionalidad
- [ ] GPS tracking funciona sin errores
- [ ] Todas las pantallas muestran datos de chofer/camión/acoplado
- [ ] Indicadores de estado aparecen correctamente
- [ ] No hay errores 500 en APIs relacionadas

### ✅ Código
- [ ] Convención unificada: solo `chofer_id`, `camion_id`, `acoplado_id`
- [ ] Errores TypeScript no incrementaron significativamente
- [ ] Tests existentes siguen pasando

### ✅ Base de Datos
- [ ] Una sola tabla GPS: `ubicaciones_choferes`
- [ ] Todos los viajes tienen registro en `estado_unidad_viaje`
- [ ] Integridad referencial mantenida

---

## ⚠️ RIESGOS Y MITIGACIONES

### 🔴 RIESGO ALTO: Queries rotos
**Mitigación:** Views temporales de compatibilidad

### 🟡 RIESGO MEDIO: Pérdida de datos históricos  
**Mitigación:** Backup antes de migration, scripts de rollback

### 🟢 RIESGO BAJO: Performance temporal
**Mitigación:** Views eliminadas al finalizar migración

---

## 📞 CONTACTOS Y ESCALACIÓN

**Si hay problemas críticos:**
1. Ejecutar scripts de rollback inmediatamente
2. Documentar error en `docs/PROBLEMAS-CONOCIDOS.md`
3. Reportar al usuario y pausar migración

**Archivos de emergencia:**
- `sql/migracion/*-rollback-*.sql` - Scripts de reversa
- `docs/AUDITORIA-INCONSISTENCIAS-BD.md` - Estado original

---

## 📈 PRÓXIMOS PASOS POST-MIGRACIÓN

1. **Monitoreo:** Revisar logs de errores por 24-48h
2. **Optimización:** Indices en nuevas columnas si es necesario
3. **Auditoría:** Verificar que no quedaron inconsistencias
4. **Documentación:** Tutorial para nuevos desarrolladores

---

**Estado del documento:** 🚧 En implementación  
**Responsable:** GitHub Copilot  
**Revisión:** Pendiente al completar migración  
**Próxima actualización:** Al finalizar Fase 5
