# ===========================================
# GUÍA: Configurar Entorno de Desarrollo
# Supabase Separado para DEV
# ===========================================

## Paso 1: Crear Proyecto en Supabase

1. Ve a https://supabase.com/dashboard
2. Click **"New Project"**
3. Configura:
   - **Organization:** (tu organización)
   - **Name:** `nodexia-dev`
   - **Database Password:** (genera una segura, guárdala)
   - **Region:** South America (São Paulo) - misma que prod
4. Click **"Create new project"**
5. Espera ~2 minutos

---

## Paso 2: Obtener Credenciales

1. Ve a **Settings** → **API**
2. Copia estos valores:

```
Project URL:        https://xxxxx.supabase.co
anon public key:    eyJhbG...
service_role key:   eyJhbG... (click "Reveal")
```

---

## Paso 3: Actualizar `.env.development`

Abre el archivo `.env.development` en la raíz del proyecto y reemplaza:

```env
SUPABASE_URL=https://TU-PROYECTO-DEV.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-dev
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO-DEV.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-dev
```

---

## Paso 4: Migrar Esquema de Base de Datos

En tu proyecto DEV de Supabase, ve a **SQL Editor** y ejecuta:

### Opción A: Script Único (Recomendado)
Ejecuta el archivo: `sql/setup-dev-environment.sql`

Este script crea TODO lo necesario:
- ✅ Tablas base (empresas, usuarios, roles)
- ✅ Tablas de flota (camiones, acoplados, choferes)
- ✅ Sistema de viajes y despachos
- ✅ Funciones SQL (incluyendo `reprogramar_viaje()`)
- ✅ Políticas RLS
- ✅ Empresas demo de prueba

### Opción B: Archivos separados (si necesitas personalizar)
Ejecuta en orden:
1. `sql/init_schema.sql`
2. `sql/create_network_structure.sql`
3. `sql/create_flota_tables.sql`
4. `sql/create-viajes-despacho-system.sql`
5. `sql/migrations/017_unificar_columnas_recursos.sql`

---

## Paso 5: Crear Usuario Admin de Desarrollo

En el SQL Editor de tu proyecto DEV, ejecuta:

```sql
-- Crear usuario admin para desarrollo
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  'admin@dev.nodexia.com',
  crypt('DevPass123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin Dev"}',
  false,
  'authenticated'
);
```

---

## Paso 6: Verificar Configuración

Reinicia el servidor de desarrollo:

```bash
# Detener servidor actual (Ctrl+C)
pnpm dev
```

Verifica en la consola que muestre las variables correctas.

---

## Cómo Funciona Ahora

| Comando | Archivo ENV | Supabase |
|---------|-------------|----------|
| `pnpm dev` | `.env.development` | nodexia-dev |
| Vercel (prod) | Variables en Vercel | nodexia-prod |

---

## Verificar Entorno Actual

En cualquier página, abre la consola del navegador (F12) y escribe:

```javascript
console.log(process.env.NEXT_PUBLIC_ENV)
// Debería mostrar: "development" o "production"
```

---

## Notas Importantes

⚠️ **NUNCA** subas archivos `.env.*` a Git (ya están en .gitignore)

⚠️ Los datos de desarrollo son INDEPENDIENTES de producción

⚠️ Cualquier migración SQL nueva debe ejecutarse en AMBOS proyectos

---

## Resumen de Archivos

```
.env.local        → Fallback / Producción local (si necesitas)
.env.development  → Desarrollo (pnpm dev)
Vercel Dashboard  → Producción (nodexiaweb.com)
```
