# PRÓXIMA SESIÓN - Pendientes y Tareas

**Última actualización**: 20 de Diciembre 2025

---

## 🔥 PRIORIDAD ALTA

### 1. ✅ Testing Control de Acceso y Supervisor de Carga
**Estado**: PENDIENTE (original de inicio de sesión)
**Motivo**: Se priorizó corrección de bugs críticos (DNI, roles)
**Tareas**:
- [ ] Probar flujo completo Control de Acceso
  - Registro de ingreso de camión
  - Cambio de estados
  - Permisos correctos
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
