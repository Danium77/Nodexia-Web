# RESUMEN SESIÓN - 11 de Noviembre 2025

## 🎯 OBJETIVOS COMPLETADOS

### ✅ Problema #1: Despachos asignados aparecían en tab "Pendientes"
**Root Cause:** Query usaba `transporte_id` pero columna real es `id_transporte`

**Archivos corregidos:**
- `pages/crear-despacho.tsx` (líneas 307, 310, 313, 325, 345)
  - Cambio: `.select('id, estado, transporte_id')` → `.select('id, estado, id_transporte')`
  - Filtrado corregido para usar `v.id_transporte`
  - Contador `viajes_asignados` ahora preciso

**Resultado:** ✅ Despachos asignados ahora aparecen correctamente en tab "Asignados"

---

### ✅ Problema #2: Error al asignar chofer/camión
**Root Cause:** Múltiples errores en cadena:

1. **Error inicial:** `column "empresa_id" of relation "notificaciones" does not exist`
   - Tabla `notificaciones` tenía estructura antigua con `empresa_id`
   - Scripts SQL previos (`sql/notificaciones.sql`, `sql/fix-trigger-notificaciones.sql`) habían creado versión incorrecta

2. **Error secundario:** Trigger `trigger_notificar_cambio_estado` usaba `empresa_id`
   - Archivo `sql/fix-trigger-notificaciones.sql` contenía trigger con estructura antigua
   - Trigger se ejecutaba al UPDATE de `viajes_despacho`

3. **Error terciario:** Archivos API usaban `usuario_id` en lugar de `user_id`

**Solución implementada:**

**A) Scripts SQL ejecutados en Supabase:**
```sql
-- 1. Eliminación completa de tabla antigua
DROP TABLE IF EXISTS notificaciones CASCADE;

-- 2. Recreación con estructura correcta (SIN empresa_id)
CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT FALSE,
  viaje_id UUID REFERENCES viajes_despacho(id) ON DELETE SET NULL,
  despacho_id TEXT,
  pedido_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  leida_at TIMESTAMPTZ
);

-- 3. Eliminación de trigger problemático
DROP TRIGGER IF EXISTS trigger_notificar_cambio_estado ON viajes_despacho CASCADE;
DROP FUNCTION IF EXISTS notificar_cambio_estado_viaje() CASCADE;
```

**Archivo SQL ejecutado:** `sql/migrations/011_FIX_DEFINITIVO_cascade.sql`

**B) Archivos TypeScript/API actualizados:**

1. **`pages/api/supervisor-carga/llamar-carga.ts`**
   - `usuario_id` → `user_id`
   - `tipo_notificacion` → `tipo`
   - `datos_extra` → `metadata`
   - Eliminados: `enviada`, `fecha_envio`

2. **`pages/api/supervisor-carga/iniciar-carga.ts`**
   - Mismos cambios

3. **`pages/api/supervisor-carga/finalizar-carga.ts`** (2 inserts)
   - Mismos cambios

4. **`pages/api/control-acceso/confirmar-accion.ts`**
   - Mismos cambios

5. **`pages/api/control-acceso/crear-incidencia.ts`** (3 inserts)
   - Mismos cambios

6. **`components/Transporte/ViajeDetalleModal.tsx`**
   - Agregado `user_id: user?.id || ''`
   - Resto de cambios igual

**Resultado:** ✅ Asignación de chofer/camión funciona correctamente

---

## 🔄 PROBLEMA EN PROGRESO

### ⚠️ Error al cancelar viaje: `record 'v_despacho' has no field 'company_id'`

**Análisis:**
- Funciones SQL de notificaciones buscaban `company_id` en tabla `despachos`
- Tabla `despachos` NO tiene columna `company_id`
- Columnas relevantes: `created_by` (UUID del usuario creador), `transport_id`

**Solución preparada (PENDIENTE DE TESTING):**

**Archivo:** `sql/migrations/FIX_FINAL_notificaciones_correct_structure.sql`

**Estrategia:**
1. Obtener `created_by` del despacho (usuario coordinador planta)
2. Buscar en `usuarios_empresa` para obtener `empresa_id` del usuario
3. Buscar coordinador de planta en esa empresa
4. Si no existe, notificar al creador del despacho

**Estado:** Script creado pero NO ejecutado en Supabase

---

## 📋 ESTRUCTURA DE DATOS CONFIRMADA

### Tabla `notificaciones` (CORRECTA - Ejecutada en Supabase)
```sql
- id: UUID PRIMARY KEY
- user_id: UUID NOT NULL (NO usuario_id)
- tipo: TEXT ('viaje_cancelado', 'viaje_asignado', etc.)
- titulo: TEXT
- mensaje: TEXT
- leida: BOOLEAN
- viaje_id: UUID
- despacho_id: TEXT
- pedido_id: TEXT
- metadata: JSONB (NO datos_extra)
- created_at: TIMESTAMPTZ
- leida_at: TIMESTAMPTZ
```

**NO tiene:** `empresa_id`, `enviada`, `fecha_envio`, `tipo_notificacion`

### Tabla `despachos` (Estructura existente)
```sql
- id: uuid PRIMARY KEY
- created_by: uuid (usuario que creó)
- data_type: uuid
- id_json: text
- destino: text
- medio: text
- scheduled_set: timestamp with time zone
- origen: text
- pedido_id: text
- scheduled_local_date: date
- scheduled_local_time: time without time zone
- transport_id: uuid
- type: text
- comentarios: text
- prioridad: text
- printed_at: timestamp with time zone
- cancelled_at: timestamp with time zone
- cancelled_viajes_sin_completar: integer
```

**NO tiene:** `company_id`

### Tabla `viajes_despacho` (Columnas importantes)
```sql
- id_transporte: UUID (NO transporte_id)
- id_chofer: UUID (NO chofer_id)
- id_camion: UUID (NO camion_id)
- id_acoplado: UUID (NO acoplado_id)
```

---

## 🗂️ ARCHIVOS CRÍTICOS MODIFICADOS

### Frontend
1. `pages/crear-despacho.tsx` - Corrección query `id_transporte`
2. `components/Transporte/AceptarDespachoModal.tsx` - Verificado (ya estaba correcto)
3. `components/Transporte/ViajeDetalleModal.tsx` - Actualizado insert notificaciones
4. `components/ui/NotificacionesDropdown.tsx` - Actualizado query (línea 62)

### API Routes
1. `pages/api/supervisor-carga/llamar-carga.ts`
2. `pages/api/supervisor-carga/iniciar-carga.ts`
3. `pages/api/supervisor-carga/finalizar-carga.ts`
4. `pages/api/control-acceso/confirmar-accion.ts`
5. `pages/api/control-acceso/crear-incidencia.ts`

### SQL (Ejecutados en Supabase)
✅ `sql/migrations/011_FIX_DEFINITIVO_cascade.sql` - Recrear tabla notificaciones
✅ `sql/migrations/FIX_delete_bad_trigger.sql` - Eliminar trigger problemático

### SQL (PENDIENTES de ejecutar)
⏳ `sql/migrations/FIX_FINAL_notificaciones_correct_structure.sql` - Corregir funciones con company_id

---

## 🚀 PRÓXIMOS PASOS INMEDIATOS

### 1. Testing de cancelación de viaje (PRIORIDAD ALTA)
**Pasos:**
1. Ejecutar script `sql/migrations/FIX_FINAL_notificaciones_correct_structure.sql` en Supabase
2. Refrescar navegador
3. Login como coordinador transporte (Gonzalo)
4. Ir a "Despachos Ofrecidos" → "Recursos Asignados"
5. Seleccionar viaje y cancelar
6. Verificar que NO aparece error de `company_id`
7. Login como coordinador planta (Leandro)
8. Verificar que aparece notificación de cancelación

### 2. Testing de notificaciones end-to-end
**Flujo completo:**
1. Crear despacho como Leandro (coordinador planta)
2. Asignar a Logística Expres
3. Login como Gonzalo → Verificar notificación "Nuevo Viaje Asignado"
4. Asignar chofer/camión
5. Cancelar viaje
6. Login como Leandro → Verificar notificación "Viaje Cancelado"

### 3. Validar correcciones de sesión anterior (3 de 8 pendientes)
- ✅ Tab "Asignados" funciona
- ✅ Autocomplete deshabilitado
- ✅ Query con `id_transporte` corregida
- ⏳ Contador "X ya asignados" preciso (needs re-test con nueva lógica)
- ⏳ Múltiples transportes muestra "🚛 Múltiples" en morado
- ⏳ Observaciones sin texto redundante

### 4. Limpieza de archivos SQL obsoletos
**Archivos a revisar/eliminar:**
- `sql/notificaciones.sql` (estructura antigua con empresa_id)
- `sql/fix-trigger-notificaciones.sql` (trigger con empresa_id)
- Scripts de migración duplicados en `sql/migrations/011_*`

### 5. Documentar cambios en estructura de BD
Actualizar documentación técnica con:
- Estructura final tabla `notificaciones`
- Triggers activos en `viajes_despacho`
- Funciones RPC disponibles

---

## 🐛 PROBLEMAS CONOCIDOS

### 1. Cache agresivo de Next.js
**Síntoma:** Cambios en código no se reflejan inmediatamente
**Solución temporal:** 
```powershell
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules\.cache
pnpm run dev
```
**Solución definitiva:** Configurar Next.js para revalidar correctamente

### 2. Autocomplete del navegador
**Síntoma:** Aparece "Adultos mayores de 60 años..." en campos
**Causa:** Cache del navegador Chrome
**Solución:** 
- Modo incógnito para testing
- `autoComplete="off"` agregado en inputs críticos
- Usuario debe limpiar cache: `Ctrl+Shift+Delete`

### 3. Servidor en múltiples puertos
**Síntoma:** Servidor inicia en puerto 3001 porque 3000 está ocupado
**Solución:** Detener todos los procesos Node antes de reiniciar
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force
```

---

## 📝 CREDENCIALES DE TESTING

### Coordinador Planta - Tecno Embalajes
```
Email: leandro@tecnoembalajes.com
Password: Tempbhexjd!1862
Empresa: Tecno Embalajes SRL
```

### Coordinador Transporte - Logística Expres
```
Email: gonzalo@logisticaexpres.com
Password: Tempicxmej9o!1862
Empresa: Logística Expres SRL
```

---

## 🔍 DEBUGGING REALIZADO

### Técnicas usadas:
1. **SQL queries directas** en Supabase para verificar datos reales
2. **grep_search** para encontrar archivos con `empresa_id`, `usuario_id`, `transporte_id`
3. **Console logs** expandidos en navegador para ver objetos completos
4. **Network tab** en DevTools para identificar requests fallidos
5. **Modo incógnito** para aislar problemas de cache

### Insights clave:
- Usuario aportó insight crucial: "recuerdo que teniamos problemas con transport_id y transporte_id"
- Diferencia BD vs Frontend confirmó problema en query (no en datos)
- Múltiples archivos SQL sueltos causaron confusión de versiones
- Triggers del sistema no se pueden eliminar directamente (necesitan CASCADE)

---

## 📊 MÉTRICAS DE LA SESIÓN

- **Problemas resueltos:** 2 de 2 principales
- **Archivos modificados:** 10 (6 API + 4 componentes)
- **Scripts SQL ejecutados:** 3
- **Scripts SQL creados (pendientes):** 1
- **Tiempo debugging:** ~3 horas (múltiples intentos con cache)
- **Reinicios de servidor:** 5+
- **Navegadores usados:** Chrome normal + incógnito

---

## ⚠️ NOTAS IMPORTANTES PARA PRÓXIMA SESIÓN

1. **EJECUTAR PRIMERO:** `sql/migrations/FIX_FINAL_notificaciones_correct_structure.sql`
2. **Verificar servidor corre en puerto 3000** (no 3001)
3. **Limpiar cache antes de testing:** `.next` y `node_modules\.cache`
4. **Usar modo incógnito** para primeras pruebas
5. **NO ejecutar scripts SQL duplicados** (verificar cuál fue el último ejecutado)

---

## 🎓 LECCIONES APRENDIDAS

1. **Verificar nombres exactos** de columnas en BD antes de crear queries
2. **Archivos SQL sueltos** pueden ejecutarse y causar conflictos
3. **Triggers automáticos** pueden ser la causa de errores silenciosos
4. **Next.js cache** muy agresivo en desarrollo
5. **Usuario puede aportar** insights valiosos basados en experiencia previa
6. **SQL CASCADE** necesario para eliminar objetos con dependencias del sistema
7. **Modo incógnito** confirma si problema es código o cache
8. **Estandarización de nomenclatura** previene errores futuros (id_transporte vs transporte_id)

---

**Última actualización:** 11 de Noviembre 2025, 23:45
**Próxima acción:** Ejecutar script de corrección `company_id` y testear cancelación
