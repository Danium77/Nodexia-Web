# 🚀 NODEXIA - Guía de Inicio Rápido

> **Última actualización:** 29 de Octubre de 2025  
> **Estado del proyecto:** ✅ Sistema funcional con diferenciación de roles por tipo de empresa

---

## 📋 Para Empezar (LEER PRIMERO)

Si eres un **nuevo desarrollador** o estás **retomando el proyecto**, sigue este orden:

### 1️⃣ **Contexto General**
- 📖 [README.md](./README.md) - Descripción general del proyecto
- 🗺️ [NODEXIA-ROADMAP.md](./NODEXIA-ROADMAP.md) - Visión y objetivos a largo plazo
- 🏗️ [docs/ARQUITECTURA-OPERATIVA.md](./docs/ARQUITECTURA-OPERATIVA.md) - Arquitectura del sistema

### 2️⃣ **Estado Actual del Proyecto**
- ✅ [RESUMEN-ESTADO-ACTUAL.md](./RESUMEN-ESTADO-ACTUAL.md) - Qué está funcionando ahora
- 📊 [PROGRESO-ACTUAL-26-OCT.md](./PROGRESO-ACTUAL-26-OCT.md) - Último progreso registrado
- 🎯 [PLAN-DE-ACCION.md](./PLAN-DE-ACCION.md) - Próximos pasos

### 3️⃣ **Últimas Sesiones de Desarrollo**
- 📅 **29 Oct 2025:** [SESION-29-OCT-2025.md](./docs/sesiones/SESION-29-OCT-2025.md) - Diferenciación de roles por empresa
- 📅 **28 Oct 2025:** [RESUMEN-SESION-TRANSPORTE-28-OCT.md](./RESUMEN-SESION-TRANSPORTE-28-OCT.md) - Sistema de transporte
- 📅 **26 Oct 2025:** [SESION-COMPLETADA-2025-10-26.md](./SESION-COMPLETADA-2025-10-26.md) - Invitaciones sin email

---

## 🔐 Credenciales de Prueba

### Usuario Coordinador de Planta
```
Email: coordinador.demo@nodexia.com
Password: [consultar en .env.local]
Tipo: Planta
Dashboard: /coordinator-dashboard
```

### Usuario Coordinador de Transporte
```
Email: gonzalo@logisticaexpres.com
Password: Tempicxmej9o!1862
Tipo: Transporte  
Dashboard: /transporte/dashboard
```

### Super Admin
```
Email: admin.demo@nodexia.com
Password: [consultar en .env.local]
Dashboard: /admin/super-admin-dashboard
```

---

## 🛠️ Configuración del Entorno

### 1. Instalar Dependencias
```bash
pnpm install
```

### 2. Configurar Variables de Entorno
```bash
cp .env.local.example .env.local
# Editar .env.local con las credenciales de Supabase
```

### 3. Ejecutar Migraciones (si es necesario)
```bash
# Ver: EJECUTAR-MIGRACIONES.md
node scripts/run_migration.js
```

### 4. Iniciar Servidor de Desarrollo
```bash
pnpm run dev
# Abrir: http://localhost:3000
```

---

## 📁 Estructura de Documentación

### `/docs/` - Documentación Técnica
```
docs/
├── ARQUITECTURA-OPERATIVA.md      # Arquitectura del sistema
├── DESIGN-SYSTEM.md                # Sistema de diseño y componentes
├── CREDENCIALES-OFICIALES.md       # Credenciales de producción
├── guides/                         # Guías específicas
│   ├── README-EMPRESAS-USUARIOS.md
│   ├── README-MULTI-USER.md
│   └── README-NETWORK.md
├── solutions/                      # Soluciones a problemas comunes
│   ├── SOLUCION-BUG-ASIGNACION.md
│   ├── SOLUCION-ERROR-SMTP-EMAILS.md
│   └── SOLUCION-BUCLE-INFINITO-HOTRELOAD.md
├── summaries/                      # Resúmenes de sesiones
│   ├── RESUMEN-SESION-16-17-OCT-2025.md
│   ├── LIMPIEZA-Y-REFACTORIZACION-16-OCT-2025.md
│   └── ANALISIS-COMPLETO-ARQUITECTURA.md
└── sesiones/                       # Sesiones de desarrollo detalladas
    └── SESION-29-OCT-2025.md
```

### `/` - Raíz (Documentos de Referencia Rápida)
```
/
├── INICIO-RAPIDO.md                    # 👈 ESTE ARCHIVO
├── INDICE-DOCUMENTACION.md             # Índice maestro completo
├── INVITACIONES-SIN-EMAIL.md           # Sistema de invitaciones sin SMTP
├── INSTRUCCIONES-SISTEMA-TRANSPORTE.md # Sistema de transporte
├── EJECUTAR-MIGRACIONES.md             # Cómo ejecutar migraciones
└── TESTING-COMPLETADO.md               # Estado del testing
```

### `/scripts/` - Scripts de Utilidad
```
scripts/
├── README.md                       # Documentación de scripts
├── reset_user_password.js          # Reset de contraseñas
├── check_roles_transporte.js       # Auditoría de roles
├── sync_roles_with_types.js        # Sincronización de roles
├── vincular_usuario_empresa.js     # Vincular usuarios a empresas
└── confirm_user_email.js           # Confirmar emails manualmente
```

---

## 🎯 Funcionalidades Principales

### ✅ Completadas y Funcionales

#### 1. **Sistema de Autenticación Multi-Empresa**
- Login con diferenciación por `tipo_empresa` (planta/transporte/cliente)
- Roles específicos por tipo:
  - **Planta:** coordinador, control_acceso, supervisor_carga
  - **Transporte:** coordinador_transporte, chofer, administrativo
  - **Cliente:** visor
- Contexto unificado en `UserRoleContext.tsx`

#### 2. **Sistema de Invitaciones Sin Email (Testing)**
- Creación directa de usuarios sin SMTP
- Generación de contraseñas temporales
- Confirmación automática de email
- Modo dual: testing vs producción con SendGrid

#### 3. **Dashboards Diferenciados**
- **Planta:** `/coordinator-dashboard` - Gestión de despachos y planificación
- **Transporte:** `/transporte/dashboard` - Gestión de viajes y flota
- **Super Admin:** `/admin/super-admin-dashboard` - Gestión global

#### 4. **Gestión de Transporte**
- Despachos ofrecidos (planta → transporte)
- Asignación de viajes a choferes y camiones
- Tracking GPS en tiempo real
- Sistema de notificaciones
- Upload de documentos (remitos)

#### 5. **Red Nodexia**
- Visualización de empresas conectadas
- Estado de disponibilidad
- Integración con mapa

---

## 🐛 Problemas Conocidos y Soluciones

### 1. **Error: "Email not confirmed"**
**Solución:** Ejecutar `node scripts/confirm_user_email.js EMAIL`

### 2. **Rol no reconocido en dashboard**
**Causa:** Falta agregar el rol en el switch de `/pages/dashboard.tsx`  
**Solución:** Ver commit "fix: Agregar redirecciones para todos los roles"

### 3. **Modal de wizard no persiste al recargar**
**Solución:** Implementado con sessionStorage + Portal (ver `WizardUsuario.tsx`)

### 4. **Roles no coinciden entre types.ts y base de datos**
**Solución:** Ejecutar `node scripts/sync_roles_with_types.js`

---

## 📚 Documentación por Categoría

### 🔧 Guías Técnicas
1. [ARQUITECTURA-OPERATIVA.md](./docs/ARQUITECTURA-OPERATIVA.md) - Cómo funciona el sistema
2. [DESIGN-SYSTEM.md](./docs/DESIGN-SYSTEM.md) - Componentes UI y estilos
3. [GUIA-CORRECCIONES-MANUALES.md](./docs/GUIA-CORRECCIONES-MANUALES.md) - Fixes comunes

### 📝 Instrucciones Operativas
1. [INVITACIONES-SIN-EMAIL.md](./INVITACIONES-SIN-EMAIL.md) - Sistema de invitaciones
2. [INSTRUCCIONES-SISTEMA-TRANSPORTE.md](./INSTRUCCIONES-SISTEMA-TRANSPORTE.md) - Sistema de transporte
3. [EJECUTAR-MIGRACIONES.md](./EJECUTAR-MIGRACIONES.md) - Migraciones SQL

### 🧪 Testing y QA
1. [TESTING-COMPLETADO.md](./TESTING-COMPLETADO.md) - Estado del testing
2. [RESUMEN-TESTING.md](./RESUMEN-TESTING.md) - Resumen de pruebas
3. [PLAN-PRUEBAS-UI.md](./docs/PLAN-PRUEBAS-UI.md) - Plan de pruebas UI

### 🚨 Soluciones a Problemas
1. [SOLUCION-BUG-ASIGNACION.md](./docs/solutions/SOLUCION-BUG-ASIGNACION.md)
2. [SOLUCION-ERROR-SMTP-EMAILS.md](./docs/solutions/SOLUCION-ERROR-SMTP-EMAILS.md)
3. [SOLUCION-BUCLE-INFINITO-HOTRELOAD.md](./docs/solutions/SOLUCION-BUCLE-INFINITO-HOTRELOAD.md)

---

## 🔄 Flujo de Trabajo Recomendado

### Para Nueva Sesión de Desarrollo:

1. **Leer documentos de estado actual:**
   - `RESUMEN-ESTADO-ACTUAL.md`
   - Última sesión en `/docs/sesiones/`

2. **Verificar entorno:**
   ```bash
   pnpm install
   pnpm run dev
   ```

3. **Probar login con credenciales de prueba**

4. **Revisar problemas pendientes:**
   - Solapa "PROBLEMS" del terminal
   - `PLAN-DE-ACCION.md`

5. **Al finalizar sesión:**
   - Documentar cambios en `/docs/sesiones/SESION-[FECHA].md`
   - Actualizar `RESUMEN-ESTADO-ACTUAL.md`
   - Commit con mensaje descriptivo

---

## 📞 Contacto y Soporte

- **Repositorio:** Nodexia-Web
- **Owner:** Danium77
- **Branch principal:** main

---

## 🎓 Recursos Adicionales

### Tecnologías Principales
- **Frontend:** Next.js 15 (Pages Router), React 19, TypeScript
- **Backend:** Supabase (Auth + PostgreSQL)
- **Styling:** Tailwind CSS
- **Maps:** Leaflet
- **Icons:** Heroicons
- **Testing:** Jest + React Testing Library

### Links Útiles
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**¿Perdido? 🤔** Empieza por [RESUMEN-ESTADO-ACTUAL.md](./RESUMEN-ESTADO-ACTUAL.md) y luego revisa la última sesión en `/docs/sesiones/`.
