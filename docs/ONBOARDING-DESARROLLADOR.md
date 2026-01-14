# Guía de Onboarding para Desarrolladores
**Proyecto Nodexia-Web**  
Fecha: 10 de enero de 2026

---

## 📋 Resumen Técnico del Proyecto

### Stack Tecnológico
- **Frontend**: Next.js 15.5.6 + React + TypeScript
- **Estilos**: Tailwind CSS
- **Base de datos**: PostgreSQL 15+ via Supabase
- **Testing**: Jest + Playwright (E2E)
- **Gestor de paquetes**: pnpm

### Arquitectura
- **Patrón**: Pages Router (Next.js tradicional, no App Router)
- **Autenticación**: Supabase Auth + Row Level Security (RLS)
- **Multi-tenant**: Sistema de empresas con roles (coordinador_planta, coordinador_transporte, super_admin)
- **Real-time**: Hooks personalizados con polling para actualizaciones

### Módulos Principales

#### 1. Gestión de Despachos
**Archivo**: `pages/crear-despacho.tsx` (~2,500 líneas)
- Creación, asignación de transportes
- Sistema de múltiples viajes por despacho
- Tabs: Pendientes, En Proceso, Asignados, Expirados

#### 2. Planificación
**Archivo**: `pages/planificacion.tsx` (~1,800 líneas)
- Vista Semanal/Diaria/Mensual
- Drag & drop de viajes
- Sistema de estados duales (15 migraciones SQL)

#### 3. Red Nodexia (Marketplace de transportes)
- Publicación/aceptación de viajes
- Sistema de ofertas entre empresas

#### 4. Componentes Reutilizables
**Directorio**: `components/`
- ~40 componentes organizados por dominio
- Modals, Forms, UI components

### Base de Datos
- **16 migraciones SQL** ejecutadas (sistema evolutivo)
- **Tablas principales**: usuarios, empresas, ubicaciones, despachos, viajes_despacho, choferes, camiones
- **Features**: Estados duales (carga/unidad), sistema de expiración, histórico de reprogramaciones
- **Vistas**: KPIs, dashboards analíticos

### Cantidad de Código
- **Total**: ~15,000-20,000 líneas TypeScript/React
- **SQL**: ~3,000 líneas en migraciones
- **Páginas principales**: 6-8 (cada una 300-2,500 líneas)
- **Componentes**: ~40 archivos
- **Hooks personalizados**: ~10
- **Types compartidos**: 1 archivo central (`lib/types.ts` ~1,100 líneas)

### Complejidad
- **Media-Alta**: Lógica de negocio compleja (logística multi-empresa)
- **Bien estructurado**: Separación clara de concerns
- **Documentación**: ~30 archivos .md en `/docs`
- **Estado actual**: Producción activa, refactorización continua

### Deuda Técnica
- Sistema legacy de estados siendo migrado a estados duales
- Algunos componentes grandes necesitan refactorización
- Consultas SQL optimizadas con Dictionary Pattern

---

## 🚀 Opciones para que otro Desarrollador trabaje en el código

### Opción 1: GitHub (⭐ Recomendada)

#### Paso 1: Subir el proyecto a GitHub

```powershell
# En la terminal de PowerShell, dentro de C:\Users\nodex\Nodexia-Web

# 1. Inicializar Git (si no está inicializado)
git init

# 2. Crear archivo .gitignore si no existe
# Ya existe en el proyecto

# 3. Agregar todos los archivos
git add .

# 4. Commit inicial
git commit -m "Initial commit - Nodexia Web v1.0"

# 5. Crear repositorio en GitHub (hazlo desde https://github.com/new)
# Nombre sugerido: nodexia-web
# Tipo: Privado (para mantener el código seguro)

# 6. Conectar con GitHub
git remote add origin https://github.com/TU-USUARIO/nodexia-web.git

# 7. Subir el código
git push -u origin main
```

#### Paso 2: Agregar colaborador
1. Ve a tu repo en GitHub
2. Settings → Collaborators → Add people
3. Invita al desarrollador por email o username

#### Paso 3: El desarrollador clona el proyecto

```bash
# El otro dev ejecuta:
git clone https://github.com/TU-USUARIO/nodexia-web.git
cd nodexia-web
pnpm install
```

#### Paso 4: Enviar credenciales (IMPORTANTE)

**⚠️ NUNCA subir `.env.local` a GitHub**

Envía este archivo por email/mensaje privado seguro:

**Archivo: `.env.local`**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://lkdcofsfjnluzzzwoir.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZGNvZnNmam5sdXp6endvaXIiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczMzcxNzQ0MSwiZXhwIjoyMDQ5MjkzNDQxfQ.OxHMOV79xOT1pXZJb8jMFTWKPRWr1n_f2J4bHIvj60A

# (Agregar otras variables de entorno que tengas)
```

El dev debe crear este archivo en su carpeta local.

#### Paso 5: El dev arranca el proyecto

```bash
# Copiar .env.local (archivo recibido del líder del proyecto)
# Luego ejecutar:

pnpm run dev
```

El proyecto estará disponible en: `http://localhost:3000`

---

### Opción 2: Compartir carpeta comprimida

#### Paso 1: Preparar carpeta
```powershell
# En PowerShell
cd C:\Users\nodex

# Comprimir excluyendo archivos pesados
Compress-Archive -Path "Nodexia-Web\*" -DestinationPath "Nodexia-Web-compartir.zip" -Exclude "node_modules", ".next", ".git"
```

#### Paso 2: Subir a Drive/Dropbox
- Sube `Nodexia-Web-compartir.zip` a Google Drive o Dropbox
- Comparte el link con el desarrollador

#### Paso 3: El dev descarga y configura
```bash
# Descomprimir
# Instalar dependencias
pnpm install

# Crear .env.local (con las credenciales enviadas)
# Ejecutar
pnpm run dev
```

---

### Opción 3: VS Code Live Share (Colaboración en tiempo real)

1. **Instalar extensión**: "Live Share" de Microsoft en VS Code
2. **Iniciar sesión** con cuenta Microsoft/GitHub
3. **Compartir sesión**: Ctrl+Shift+P → "Live Share: Start Collaboration Session"
4. **Enviar link** al colaborador
5. **Colaboran en tiempo real** sin compartir código

**Ventajas:**
- No necesita clonar el proyecto
- Trabajan juntos en tu máquina
- Útil para pair programming o debugging

**Desventajas:**
- Requiere que ambos estén conectados al mismo tiempo

---

## 🗄️ Configuración de Base de Datos

### Opción A: Mismo proyecto Supabase (más fácil)

1. **Agregar miembro al equipo**:
   - Ve a https://supabase.com/dashboard/project/lkdcofsfjnluzzzwoir
   - Settings → Team → Invite member
   - El dev usa las mismas credenciales `.env.local`

**Ventajas:**
- Mismos datos de prueba
- No necesita ejecutar migraciones

**Desventajas:**
- Comparten la misma base de datos (cambios afectan a ambos)

---

### Opción B: Proyecto Supabase separado (recomendado para desarrollo)

1. **El dev crea su proyecto Supabase**:
   - https://supabase.com/dashboard
   - New Project → `nodexia-dev-[nombre]`

2. **Ejecutar migraciones en orden**:
   ```bash
   # Desde Supabase SQL Editor, ejecutar cada archivo en orden:
   
   sql/migrations/001_initial_schema.sql
   sql/migrations/002_add_empresas.sql
   # ... hasta
   sql/migrations/016_sistema_reprogramacion.sql
   ```

3. **Actualizar `.env.local`** con sus propias credenciales

**Ventajas:**
- Ambiente aislado para testing
- No afecta datos de producción

---

## 📦 Requisitos del Sistema

### Software necesario:

✅ **Node.js 18+**
- Descargar: https://nodejs.org/
- Verificar: `node --version`

✅ **pnpm**
```bash
npm install -g pnpm
# Verificar: pnpm --version
```

✅ **Git**
- Descargar: https://git-scm.com/
- Verificar: `git --version`

✅ **VS Code** (recomendado)
- Extensiones útiles:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - GitLens

---

## 📚 Documentación Esencial

### Archivos clave para revisar:

1. **`README.md`** - Instrucciones de instalación
2. **`docs/WORKSPACE-GUIDE.md`** - Estructura del proyecto
3. **`docs/INDICE-DOCUMENTACION.md`** - Índice de toda la documentación
4. **`docs/ARQUITECTURA-OPERATIVA.md`** - Arquitectura del sistema
5. **`docs/ESTRUCTURA-BD-RECURSOS-TRANSPORTE.md`** - Esquema de base de datos
6. **`lib/types.ts`** - Definiciones TypeScript centrales

### Migraciones importantes:
- **`sql/migrations/015_sistema_estados_duales_v2.sql`** - Sistema de estados actual (643 líneas)
- **`sql/migrations/016_sistema_reprogramacion.sql`** - Sistema de reprogramación (229 líneas)

---

## 🔄 Flujo de Trabajo Recomendado (GitHub)

### Para el desarrollador colaborador:

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU-USUARIO/nodexia-web.git
cd nodexia-web

# 2. Instalar dependencias
pnpm install

# 3. Configurar .env.local (archivo enviado por líder)

# 4. Crear una rama para nueva funcionalidad
git checkout -b feature/nombre-funcionalidad

# 5. Hacer cambios y commits
git add .
git commit -m "Descripción del cambio"

# 6. Subir cambios
git push origin feature/nombre-funcionalidad

# 7. Crear Pull Request en GitHub para revisión
```

### Para el líder del proyecto (tú):

```bash
# 1. Revisar Pull Request en GitHub

# 2. Si está OK, hacer merge desde GitHub UI

# 3. Actualizar tu repositorio local
git checkout main
git pull origin main
```

---

## 🔐 Seguridad y Buenas Prácticas

### ⚠️ NUNCA subir a GitHub:
- `.env.local` (credenciales)
- `node_modules/` (dependencias)
- `.next/` (build)
- Archivos con contraseñas o API keys

### ✅ Ya está configurado en `.gitignore`:
```
node_modules/
.next/
.env.local
.env*.local
```

### 🔑 Credenciales de usuarios demo:
(Enviar por mensaje privado, no por GitHub)

```
Super Admin:
Email: admin@nodexia.com
Password: [CONTRASEÑA]

Coordinador Planta:
Email: leandro@aceitera.com
Password: [CONTRASEÑA]

Coordinador Transporte:
Email: jose@logistica.com
Password: [CONTRASEÑA]
```

---

## 🐛 Troubleshooting Común

### Problema: "Module not found"
```bash
# Solución:
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

### Problema: "Port 3000 already in use"
```bash
# Solución:
# Matar proceso en puerto 3000
npx kill-port 3000

# O usar otro puerto
pnpm run dev -- -p 3001
```

### Problema: "Supabase connection error"
- Verificar que `.env.local` existe
- Verificar que las URLs y keys son correctas
- Verificar conexión a internet

### Problema: Errores de TypeScript
```bash
# Limpiar y rebuilear
rm -rf .next
pnpm run dev
```

---

## 📊 Estado Actual del Proyecto (10 Ene 2026)

### ✅ Completado Recientemente:

1. **Sistema de Estados Duales** (Migración 015)
   - `estado_carga`: Estado del producto/documentación (17 estados)
   - `estado_unidad`: Estado físico del camión/chofer (17 estados)
   - Viajes expirados funcionando correctamente

2. **Sistema de Reprogramación** (Migración 016)
   - Campos: `fue_expirado`, `fecha_expiracion_original`, `cantidad_reprogramaciones`, `motivo_reprogramacion`
   - Función: `reprogramar_viaje()`
   - Vista: `vista_kpis_expiracion` (métricas gerenciales)

3. **Tab Expirados en Despachos**
   - Muestra despachos con viajes expirados
   - Botón "Reprogramar" (TODO: implementar modal)

4. **Modal Viajes Expirados**
   - Muestra viajes expirados (despachos + recepciones)
   - Filtrado por empresa correcto

### 🚧 Pendiente:

1. **Modal Reprogramar Despacho**
   - Inputs: Nueva fecha, hora, motivo
   - Llamar función SQL `reprogramar_viaje()`

2. **Badge de Reprogramación**
   - Mostrar "⚠️ Reprogramado" en tarjetas con `cantidad_reprogramaciones > 0`

3. **Dashboard KPIs Expiración**
   - Usar `vista_kpis_expiracion` para métricas gerenciales

---

## 💡 Consejos para Nuevo Desarrollador

### Primeros pasos sugeridos:

1. **Día 1-2**: Familiarizarse con la estructura
   - Leer `WORKSPACE-GUIDE.md`
   - Revisar `lib/types.ts` (tipos centrales)
   - Ejecutar proyecto localmente

2. **Día 3-4**: Entender módulos principales
   - Revisar `pages/planificacion.tsx`
   - Revisar `pages/crear-despacho.tsx`
   - Entender flujo de despachos → viajes

3. **Día 5+**: Contribuir
   - Tomar tareas del backlog
   - Hacer cambios en rama separada
   - Crear Pull Requests pequeños

### Recursos útiles:

- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **TypeScript**: https://www.typescriptlang.org/docs

---

## 📞 Contacto

Para dudas o problemas, contactar al líder del proyecto.

**Proyecto**: Nodexia-Web  
**Stack**: Next.js + TypeScript + Supabase  
**Última actualización**: 10 de enero de 2026
