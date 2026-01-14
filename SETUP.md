# 🚀 Nodexia - Setup para Desarrolladores

## Requisitos Previos

- Node.js 18+ y pnpm
- Cuenta en Supabase (para base de datos)
- Git

## Instalación Local

### 1. Clonar el repositorio (o tu fork)

```bash
git clone https://github.com/tu-usuario/Nodexia-Web.git
cd Nodexia-Web
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

Crear archivo `.env.local` en la raíz del proyecto:

```bash
cp .env.example .env.local
```

Completar con tus credenciales de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

### 4. Configurar Base de Datos

**Opción A: Usar tu propia instancia de Supabase**

1. Crear proyecto en [Supabase](https://supabase.com)
2. Ejecutar migraciones en orden desde `sql/migrations/`
3. Ejecutar scripts de setup desde `sql/`

**Opción B: Solicitar acceso a base de datos de desarrollo**

Contactar al owner del proyecto para credenciales de DB de desarrollo.

### 5. Iniciar servidor de desarrollo

```bash
pnpm dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## 📁 Estructura del Proyecto

```
├── components/          # Componentes React reutilizables
│   ├── Admin/          # Panel de administración
│   ├── Dashboard/      # Dashboards por rol
│   ├── Planning/       # Planificación de despachos
│   └── Transporte/     # Módulos de transporte
├── pages/              # Rutas de Next.js
├── lib/                # Utilidades y helpers
├── sql/                # Migraciones y scripts SQL
├── types/              # Definiciones TypeScript
└── docs/               # Documentación técnica
```

## 🔑 Roles y Acceso

El sistema maneja múltiples roles:

- **Super Admin**: Gestión completa de plataforma
- **Administrador Empresa**: Gestión de su empresa
- **Coordinador (Planta)**: Planificación de despachos
- **Control de Acceso**: Registro de ingresos/egresos
- **Transportista**: Gestión de flotas
- **Chofer**: Vista móvil de viajes

## 🧪 Testing

```bash
# Tests unitarios
pnpm test

# Tests E2E
pnpm test:e2e
```

## 📚 Documentación

Ver `/docs/INDICE-DOCUMENTACION.md` para guías detalladas.

## 🤝 Contribuir

1. Hacer fork del repositorio
2. Crear branch para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

## ⚠️ Notas de Seguridad

- **NUNCA** commitear archivos `.env` o `.env.local`
- Las credenciales de producción están separadas de desarrollo
- Usar variables de entorno para todos los secretos
