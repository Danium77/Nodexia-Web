# Configuración de Empresas y Usuarios - Guía de Pruebas

## Resumen
Esta documentación describe cómo configurar y probar el sistema de empresas multiusuario de Nodexia-Web, incluyendo la vinculación de usuarios a empresas específicas y la interacción entre diferentes roles.

## Arquitectura del Sistema

### Estructura de Empresas
- **Empresas Coordinadoras**: Clientes que contratan servicios de transporte
- **Empresas de Transporte**: Proveedores de servicios logísticos
- **Relaciones Empresas**: Vínculos comerciales entre coordinadoras y transportistas

### Roles por Tipo de Empresa

#### Empresa Coordinadora
- `admin`: Administrador con todos los permisos
- `coordinador`: Coordinador de operaciones
- `control_acceso`: Control de acceso y seguridad
- `supervisor_carga`: Supervisor de carga y operaciones

#### Empresa de Transporte
- `admin`: Administrador con todos los permisos
- `coordinador`: Coordinador de flota
- `chofer`: Chofer/Conductor
- `administrativo`: Personal administrativo

#### Roles Generales (ambos tipos)
- `operador`: Operador general
- `consulta`: Solo consulta

## Scripts de Configuración

### 1. Configuración Inicial
Ejecutar en orden en el SQL Editor de Supabase:

```sql
-- 1. Crear estructura de tablas (si no existe)
\i sql/create_network_structure.sql

-- 2. Configurar políticas RLS
\i sql/create_network_rls_policies.sql

-- 3. Crear funciones de red
\i sql/create_network_functions.sql
```

### 2. Configuración de Empresas y Usuarios
```sql
-- 4. Configurar empresas demo y vincular usuarios existentes
\i sql/setup_empresas_usuarios.sql

-- 5. Crear usuarios adicionales y datos de prueba
\i sql/crear_usuarios_adicionales.sql

-- 6. Probar interacciones entre usuarios
\i sql/test_interaccion_usuarios.sql
```

## Usuarios de Prueba

### Usuarios Principales
- `admin.demo@nodexia.com` - Admin de empresa coordinadora
- `transporte.demo@nodexia.com` - Admin de empresa de transporte

### Usuarios Adicionales (creados por scripts)
- `coordinador.demo@nodexia.com` - Coordinador en empresa coordinadora
- `chofer.demo@nodexia.com` - Chofer en empresa de transporte
- `admin.coordinador@nodexia.com` - Admin adicional coordinadora
- `operador.transporte@nodexia.com` - Operador en empresa transporte

## Empresas Demo

### Empresa Coordinadora Demo
- **Nombre**: Empresa Coordinadora Demo
- **CUIT**: 20-12345678-9
- **Tipo**: coordinador
- **Email**: contacto@coordinadora-demo.com

### Transportes Demo SA
- **Nombre**: Transportes Demo SA
- **CUIT**: 30-87654321-2
- **Tipo**: transporte
- **Email**: admin@transportes-demo.com

## Interfaz de Pruebas

### Acceso
1. Ingresar como usuario admin: `admin.demo@nodexia.com`
2. Navegar a `/test-empresas` desde el menú lateral
3. La página permite:
   - Simular login de diferentes usuarios
   - Ver contexto de empresa y permisos
   - Probar creación de despachos
   - Verificar visibilidad de datos por empresa

### Funcionalidades de Prueba

#### 1. Simulación de Usuario
- Seleccionar email de usuario
- Ver contexto: empresa, rol, permisos
- Verificar datos visibles según empresa

#### 2. Gestión de Despachos
- Crear despachos entre empresas
- Ver despachos según rol y empresa
- Verificar permisos de edición

#### 3. Verificación de Aislamiento
- Confirmar que usuarios solo ven datos de su empresa
- Validar permisos por rol
- Probar interacción entre empresas relacionadas

## Funciones RPC Disponibles

### `simular_contexto_usuario(p_email TEXT)`
Obtiene el contexto completo de un usuario:
```sql
SELECT * FROM simular_contexto_usuario('admin.demo@nodexia.com');
```

### `obtener_despachos_usuario(p_user_id UUID)`
Obtiene despachos visibles para un usuario:
```sql
SELECT * FROM obtener_despachos_usuario('uuid-del-usuario');
```

### `agregar_usuario_empresa(...)`
Agrega un usuario existente a una empresa:
```sql
SELECT agregar_usuario_empresa(
  'nuevo.usuario@email.com',
  'coordinador',
  'Nombre Completo',
  'email.interno@empresa.com'
);
```

## Casos de Uso de Prueba

### 1. Coordinador Crea Despacho
1. Login como `admin.demo@nodexia.com`
2. Crear despacho en interfaz de pruebas
3. Verificar que aparece en ambas empresas relacionadas

### 2. Transporte Ve Sus Despachos
1. Login como `transporte.demo@nodexia.com`
2. Ver despachos asignados a su empresa
3. Verificar permisos de edición según rol

### 3. Chofer Ve Solo Sus Despachos
1. Login como `chofer.demo@nodexia.com`
2. Verificar visibilidad limitada según rol
3. Confirmar que no puede editar despachos

### 4. Aislamiento Entre Empresas
1. Crear segunda empresa de transporte
2. Verificar que usuarios no ven datos de otras empresas
3. Confirmar que relaciones comerciales permiten colaboración

## Validaciones de Seguridad

### Row Level Security (RLS)
- Usuarios solo ven datos de sus empresas
- Permisos basados en rol dentro de empresa
- Super admins pueden ver todo

### Permisos por Rol
- Cada rol tiene permisos específicos definidos en JSONB
- Funciones validan permisos antes de operaciones
- Interfaz adapta funcionalidades según permisos

## Solución de Problemas

### Usuario No Aparece en Empresa
```sql
-- Verificar vinculación
SELECT * FROM usuarios_empresa WHERE user_id = 'uuid-usuario';

-- Vincular manualmente si es necesario
INSERT INTO usuarios_empresa (user_id, empresa_id, rol_interno, nombre_completo)
VALUES ('uuid-usuario', 'uuid-empresa', 'coordinador', 'Nombre Usuario');
```

### Empresa No Tiene Relación Comercial
```sql
-- Crear relación entre empresas
INSERT INTO relaciones_empresas (empresa_cliente_id, empresa_transporte_id, estado)
VALUES ('uuid-coordinadora', 'uuid-transporte', 'activa');
```

### Permisos No Funcionan
```sql
-- Verificar rol y permisos
SELECT ue.rol_interno, re.permisos 
FROM usuarios_empresa ue
LEFT JOIN roles_empresa re ON ue.rol_interno = re.nombre_rol
WHERE ue.user_id = 'uuid-usuario';
```

## Próximos Pasos

1. **Pruebas de Carga**: Probar con múltiples empresas y usuarios
2. **Integración Frontend**: Conectar interfaces existentes con nuevo sistema
3. **Migración de Datos**: Migrar datos existentes al nuevo esquema
4. **Documentación de API**: Documentar endpoints para desarrolladores

## Notas Importantes

- Los scripts crean datos de prueba, no para producción
- Las contraseñas de usuarios demo son `demo123456`
- Verificar configuración de Supabase Auth antes de usar
- Ejecutar scripts en orden para evitar errores de dependencias