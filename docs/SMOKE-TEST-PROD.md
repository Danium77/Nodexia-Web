# ✅ CHECKLIST SMOKE TEST - PRODUCCIÓN

**Fecha:** 24 de Enero 2026  
**Release:** v2.0.0 - Red Dinámica con Identidades Encastrables  
**Ambiente:** PRODUCCIÓN (Vercel + Supabase)  
**Ejecutar:** Inmediatamente después del deploy

---

## 🔥 SMOKE TESTS CRÍTICOS (5 minutos)

### 1️⃣ Test de Soft Delete - Camión
**Objetivo:** Verificar que eliminación lógica funciona sin romper integridad

**Pasos:**
1. Login como Transportista en PROD
2. Ir a `/transporte/configuracion` → Tab "Camión"
3. Seleccionar un camión existente → Click "Eliminar"
4. ✅ **ESPERADO:** 
   - Confirmación con `window.confirm()`
   - Camión desaparece de la lista
   - NO genera error 500
5. 🔍 **VALIDACIÓN SQL:** Ejecutar en Supabase PROD:
   ```sql
   SELECT patente, deleted_at FROM camiones 
   WHERE deleted_at IS NOT NULL 
   ORDER BY deleted_at DESC LIMIT 1;
   ```
   - ✅ **ESPERADO:** Ver el camión eliminado con `deleted_at` reciente

**Criterio de éxito:** ✅ Camión marcado como eliminado, no borrado físicamente

---

### 2️⃣ Test de Identidad Encastrable - Patente Duplicada
**Objetivo:** Verificar que misma patente puede existir en múltiples empresas

**Pasos:**
1. Login como Transportista A en PROD
2. Crear camión con patente **"TEST001"**
3. Logout → Login como Transportista B
4. Intentar crear camión con misma patente **"TEST001"**
5. ✅ **ESPERADO:**
   - Popup de confirmación: *"La patente TEST001 ya existe... ¿Desea vincular este camión a su empresa?"*
   - Click "Aceptar" → Camión se crea exitosamente
6. 🔍 **VALIDACIÓN SQL:** Ejecutar en Supabase PROD:
   ```sql
   SELECT patente, id_transporte, marca 
   FROM camiones 
   WHERE patente = 'TEST001' AND deleted_at IS NULL;
   ```
   - ✅ **ESPERADO:** 2 registros con misma patente pero diferente `id_transporte`

**Criterio de éxito:** ✅ Índice compuesto permite duplicados entre empresas

---

### 3️⃣ Test de RLS - Cross-Tenant Access
**Objetivo:** Verificar que Coordinador ve recursos de Transportistas asignados

**Pasos:**
1. Login como Coordinador (Planta) en PROD
2. Ir a `/planificacion` → Crear o ver despacho existente
3. Asignar un viaje a Transportista con chofer/camión
4. ✅ **ESPERADO:**
   - Dropdown de choferes muestra solo choferes del transportista asignado
   - Dropdown de camiones muestra solo camiones del transportista asignado
   - NO muestra choferes/camiones de otros transportistas sin asignar
5. 🔍 **VALIDACIÓN UI:**
   - Inspeccionar Network tab → Query a `choferes` debe incluir `.is('deleted_at', null)`
   - NO debe haber fetch a `/api/transporte/despachos-info` (endpoint eliminado)

**Criterio de éxito:** ✅ RLS filtra correctamente + Soft delete activo

---

### 4️⃣ Test de Funciones Helper - Soft Delete de Despacho
**Objetivo:** Verificar que función `soft_delete_despacho()` previene eliminación con viajes activos

**Pasos:**
1. Login como Coordinador en PROD
2. Ir a `/coordinator-dashboard`
3. Intentar eliminar un despacho que TIENE viajes activos
4. ✅ **ESPERADO:**
   - Error: *"No se puede eliminar despacho con X viajes activos"*
   - Despacho NO se elimina
5. Intentar eliminar un despacho que NO tiene viajes activos
6. ✅ **ESPERADO:**
   - Despacho se elimina correctamente (soft delete)
   - Aparece como "Cancelado" en la UI

**Criterio de éxito:** ✅ Validación de negocio previene eliminación inconsistente

---

### 5️⃣ Test de Tabla Recurso Asignaciones - Verificación de Existencia
**Objetivo:** Confirmar que nueva tabla existe y es accesible con RLS

**Pasos:**
1. Abrir Supabase PROD → SQL Editor
2. Ejecutar query como usuario autenticado:
   ```sql
   -- Simular query desde frontend (con RLS activo)
   SELECT * FROM recurso_asignaciones LIMIT 1;
   ```
3. ✅ **ESPERADO:**
   - Query ejecuta sin error (tabla existe)
   - Si hay datos: Retorna solo asignaciones de la empresa del usuario
   - Si no hay datos: Retorna array vacío (no error)
4. Verificar estructura:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'recurso_asignaciones' 
   ORDER BY ordinal_position;
   ```
5. ✅ **ESPERADO:** 8 columnas:
   - `id`, `recurso_id`, `tipo_recurso`, `empresa_id`, `fecha_inicio`, `fecha_fin`, `notas`, `created_at`, `updated_at`

**Criterio de éxito:** ✅ Tabla accesible con RLS funcional

---

## 🚨 CRITERIOS DE ROLLBACK

**SI alguno de estos falla, ejecutar rollback inmediato:**

1. ❌ Error 500 al eliminar camión/chofer/acoplado
2. ❌ Error al crear recurso con patente/DNI duplicado entre empresas
3. ❌ Coordinador NO ve choferes de transportistas asignados
4. ❌ Coordinador VE choferes de transportistas NO asignados (leak de datos)
5. ❌ Query a `recurso_asignaciones` genera error de tabla inexistente

**Comando de rollback:**
```bash
# Revertir a versión anterior de Vercel
vercel rollback <deployment-url>

# O revertir en GitHub
git revert <commit-hash>
git push origin main
```

---

## 📊 MÉTRICAS ESPERADAS POST-DEPLOY

**Monitorear en primeras 24 horas:**

| Métrica | Baseline (pre-deploy) | Target (post-deploy) |
|---------|----------------------|---------------------|
| Queries/sec a Supabase | ~50-100 | ~50-100 (sin cambio significativo) |
| Latencia promedio queries | ~100-200ms | ~100-250ms (soft delete añade filtro) |
| Errores 500 | 0-2/día | 0-2/día (sin incremento) |
| Tiempo de carga `/planificacion` | ~1-2s | ~1-2.5s (aceptable) |
| Uso de índices | N/A | 12 índices nuevos activos |

**Alertas críticas:**
- ⚠️ Queries sin índice (EXPLAIN ANALYZE > 500ms)
- ⚠️ RLS bypass detectado (logs Supabase)
- ⚠️ Errores de FK constraint en soft delete

---

## ✅ CHECKLIST DE APROBACIÓN FINAL

Marcar después de cada test:

- [ ] 1️⃣ Soft delete de camión funciona correctamente
- [ ] 2️⃣ Identidades encastrables permiten duplicados cross-empresa
- [ ] 3️⃣ RLS filtra correctamente en cross-tenant access
- [ ] 4️⃣ Función soft_delete_despacho valida viajes activos
- [ ] 5️⃣ Tabla recurso_asignaciones existe y es accesible

**Si 5/5 pasan:** ✅ **DEPLOY EXITOSO** - Monitorear próximas 24h  
**Si 4/5 pasan:** ⚠️ **DEPLOY PARCIAL** - Investigar fallo y decidir rollback  
**Si ≤3/5 pasan:** ❌ **ROLLBACK INMEDIATO** - Deploy falló

---

**Ejecutado por:** _________________  
**Fecha/Hora:** _________________  
**Resultado:** ⬜ EXITOSO | ⬜ PARCIAL | ⬜ ROLLBACK
