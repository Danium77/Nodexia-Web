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
- **🆕 Control de Acceso:** http://localhost:3000/control-acceso
- **🆕 Supervisor de Carga:** http://localhost:3000/supervisor-carga  
- **🆕 Planificación QR:** http://localhost:3000/planificacion
- **🆕 Gestión de Viajes:** http://localhost:3000/viajes
- **🆕 Sistema de Incidencias:** http://localhost:3000/incidencias

### 🔧 **Funcionalidades Demo**
- ✅ **Sistema de Login** con múltiples roles
- ✅ **Gestión de Usuarios** completa con invitaciones
- ✅ **CRUD de Flota** (Camiones, Acoplados, Choferes)
- ✅ **Sistema QR de Viajes** con validación completa
- ✅ **Dashboard Administrativo** con estadísticas
- ✅ **Planificación Diaria** para Control de Acceso y Supervisor
- ✅ **Gestión de Estados** en tiempo real
- ✅ **Sistema de Incidencias** integrado
- ✅ **Notificaciones Push** para app móvil
- ✅ **Validación de Documentación** automática
- ✅ **Supervisión de Carga** con fotos de remitos
- ✅ **Control de Acceso** con escaneo QR
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

### 4️⃣ **Sistema QR de Viajes (NUEVO)**
1. **Control de Acceso:** Login como `control.acceso@nodexia.com`
   - Ver planificación del día
   - Escanear QR de choferes
   - Validar documentación
   - Confirmar ingresos/egresos
   - Reportar incidencias

2. **Supervisor de Carga:** Login como `supervisor.carga@nodexia.com`
   - Ver todos los estados de camiones
   - Llamar a carga (envía notificación push)
   - Escanear QR para iniciar carga
   - Subir foto de remito
   - Finalizar carga

### 5️⃣ **Funcionalidades Avanzadas**
- **Sistema QR único** por viaje
- **Estados en tiempo real** 
- **Notificaciones push** automáticas
- **Gestión de incidencias** integrada
- **Validación documental** con fotos
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
# 1. Recrear usuarios y roles
node scripts/seed_demo_users_updated.js

# 2. Recrear flota (camiones, choferes, acoplados)
node scripts/seed_choferes_flota_demo.js

# 3. Crear tablas del sistema QR (ejecutar en Supabase SQL Editor)
# Copiar contenido de: sql/create_sistema_qr_viajes.sql

# 4. Crear viajes demo con QR
node scripts/seed_viajes_qr_demo.js

# 5. Crear admin (si es necesario)
node scripts/create_admin.js
```

### 🔧 **Setup Inicial Sistema QR**
```bash
# Ejecutar en orden para setup completo:
node scripts/seed_demo_users_updated.js && \
node scripts/seed_choferes_flota_demo.js && \
echo "Ahora ejecuta sql/create_sistema_qr_viajes.sql en Supabase" && \
node scripts/seed_viajes_qr_demo.js
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
**Funcionalidades Específicas:**
- ✅ **Pantalla de Planificación Completa**: Ve programación del día + todos los estados
- ✅ **Gestión de Estados**: Maneja "Llamado a Carga", "Iniciando Carga", "Carga Finalizada"
- ✅ **Escaneo QR**: Valida datos del chofer/camión antes de iniciar carga
- ✅ **Notificaciones Push**: Envía "Llamado a carga" a app móvil del chofer
- ✅ **Subida de Remitos**: Fotografía y sube remito al finalizar carga
- ✅ **Visibilidad Total**: Ve camiones en playa, cargando y cargados
- ✅ **Gestión de Incidencias**: Ve y gestiona incidencias reportadas

#### 🛡️ **Control de Acceso a Planta**
**Usuario:** Elena Seguridad (`control.acceso@nodexia.com`)
**Funcionalidades Específicas:**
- ✅ **Planificación del Día**: Ve solo arribos programados para HOY
- ✅ **Escaneo QR**: Lee código QR del chofer para validar datos completos
- ✅ **Gestión de Ingresos**: Confirma "Ingreso a Planta" tras validar todo
- ✅ **Gestión de Egresos**: Confirma "Egreso de Planta" al finalizar operación
- ✅ **Validación Documental**: Verifica vigencia de documentación
- ✅ **Actualización de Docs**: Puede validar documentación nueva si chofer la presenta
- ✅ **Rechazo de Ingreso**: Puede rechazar acceso y crear incidencia visible para toda la cadena
- ✅ **Registro Temporal**: Sistema registra automáticamente fecha/hora de ingreso y egreso

## 🔄 **FLUJO DE ESTADOS Y SISTEMA QR**

### 📱 **Sistema de Código QR**
1. **Chofer confirma viaje** → Sistema genera **QR único** con:
   - Datos del chofer
   - Datos del camión 
   - Estado de documentación
   - Destino y tipo de operación (carga/descarga)

### 🚦 **Estados del Sistema**

#### **Flujo Completo:**
```
1. 📋 "Viaje Confirmado" (Chofer confirma → QR generado)
   ↓
2. 🛡️ "Ingreso a Planta" (Control Acceso escanea QR → valida → confirma)
   ↓  
3. 🅿️ "En Playa Esperando" (Automático tras ingreso)
   ↓
4. 📢 "Llamado a Carga" (Supervisor llama → Push al chofer)
   ↓
5. ⚡ "Iniciando Carga" (Supervisor escanea QR → confirma inicio)
   ↓
6. 📋 "Carga Finalizada" (Supervisor sube remito → finaliza)
   ↓
7. 🚪 "Egreso de Planta" (Control Acceso escanea QR → confirma salida)
```

### 📱 **Notificaciones Push al Chofer**
- ✅ Confirmación de viaje generado
- ⚠️ Avisos de documentación próxima a vencer
- 📢 Llamado a carga (desde Supervisor)
- 📍 Cambios de estado en tiempo real

### 🚨 **Sistema de Incidencias**
- **Control de Acceso** puede rechazar ingreso → Crea incidencia
- **Incidencia visible para:** Transporte, Coordinador, Supervisor de Carga
- **Causas comunes:** Documentación vencida, datos incorrectos, problemas del vehículo

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