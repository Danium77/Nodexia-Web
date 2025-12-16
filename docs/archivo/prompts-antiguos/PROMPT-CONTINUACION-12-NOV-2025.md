# PROMPT DE CONTINUACIÓN - Sesión 12 Nov 2025

## 📍 CONTEXTO ACTUAL

Estamos en medio de la implementación del **sistema de notificaciones** para el proyecto Nodexia (plataforma de gestión logística).

### Estado al finalizar sesión anterior (11 Nov):
- ✅ **RESUELTO:** Despachos asignados aparecían en tab incorrecto (problema de query con `transporte_id` vs `id_transporte`)
- ✅ **RESUELTO:** Error al asignar chofer/camión (tabla `notificaciones` con estructura incorrecta y trigger problemático)
- ⚠️ **PENDIENTE:** Error al cancelar viaje (`company_id` no existe en tabla `despachos`)

## 🎯 ACCIÓN INMEDIATA REQUERIDA

### Paso 1: Ejecutar script SQL en Supabase
**Archivo:** `sql/migrations/FIX_FINAL_notificaciones_correct_structure.sql`

**Qué hace:**
- Elimina funciones SQL antiguas que buscan `company_id` (campo que no existe)
- Recrea funciones usando `created_by` para encontrar empresa vía `usuarios_empresa`
- Implementa notificaciones para cancelación y asignación de viajes

**Cómo ejecutar:**
1. Abrir Supabase SQL Editor
2. Copiar contenido completo del archivo
3. Ejecutar
4. Verificar mensaje: `✅ Funciones con estructura correcta creadas`

### Paso 2: Testing de cancelación
**Usuario:** Gonzalo (coordinador transporte)
```
Email: gonzalo@logisticaexpres.com
Password: Tempicxmej9o!1862
```

**Pasos:**
1. Refresh del navegador (F5)
2. Login como Gonzalo
3. Ir a "Despachos Ofrecidos" → Tab "Recursos Asignados"
4. Seleccionar viaje DSP-20251111-001 (o el último creado)
5. Click "Cancelar" y proporcionar motivo
6. Verificar que NO aparece error de `company_id`
7. Verificar que cancelación se completa exitosamente

### Paso 3: Verificar notificación
**Usuario:** Leandro (coordinador planta)
```
Email: leandro@tecnoembalajes.com
Password: Tempbhexjd!1862
```

**Pasos:**
1. Cerrar sesión de Gonzalo
2. Login como Leandro
3. Verificar icono de notificaciones en header (debería mostrar badge con número)
4. Click en notificaciones
5. Verificar que aparece: "⚠️ Viaje Cancelado por Transporte"

## 📋 PROBLEMAS CONOCIDOS Y SOLUCIONES

### Si aparece error de cache:
```powershell
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules\.cache
pnpm run dev
```

### Si servidor corre en puerto incorrecto:
```powershell
# Detener todos los procesos Node
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force

# Reiniciar servidor
pnpm run dev
```

### Si persiste error de `company_id`:
Significa que el script SQL NO se ejecutó correctamente. Verificar:
1. Que se ejecutó el script completo (no solo parte)
2. Que no hubo errores en la consola de Supabase
3. Ejecutar query de debug:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%notificacion%';
```

## 🔄 TAREAS PENDIENTES (Backlog)

### Testing pendiente:
1. ⏳ Contador "X ya asignados" con nueva lógica
2. ⏳ Múltiples transportes muestra "🚛 Múltiples"
3. ⏳ Observaciones sin texto redundante
4. ⏳ Notificaciones real-time (subscription)

### Mejoras futuras (no urgentes):
1. Pantalla Planificación (mejoras UI/UX)
2. Dashboard Transporte (mejoras UI/UX)
3. Limpieza de archivos SQL obsoletos
4. Documentación técnica de estructura BD

## 📁 ARCHIVOS CLAVE

### Scripts SQL a ejecutar:
- ✅ `sql/migrations/011_FIX_DEFINITIVO_cascade.sql` (YA EJECUTADO)
- ✅ `sql/migrations/FIX_delete_bad_trigger.sql` (YA EJECUTADO)
- ⏳ `sql/migrations/FIX_FINAL_notificaciones_correct_structure.sql` (PENDIENTE)

### Archivos recientemente modificados:
- `pages/crear-despacho.tsx` (corrección query)
- `pages/api/supervisor-carga/*.ts` (actualización estructura notificaciones)
- `pages/api/control-acceso/*.ts` (actualización estructura notificaciones)
- `components/Transporte/ViajeDetalleModal.tsx` (actualización notificaciones)

## 🎯 OBJETIVO DE ESTA SESIÓN

**Completar el sistema de notificaciones end-to-end:**

1. ✅ Tabla `notificaciones` con estructura correcta
2. ✅ Asignación de chofer/camión sin errores
3. ⏳ **Cancelación de viajes con notificaciones** ← FOCO ACTUAL
4. ⏳ Verificar que coordinador planta recibe notificación
5. ⏳ Testing de notificaciones real-time

## 💡 RECORDATORIOS IMPORTANTES

- **Siempre probar en modo incógnito primero** para evitar problemas de cache
- **Verificar que servidor corre en puerto 3000** (no 3001)
- **Leer documento completo:** `SESION-11-NOV-2025-COMPLETA.md` para contexto detallado
- **Tabla `despachos` NO tiene `company_id`**, usar `created_by` + `usuarios_empresa`
- **Tabla `notificaciones` usa `user_id`** (NO `usuario_id`)
- **Tabla `viajes_despacho` usa `id_transporte`** (NO `transporte_id`)

---

**Último estado:** Sistema funcionando para asignación de recursos, pendiente testing de cancelación con notificaciones.

**Fecha:** 12 de Noviembre 2025
