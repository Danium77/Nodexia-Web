# 🏢 Sistema Multi-Usuario por Empresa - Nodexia

## 📋 **Nueva Funcionalidad Implementada**

Hemos expandido el sistema de red de empresas para soportar **múltiples usuarios por empresa con roles específicos**, tal como solicitaste.

## 🎯 **Estructura de Roles por Tipo de Empresa**

### **🏪 Empresa Coordinadora:**
- **admin** - Administrador completo de la empresa
- **coordinador** - Coordinador de operaciones
- **control_acceso** - Control de acceso y seguridad  
- **supervisor_carga** - Supervisor de carga y operaciones

### **🚛 Empresa de Transporte:**
- **admin** - Administrador completo de la empresa
- **coordinador** - Coordinador de flota
- **chofer** - Chofer/Conductor
- **administrativo** - Personal administrativo

### **🔧 Roles Generales (Ambos tipos):**
- **operador** - Operador general
- **consulta** - Solo consulta

## 🔐 **Sistema de Permisos Granular**

Cada rol tiene permisos específicos definidos en la base de datos:

### **Ejemplos de Permisos:**

#### **Admin (Coordinador):**
```json
{
  "ver_dashboard": true,
  "gestionar_usuarios": true,
  "gestionar_transportistas": true,
  "crear_despachos": true,
  "ver_reportes": true,
  "configurar_empresa": true,
  "gestionar_relaciones": true
}
```

#### **Chofer (Transporte):**
```json
{
  "ver_dashboard": true,
  "ver_mis_despachos": true,
  "actualizar_estado_viaje": true,
  "cargar_documentacion": true,
  "reportar_incidencias": true
}
```

#### **Supervisor de Carga (Coordinador):**
```json
{
  "ver_dashboard": true,
  "supervisar_cargas": true,
  "validar_despachos": true,
  "ver_reportes_operativos": true,
  "gestionar_incidencias": true
}
```

## 🛠️ **Componentes Nuevos Implementados**

### **1. UsuariosEmpresaManager**
- **Ubicación:** `components/Network/UsuariosEmpresaManager.tsx`
- **Funcionalidades:**
  - ✅ Listar usuarios de la empresa
  - ✅ Agregar nuevos usuarios con roles específicos
  - ✅ Editar información de usuarios existentes
  - ✅ Activar/Desactivar usuarios
  - ✅ Mostrar permisos por rol

### **2. Hooks Especializados**
- **useUsuariosEmpresa:** Gestión completa de usuarios
- **useRolesEmpresa:** Obtención de roles disponibles por tipo de empresa
- **useUserPermisos:** Verificación de permisos del usuario actual

### **3. Sistema de Validación**
- **Validación de roles por tipo de empresa**
- **Permisos dinámicos según el rol**
- **RLS (Row Level Security) por empresa y rol**

## 📊 **Casos de Uso Implementados**

### **Escenario 1: Empresa Coordinadora "ABC"**
```
Estructura organizacional:
├── Admin (admin) - Juan Pérez
├── Coordinador (coordinador) - María González  
├── Control Acceso (control_acceso) - Carlos Ruiz
└── Supervisor Carga (supervisor_carga) - Ana Martínez

Permisos diferenciados:
- Admin: Gestiona todo, incluyendo usuarios y configuración
- Coordinador: Crea despachos y gestiona transportistas
- Control Acceso: Valida documentación y accesos
- Supervisor: Supervisa cargas y reporta incidencias
```

### **Escenario 2: Empresa Transporte "XYZ"**
```
Estructura organizacional:
├── Admin (admin) - Roberto Silva
├── Coordinador Flota (coordinador) - Pedro Sánchez
├── Chofer (chofer) - Luis Torres
└── Administrativo (administrativo) - Elena López

Permisos diferenciados:
- Admin: Gestiona usuarios, flota y clientes
- Coordinador: Asigna choferes y gestiona vehículos
- Chofer: Ve sus despachos y actualiza estados
- Administrativo: Gestiona documentación y facturación
```

## 🔄 **Flujo de Gestión de Usuarios**

### **1. Agregar Usuario a Empresa:**
1. Admin accede a "Red de Empresas" → "Usuarios"
2. Clic en "Agregar Usuario"
3. Introduce email del usuario (debe existir en auth.users)
4. Selecciona rol específico para el tipo de empresa
5. Completa información adicional (nombre, departamento, etc.)
6. Usuario queda vinculado con permisos automáticos

### **2. Gestión de Permisos:**
- Los permisos se asignan automáticamente según el rol
- Verificación dinámica en cada operación
- Interfaz adaptativa según permisos del usuario

### **3. Jerarquía de Acceso:**
- **Admin:** Puede gestionar todos los usuarios de su empresa
- **Otros roles:** Solo pueden ver información según sus permisos
- **RLS:** Garantiza que solo vean datos de su empresa

## 📁 **Archivos Actualizados/Creados**

### **SQL Scripts:**
- `sql/create_network_structure.sql` - Tabla roles_empresa y campos adicionales
- `sql/create_network_functions.sql` - Funciones de permisos y validación
- `sql/create_network_rls_policies.sql` - Políticas de seguridad actualizadas
- `sql/migrate_network_complete.sql` - Migración con datos de ejemplo

### **TypeScript:**
- `types/network.ts` - Interfaces actualizadas para roles y usuarios
- `lib/hooks/useUsuariosEmpresa.tsx` - Hooks para gestión de usuarios
- `lib/hooks/useNetwork.tsx` - Actualizado con sistema de permisos

### **Components:**
- `components/Network/UsuariosEmpresaManager.tsx` - Gestor de usuarios
- `components/Network/NetworkManager.tsx` - Actualizado con tab usuarios
- `pages/configuracion.tsx` - Integración completa

## 🚀 **Para Probar la Funcionalidad**

### **1. Ejecutar Migración:**
```sql
-- En Supabase SQL Editor:
\i sql/migrate_network_complete.sql
```

### **2. Acceso por Rol:**
```
Admin empresa coordinadora:
- Login → Configuración → Red de Empresas → Tab "Usuarios"
- Puede agregar: coordinador, control_acceso, supervisor_carga

Admin empresa transporte:  
- Login → Configuración → Red de Empresas → Tab "Usuarios"
- Puede agregar: coordinador, chofer, administrativo
```

### **3. Verificar Permisos:**
- Cada usuario ve interfaz adaptada a sus permisos
- Botones y opciones aparecen/desaparecen según el rol
- Acceso automático a funcionalidades permitidas

## 🔐 **Seguridad Implementada**

- **Validación de roles por tipo de empresa**
- **RLS a nivel de base de datos**
- **Verificación de permisos en cada operación**
- **Jerarquía de acceso claramente definida**
- **Auditoría completa de acciones de usuarios**

## 📈 **Próximas Extensiones Sugeridas**

1. **Dashboard específico por rol** (vista chofer vs coordinador)
2. **Notificaciones dirigidas por permisos**
3. **Reportes específicos según el rol**
4. **Flujos de aprobación por jerarquía**
5. **Historial de acciones por usuario**

---

**¡El sistema ahora soporta completamente múltiples usuarios por empresa con roles diferenciados!** 🎉

Cada empresa puede tener su estructura organizacional completa con permisos granulares.