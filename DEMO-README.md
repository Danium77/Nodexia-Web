# 🎯 DEMO NODEXIA WEB - DATOS DE DEMOSTRACIÓN

## 📊 Estado de la Demo
✅ **APLICACIÓN LISTA PARA DEMO** 
- Servidor corriendo en: **http://localhost:3000**
- Base de datos poblada con datos de prueba
- Sistema de usuarios funcional
- Flota de vehículos creada

---

## 🔐 CREDENCIALES DE ACCESO

### 👤 **Usuarios Disponibles**

| Rol | Email | Password | Empresa | Descripción |
|-----|-------|----------|---------|-------------|
| **Super Admin** | `admin_demo@example.com` | `Demo1234!` | Administrador General | Control total del sistema |
| **Coordinador** | `coord_demo@example.com` | `Demo1234!` | Nodexia San Francisco | Gestión operacional |
| **Supervisor de Carga** | `supervisor.carga@nodexia.com` | `Demo1234!` | Transportes Nodexia Demo | Supervisión de operaciones de carga |
| **Control de Acceso** | `control.acceso@nodexia.com` | `Demo1234!` | Transportes Nodexia Demo | Control de acceso y seguridad |
| **Chofer** | `chofer.demo@nodexia.com` | `Demo1234!` | Transportes Nodexia Demo | Usuarios de transporte |
| **Operador** | `operador.demo@logistica.com` | `Demo1234!` | Logística del Centro | Operaciones logísticas |
| **Cliente** | `cliente.demo@tecnoembalajes.com` | `Demo1234!` | Tecnoembalajes Demo | Usuario cliente final |

### 🏢 **Empresas Creadas**
- **Transportes Nodexia Demo** - Empresa principal de transporte
- **Tecnoembalajes Demo S.A.** - Cliente de embalajes  
- **Logística del Centro Demo** - Empresa logística
- **Empresa Coordinadora Demo** - Empresa coordinadora

---

## 🚛 FLOTA DE VEHÍCULOS

### 🚚 **Camiones Demo**
| Patente | Marca | Modelo | Año |
|---------|-------|--------|-----|
| `ABC123` | Mercedes | Axor | (existente) |
| `DEF456` | Volvo | FH540 | 2019 |
| `GHI789` | Mercedes-Benz | Actros 2046 | 2021 |
| `JKL012` | Scania | R450 | 2020 |
| `MNO345` | Iveco | Stralis 570 | 2022 |
| `PQR678` | DAF | XF 480 | 2020 |

### 🚛 **Acoplados Demo**
| Patente | Marca | Modelo | Año | Tipo |
|---------|-------|--------|-----|------|
| `XYZ001` | Helvetica | Granelero | 2020 | Granelero |
| `XYZ002` | Turinetto | Sider | 2019 | Sider |
| `XYZ003` | Bresciani | Tanque | 2021 | Tanque |

### 👨‍💼 **Choferes Demo**
| Nombre | DNI | Teléfono | Email |
|--------|-----|----------|-------|
| Juan Carlos Pérez | 12345678 | +54 9 3564 123456 | juan.perez@nodexiademo.com |
| María Elena Rodríguez | 87654321 | +54 9 3564 987654 | maria.rodriguez@nodexiademo.com |
| Roberto Martínez | 11223344 | +54 9 3564 112233 | roberto.martinez@nodexiademo.com |
| Diego Fernández | 33445566 | +54 9 3564 334455 | diego.fernandez@nodexiademo.com |
| Patricia López | 77889900 | +54 9 3564 778899 | patricia.lopez@nodexiademo.com |

---

## 🌐 NAVEGACIÓN DE LA DEMO

### 📋 **Rutas Principales**
- **Inicio:** http://localhost:3000
- **Login:** http://localhost:3000/login
- **Dashboard:** http://localhost:3000/dashboard
- **Admin Usuarios:** http://localhost:3000/admin/usuarios
- **Gestión Camiones:** http://localhost:3000/camiones  
- **Gestión Choferes:** http://localhost:3000/choferes
- **Gestión Acoplados:** http://localhost:3000/acoplados
- **Planificación:** http://localhost:3000/planificacion

### 🔧 **Funcionalidades Demo**
- ✅ **Sistema de Login** con múltiples roles
- ✅ **Gestión de Usuarios** completa con invitaciones
- ✅ **CRUD de Flota** (Camiones, Acoplados, Choferes)
- ✅ **Dashboard Administrativo** con estadísticas
- ✅ **Sistema de Roles y Permisos** granular
- ✅ **Supervisión de Carga** y operaciones
- ✅ **Control de Acceso** y seguridad
- ✅ **Interfaz Responsive** moderna
- ✅ **Filtros y Búsquedas** avanzadas

---

## 🎬 GUÍA DE DEMOSTRACIÓN

### 1️⃣ **Inicio de Sesión**
1. Ir a http://localhost:3000
2. Hacer clic en "Iniciar Sesión"
3. Usar credenciales: `admin_demo@example.com` / `Demo1234!`

### 2️⃣ **Panel Administrativo**
1. Una vez logueado, navegar a **Admin → Usuarios**
2. Mostrar la lista de usuarios con filtros
3. Demostrar funcionalidades:
   - ✨ Invitar nuevo usuario
   - 🔄 Reenviar invitaciones  
   - 📧 Tests de email SMTP
   - 🗑️ Eliminación de usuarios

### 3️⃣ **Gestión de Flota**
1. **Camiones:** Mostrar lista, agregar nuevo, editar
2. **Choferes:** Gestión completa con documentos
3. **Acoplados:** CRUD completo

### 4️⃣ **Funcionalidades Avanzadas**
- **Búsquedas y filtros** en tiempo real
- **Estadísticas visuales** en dashboard
- **Sistema de permisos** por rol
- **Responsive design** en móvil/tablet

---

## 🔧 COMANDOS ÚTILES

### 📦 **Gestión de la Aplicación**
```bash
# Iniciar servidor de desarrollo
pnpm run dev

# Construir para producción  
pnpm run build

# Iniciar en modo producción
pnpm start
```

### 🗄️ **Regenerar Datos Demo**
```bash
# Recrear usuarios demo
node scripts/seed_demo_users_updated.js

# Recrear flota demo  
node scripts/seed_choferes_flota_demo.js

# Crear admin (si es necesario)
node scripts/create_admin.js
```

### 🧹 **Limpiar Datos**
```bash
# Eliminar usuario específico
node scripts/eliminar_usuario.js

# Configurar roles
node scripts/setup_roles.js
```

---

## 📱 CARACTERÍSTICAS DESTACADAS

### 🎨 **Interfaz Moderna**
- ✅ Design System con Tailwind CSS
- ✅ Iconografía Heroicons
- ✅ Dark Theme profesional
- ✅ Componentes reutilizables
- ✅ Responsivo móvil-first

### 🔐 **Sistema de Seguridad**
- ✅ Autenticación Supabase
- ✅ Row Level Security (RLS)
- ✅ Roles granulares
- ✅ Sesiones seguras
- ✅ Validaciones robustas

### 📊 **Gestión de Datos**
- ✅ CRUD completo en todas las entidades
- ✅ Filtros avanzados
- ✅ Búsquedas en tiempo real  
- ✅ Paginación inteligente
- ✅ Exportación de datos

### 🚀 **Performance**
- ✅ Next.js 15.3.3 optimizado
- ✅ Server-Side Rendering
- ✅ API Routes eficientes
- ✅ Caching inteligente
- ✅ Code splitting automático

---

## 💡 NOTAS PARA LA DEMO

### 🎯 **Puntos Clave a Mostrar**
1. **Facilidad de uso** - Interfaz intuitiva
2. **Escalabilidad** - Arquitectura robusta  
3. **Seguridad** - Sistema de permisos
4. **Modernidad** - Tecnologías actuales
5. **Completitud** - Funcionalidades integrales

### ⚠️ **Limitaciones Demo**
- Email SMTP puede no estar configurado (usar "Enlace Manual")
- Algunas funciones avanzadas pueden requerir configuración adicional
- Los datos son de prueba y se pueden restablecer

### 🎯 **ROLES ESPECIALIZADOS**

#### 👷 **Supervisor de Carga**
**Usuario:** Luis Supervisor (`supervisor.carga@nodexia.com`)
**Responsabilidades:**
- ✅ Supervisión de operaciones de carga y descarga
- ✅ Control de calidad de mercadería 
- ✅ Gestión de tiempos de carga
- ✅ Coordinación con choferes y operarios
- ✅ Reportes de incidencias
- ✅ Verificación de documentación de carga

#### 🛡️ **Control de Acceso**
**Usuario:** Elena Seguridad (`control.acceso@nodexia.com`)
**Responsabilidades:**
- ✅ Control de acceso a instalaciones
- ✅ Verificación de credenciales
- ✅ Registro de ingresos y egresos
- ✅ Monitoreo de seguridad
- ✅ Gestión de visitantes
- ✅ Reportes de seguridad

### 🔄 **Regenerar Demo**
Si algo sale mal, simplemente ejecutar:
```bash
node scripts/seed_demo_users_updated.js
node scripts/seed_choferes_flota_demo.js
```

---

## 📞 SOPORTE

**Desarrollado por:** Walter Daniel Zayas  
**Email:** waltedanielzaas@gmail.com  
**Proyecto:** Nodexia Web - Sistema de Gestión Logística  

---

🎉 **¡La demo está lista para ser mostrada!** 🎉