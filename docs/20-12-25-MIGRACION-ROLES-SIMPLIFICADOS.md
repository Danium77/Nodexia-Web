# Migration 022: Sistema de Roles Simplificado
**Fecha**: 20 de Diciembre 2025  
**Estado**: ✅ Archivos creados, pendiente ejecutar migración SQL

---

## 🎯 OBJETIVOS

1. **Simplificar roles** de específicos a genéricos con interpretación contextual
2. **Permitir creación dinámica** de roles desde Admin Nodexia
3. **Mantener compatibilidad** con usuarios existentes mediante migración automática
4. **Mejorar UX** mostrando nombres de roles según contexto

---

## 📋 NUEVOS ROLES BASE

| Rol Interno | Display según tipo_empresa | Empresas | Permiso Clave |
|-------------|----------------------------|----------|---------------|
| `admin_nodexia` | Administrador Nodexia | Todas (sistema) | Acceso total |
| `coordinador` | Coordinador de Planta / Transporte / Comercial | Todas | Planificar, crear, editar |
| `control_acceso` | Control de Acceso | Solo planta | Registrar acceso |
| `chofer` | Chofer | Solo transporte | Actualizar viajes |
| `supervisor` | Supervisor de Carga / Flota | Todas | Supervisar, validar |
| `administrativo` | Administrativo Planta / Transporte | Todas | Reportes, admin |

---

## 🔄 MAPEO DE MIGRACIÓN

### Usuarios existentes se migran automáticamente:

```sql
coordinador_transporte → coordinador
coordinador_planta     → coordinador
supervisor_carga       → supervisor
control_acceso        → control_acceso (sin cambio)
chofer                → chofer (sin cambio)
super_admin           → admin_nodexia
```

### Normalización de capitalización:
```sql
'Chofer'            → 'chofer'
'Control de Acceso' → 'control_acceso'
'Supervisor'        → 'supervisor'
```

---

## 📁 ARCHIVOS MODIFICADOS

### ✅ Creados:
1. `sql/migrations/022_simplificar_roles_sistema.sql` - Migración completa
2. `lib/utils/roleHelpers.ts` - Funciones helper para interpretación de roles
3. `types/missing-types.ts` - Actualizado con nuevos tipos

### ✅ Modificados:
1. `components/Admin/WizardUsuario.tsx` - Muestra roles con nombre contextual
2. `pages/admin/roles.tsx` - Ya existía, compatible con cambios

---

## 🚀 ORDEN DE EJECUCIÓN

### PASO 1: Ejecutar Migration SQL
```bash
# En Supabase SQL Editor, ejecutar:
sql/migrations/022_simplificar_roles_sistema.sql
```

**Qué hace:**
- ✅ Agrega columnas `es_sistema`, `icono`, `color` a `roles_empresa`
- ✅ Desactiva roles antiguos (no los elimina)
- ✅ Inserta 6 roles base del sistema
- ✅ Migra usuarios existentes a nuevos roles
- ✅ Normaliza capitalización
- ✅ Crea función `get_rol_display_name()`
- ✅ Crea tabla `auditoria_roles`
- ✅ Configura RLS policies

**Resultado esperado:**
```
✅ MIGRACIÓN 022 COMPLETADA
   - Roles base del sistema: 6
   - Usuarios migrados: [número de usuarios]
```

### PASO 2: Verificar en Navegador
1. Ir a Admin Nodexia > Gestión de Usuarios
2. Crear nuevo usuario
3. Verificar que se muestran los roles con nombre contextual
   - Ejemplo: Al seleccionar empresa tipo "transporte", el rol "coordinador" se muestra como "Coordinador de Transporte"

### PASO 3: Probar Creación de Rol Personalizado
1. Ir a `/admin/roles` (página ya existe)
2. Crear rol personalizado:
   - Nombre: `operador_logistica`
   - Descripción: Operador de logística y despacho
   - Tipo empresa: Ambos
   - Permisos: crear, editar
3. Verificar que aparece en selector de WizardUsuario

---

## 🔒 GARANTÍAS DE SEGURIDAD

### ✅ Datos NO se pierden:
- Roles antiguos se **desactivan**, no se eliminan
- Usuarios migran automáticamente
- Relaciones se mantienen intactas

### ✅ Rollback posible:
```sql
-- Si algo falla, revertir con:
UPDATE roles_empresa SET activo = true 
WHERE nombre_rol IN ('coordinador_transporte', 'coordinador_planta', 'supervisor_carga');

UPDATE usuarios_empresa 
SET rol_interno = 'coordinador_transporte'
WHERE rol_interno = 'coordinador' AND empresa_id IN (
  SELECT id FROM empresas WHERE tipo_empresa = 'transporte'
);
```

### ✅ Auditoría automática:
- Todos los cambios en roles se registran en `auditoria_roles`
- Trigger automático captura INSERT/UPDATE/DELETE

---

## 📊 FUNCIONES NUEVAS

### `get_rol_display_name(rol_interno, tipo_empresa)`
```sql
SELECT get_rol_display_name('coordinador', 'planta');
-- Retorna: 'Coordinador de Planta'

SELECT get_rol_display_name('coordinador', 'transporte');
-- Retorna: 'Coordinador de Transporte'
```

### Helper TypeScript `getRolDisplayName()`
```typescript
import { getRolDisplayName } from '@/lib/utils/roleHelpers';

getRolDisplayName('coordinador', 'planta');
// → 'Coordinador de Planta'

getRolDisplayName('supervisor', 'transporte');
// → 'Supervisor de Flota'
```

---

## 🎨 MEJORAS EN UI

### Antes:
```
Selector de roles:
☐ coordinador_transporte - Coordinador de transporte
☐ coordinador_planta - Coordinador de planta
☐ supervisor_carga - Supervisor de carga
```

### Después:
```
Selector de roles (según tipo empresa seleccionada):

Empresa tipo TRANSPORTE:
☐ Coordinador de Transporte - Gestión completa de operaciones
☐ Chofer - Actualización de estado de viajes
☐ Supervisor de Flota - Control y supervisión de operaciones

Empresa tipo PLANTA:
☐ Coordinador de Planta - Gestión completa de operaciones
☐ Control de Acceso - Registro de ingresos/salidas
☐ Supervisor de Carga - Control y supervisión de operaciones
```

---

## 🧪 VALIDACIONES AUTOMÁTICAS

### La migración valida:
1. ✅ Que existe tabla `roles_empresa`
2. ✅ Que se insertaron 6 roles base
3. ✅ Que se migraron todos los usuarios
4. ✅ Que las políticas RLS están activas

### Si falla alguna validación:
- 🔴 La transacción hace ROLLBACK automático
- 🔴 No se aplican cambios parciales
- 🔴 Se muestra error específico

---

## 📝 PRÓXIMOS PASOS (OPCIONAL)

### 1. Agregar más roles personalizados
- Ir a `/admin/roles`
- Crear roles según necesidades específicas
- Ejemplos: `operador_descarga`, `jefe_planta`, `analista_logistica`

### 2. Configurar permisos granulares
- Extender objeto `permisos` en roles
- Agregar permisos específicos: `ver_reportes`, `exportar_datos`, etc.

### 3. Crear dashboards específicos por rol
- Cada rol tiene su ruta: `getDashboardRoute()`
- Personalizar contenido según permisos

---

## ✅ CHECKLIST DE EJECUCIÓN

- [ ] Ejecutar `022_simplificar_roles_sistema.sql` en Supabase
- [ ] Verificar mensaje: ✅ MIGRACIÓN 022 COMPLETADA
- [ ] Probar creación de usuario en Admin Nodexia
- [ ] Verificar que roles se muestran con nombre contextual
- [ ] Probar con usuario existente (login debe funcionar)
- [ ] Crear un rol personalizado en `/admin/roles`
- [ ] Verificar que nuevo rol aparece en selector
- [ ] Documentar en PROXIMA-SESION.md

---

**Autor**: GitHub Copilot  
**Revisado**: Pendiente  
**Ejecutado**: Pendiente
