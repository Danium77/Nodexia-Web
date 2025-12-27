# PRÓXIMA SESIÓN - Pendientes y Tareas

**Última actualización**: 26 de Diciembre 2025  
**Última sesión**: Resolución de UUIDs en Control de Acceso (Ver [sesion-2025-12-26.md](.session/history/sesion-2025-12-26.md))

---

## 🔥 PRIORIDAD ALTA

### 1. 🆕 Testing de Control de Acceso con Datos Completos ⭐ URGENTE
**Estado**: BLOQUEADO - Solución implementada, pendiente validación
**Sesión anterior**: Implementada función SQL `get_viaje_con_detalles` para resolver problema de UUIDs
**Issue crítico identificado**: UUIDs corruptos (37 chars) en `viajes_despacho.id_chofer` y `id_camion`
**Tareas**:
- [ ] **Testing end-to-end** - Validar que la solución funciona
  - Escanear código: DSP-20251226-001
  - Verificar que aparezca: "Walter Zayas - DNI: 30123456"
  - Verificar que aparezca: "ABC123 - Mercedes Axor"
  - Verificar ruta: "Rosario → Santa Rosa"
- [ ] Si funciona: ✅ Feature Control de Acceso completa
- [ ] Si falla: Debug con logs de consola y `sql/debug-control-acceso.sql`

**Archivos relevantes**:
- `pages/control-acceso.tsx` - Código actualizado con RPC
- Función SQL: `get_viaje_con_detalles(p_despacho_id, p_empresa_id)` en Supabase
- Debugging: `sql/debug-control-acceso.sql`

**Próxima acción recomendada**: Migración de UUIDs para solución definitiva

### 2. 🆕 Migración de UUIDs en viajes_despacho
**Estado**: RECOMENDADO - Solucionar problema de raíz
**Dificultad**: ⭐⭐⭐ Alta (requiere backup y testing exhaustivo)
**Duración estimada**: 1-2 horas
**Tareas**:
- [ ] Crear script `sql/migrations/fix-uuids-viajes-despacho.sql`
- [ ] Backup completo de tabla `viajes_despacho`
- [ ] Limpiar UUIDs (quitar carácter extra en `id_chofer` e `id_camion`)
- [ ] Cambiar tipo de columna de TEXT a UUID nativo
- [ ] Agregar constraints de validación
- [ ] Actualizar código para usar relaciones nativas (eliminar LIKE)
- [ ] Testing completo de todos los flujos que usan viajes

### 3. Testing Supervisor de Carga
**Estado**: PENDIENTE
**Tareas**:
- [ ] Probar flujo completo Supervisor de Carga
  - Validación de carga
  - Aprobación de descarga
  - Estados permitidos

### 2. 🆕 Validar Flujo Completo de Choferes
**Estado**: CRÍTICO - Validar correcciones de hoy
**Tareas**:
- [ ] Crear chofer desde Admin Nodexia con DNI
- [ ] Buscar chofer por DNI desde Transporte > Configuración > Choferes
- [ ] Vincular chofer a flota (botón "Agregar a mi Lista")
- [ ] Verificar que aparece en tabla de choferes
- [ ] Asignar chofer a un viaje
- [ ] Login como chofer y verificar acceso

### 3. 🆕 Actualizar RoleContext con Nuevos Roles
**Estado**: NECESARIO - Migración 022 completada
**Archivos a modificar**:
- [ ] `components/context/RoleContext.tsx`
  - Importar `roleHelpers`
  - Usar `getRolDisplayName()` para mostrar rol
  - Usar `getDashboardRoute()` para redirección
  - Implementar `puedeAccederRuta()` en guards

**Ejemplo**:
```typescript
import { getRolDisplayName, getDashboardRoute, puedeAccederRuta } from '@/lib/utils/roleHelpers';

// En el context
const displayName = getRolDisplayName(userRole.rol_interno, empresa?.tipo_empresa);
const dashboardUrl = getDashboardRoute(userRole.rol_interno, empresa?.tipo_empresa);
```

---

## 🔄 PRIORIDAD MEDIA

### 4. Actualizar Tests con Nuevos Roles
**Estado**: NECESARIO
**Archivos afectados**:
- `__tests__/api/admin/nueva-invitacion.test.ts`
- Otros tests que usen roles hardcodeados

**Cambios requeridos**:
```typescript
// ANTES
rol_interno: 'coordinador_transporte'

// DESPUÉS
rol_interno: 'coordinador'
```

### 5. Migrar Funciones de Estados
**Archivos**:
- `sql/funciones_estados.sql` (líneas 131, 147, 155, 294, 302, 310)

**Cambios**:
```sql
-- ANTES
IF v_rol_usuario NOT IN ('coordinador', 'coordinador_transporte') THEN

-- DESPUÉS  
IF v_rol_usuario != 'coordinador' THEN
```

### 6. Probar Creación de Roles Personalizados
**Desde**: `/admin/roles`
**Tareas**:
- [ ] Crear rol `operador_logistica`
- [ ] Asignar permisos
- [ ] Verificar que aparece en WizardUsuario
- [ ] Asignar a usuario de prueba
- [ ] Verificar acceso

---

## 📋 PRIORIDAD BAJA

### 7. Dashboards Específicos por Rol
**Usando**: `getDashboardRoute(rol, tipo_empresa)`
**Crear**:
- [ ] `/chofer/viajes` - Dashboard de chofer
- [ ] `/supervisor/carga` - Dashboard supervisor de carga
- [ ] `/control-acceso` - Dashboard control de acceso

### 8. Documentación de Usuario Final
**Crear guías**:
- [ ] Cómo crear usuarios (Admin Nodexia)
- [ ] Cómo vincular choferes (Coordinador Transporte)
- [ ] Cómo usar Control de Acceso
- [ ] Cómo usar Supervisor de Carga

### 9. Optimización de Performance
- [ ] Agregar caché de roles en frontend
- [ ] Lazy loading de componentes por rol
- [ ] Preload de rutas según rol

---

## 🐛 BUGS CONOCIDOS

### 1. ⚠️ Página se recarga al cambiar entre apps
**Estado**: PARCIALMENTE RESUELTO
**Solución aplicada**: Desactivado `useAutoReload` en window focus
**Pendiente**: Verificar si sigue ocurriendo después de cambios de hoy

### 2. ⚠️ Errores TypeScript (104 errores)
**Estado**: NO BLOQUEANTES
**Acción**: Revisar y corregir gradualmente
**Prioridad**: Baja (no afecta funcionalidad)

---

## 📊 MIGRACIONES PENDIENTES DE EJECUTAR

### ✅ Ejecutadas en esta sesión:
- ✅ Migration 021: Agregar DNI a usuarios_empresa
- ✅ Migration 022: Sistema de roles simplificados
- ✅ Migration 022b: Limpiar roles duplicados

### Anteriores (verificar si están ejecutadas):
- Migration 017: Fix recursión RLS viajes_red_nodexia
- Migration 018: Simplificar RLS con get_user_empresas()
- Migration 019: Backfill viajes sin relaciones
- Migration 020: Restaurar filtrado relaciones_empresas

**Acción**: Verificar en Supabase cuáles están aplicadas

---

## 🎯 OBJETIVOS PRÓXIMA SESIÓN

### Sprint Goal
**Completar testing de workflows operativos y validar sistema de roles**

### Tareas principales:
1. **Testing completo** (Control Acceso + Supervisor + Choferes)
2. **Actualizar RoleContext** con helpers
3. **Migrar funciones de estados** a nuevos roles
4. **Crear dashboards específicos** por rol

### Criterios de éxito:
- ✅ Todos los workflows funcionan end-to-end
- ✅ RoleContext usa roleHelpers
- ✅ Funciones de estados actualizadas
- ✅ Al menos 2 dashboards específicos creados

---

## 💡 IDEAS Y MEJORAS FUTURAS

### Sistema de Roles
- [ ] Roles temporales con fecha de expiración
- [ ] Delegación de permisos entre usuarios
- [ ] Roles jerárquicos (supervisor > operador)
- [ ] Permisos por funcionalidad específica

### UX/UI
- [ ] Wizard de onboarding por rol
- [ ] Tour guiado para nuevos usuarios
- [ ] Shortcuts de teclado
- [ ] Modo offline para choferes

### Integraciones
- [ ] Webhooks para eventos de roles
- [ ] API REST para gestión de roles
- [ ] Exportar/importar configuración de roles
- [ ] Sincronización con sistema externo de RRHH

---

## 📝 NOTAS IMPORTANTES

### Sobre Roles
- Los roles ahora son **contextuales** según `tipo_empresa`
- Usar siempre `getRolDisplayName()` para mostrar en UI
- No hardcodear nombres de roles en código
- Consultar `roleHelpers.ts` para lógica de roles

### Sobre Migraciones
- Todas las migraciones son **no destructivas**
- Datos antiguos se **desactivan**, no se eliminan
- Siempre verificar con queries de validación
- Mantener documentación actualizada

### Sobre Testing
- Tests deben actualizarse con nuevos roles
- Agregar tests para `roleHelpers.ts`
- Validar interpretación contextual
- Probar permisos por rol

---

## 🔍 QUERIES ÚTILES

### Verificar roles activos:
```sql
SELECT nombre_rol, tipo_empresa, activo, es_sistema, descripcion
FROM roles_empresa
WHERE activo = true
ORDER BY es_sistema DESC, nombre_rol;
```

### Verificar usuarios por rol:
```sql
SELECT 
  ue.nombre_completo,
  ue.rol_interno,
  e.tipo_empresa,
  e.nombre as empresa,
  get_rol_display_name(ue.rol_interno, e.tipo_empresa) as display_name
FROM usuarios_empresa ue
JOIN empresas e ON e.id = ue.empresa_id
WHERE ue.activo = true
ORDER BY e.tipo_empresa, ue.rol_interno;
```

### Auditoría de cambios de roles:
```sql
SELECT * FROM auditoria_roles 
ORDER BY created_at DESC 
LIMIT 20;
```

---

**Preparado por**: GitHub Copilot  
**Fecha**: 20 de Diciembre 2025  
**Próxima revisión**: Inicio de próxima sesión
