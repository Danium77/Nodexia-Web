# 🚀 Ejecutor de Migraciones SQL - Nodexia

**Última actualización:** 19 de Octubre 2025  
**Versión:** 2.0 (Arquitectura Completa)

---

## ⚠️ IMPORTANTE: NUEVA ESTRUCTURA DE MIGRACIONES

### ✅ MIGRACIÓN OFICIAL (Usar esta)

**002_migracion_arquitectura_completa.sql** - MIGRACIÓN UNIFICADA ⭐

Esta migración incluye TODO lo necesario:
- ✅ Corrige tipo_empresa: 'planta', 'transporte', 'cliente'
- ✅ Habilita multi-rol: UNIQUE(user_id, empresa_id, rol_interno)
- ✅ Crea 7 nuevas tablas (destinos, origenes, planta_*, ofertas_red_nodexia)
- ✅ Actualiza tabla despachos
- ✅ Políticas RLS completas
- ✅ Funciones auxiliares

**Esta es la ÚNICA migración que necesitas ejecutar.**

### ⚠️ MIGRACIONES VIEJAS (Obsoletas)

~~001_migrar_coordinador_a_planta.sql~~ - DEPRECADA  
~~002_crear_nuevas_tablas.sql~~ - NO EXISTE  
~~003_tablas_intermedias.sql~~ - NO EXISTE  
~~004_actualizar_usuarios_empresa.sql~~ - NO EXISTE  
~~005_actualizar_rls_policies.sql~~ - NO EXISTE

**Nota:** La migración 001 fue reemplazada completamente por 002_migracion_arquitectura_completa.sql

---

## 🎯 MÉTODO RECOMENDADO: SQL Editor de Supabase ⭐

**✅ MÁS SEGURO - SIN CREDENCIALES LOCALES**

### 📖 Guía completa paso a paso:

Ver documentación detallada en:
👉 **[docs/guides/EJECUTAR-MIGRACIONES-SQL-EDITOR.md](../../docs/guides/EJECUTAR-MIGRACIONES-SQL-EDITOR.md)**

### Resumen rápido:
1. Ir a Supabase Dashboard → SQL Editor
2. New Query
3. Copiar contenido de cada script SQL (en orden 001→005)
4. RUN
5. Verificar mensajes ✅

**Tiempo estimado: 4-5 minutos**

---

## 🔄 Método Alternativo: Script Automatizado (PostgreSQL)

### Paso 1: Instalar dependencia

```powershell
npm install pg
```

### Paso 2: Configurar DATABASE_URL

Agregar a tu `.env.local`:

```env
DATABASE_URL=postgresql://postgres:[TU-PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
```

**¿Dónde conseguir esto?**
1. Ir a [Supabase Dashboard](https://supabase.com/dashboard)
2. Tu Proyecto → **Settings** → **Database**
3. En "Connection string" seleccionar **Transaction mode**
4. Copiar el string y reemplazar `[YOUR-PASSWORD]` con tu contraseña real

**Ejemplo:**
```env
DATABASE_URL=postgresql://postgres:MiPassword123@db.abcdefghijk.supabase.co:5432/postgres
```

### Paso 3: Ejecutar migraciones

```powershell
node scripts/run_migrations_direct.js
```

Este script:
- ✅ Ejecuta cada migración en orden
- ✅ Usa transacciones (si falla, hace ROLLBACK automático)
- ✅ Muestra todos los mensajes `RAISE NOTICE` de los scripts
- ✅ Genera resumen al final
- ✅ No necesita dependencias extras de Supabase

---

## 🔄 Método Alternativo: API de Supabase

Si no querés usar conexión directa a PostgreSQL:

### Paso 1: Verificar .env.local

```env
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-ID].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Paso 2: Ejecutar

```powershell
node scripts/run_migrations.js
```

**Nota:** Este método puede tener limitaciones con statements muy largos.

---

## ⚠️ Antes de Ejecutar

### 1. Hacer Backup (Opcional pero recomendado)

En Supabase Dashboard:
- **Settings** → **Database** → **Backups**
- Hacer snapshot manual

### 2. Verificar credenciales

```powershell
# Probar conexión
node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.DATABASE_URL ? '✅ DATABASE_URL configurada' : '❌ Falta DATABASE_URL')"
```

### 3. Revisar el código de las migraciones

Cada script SQL en `sql/migrations/` tiene:
- 📦 Creación de backups antes de cambios
- 🔄 Procedimientos de rollback (comentados)
- ✅ Queries de verificación al final

---

## 📊 ¿Qué hacen las migraciones?

### 001: Migrar coordinador → planta
- Renombra tipo de empresa 'coordinador' a 'planta'
- Agrega tipo 'cliente' a la constraint
- Agrega columnas: localidad, provincia, notas
- Renombra columnas en relaciones_empresa

### 002: Crear nuevas tablas
- **destinos**: Información de entrega para clientes
- **origenes**: Puntos de carga (plantas, depósitos)
- Vista **depositos**: Subset de orígenes
- Políticas RLS para cada tabla

### 003: Tablas intermedias
- **planta_transportes**: Plantas "agregan" transportes por CUIT
- **planta_origenes**: Plantas "agregan" orígenes
- **planta_destinos**: Plantas "agregan" destinos
- **ofertas_red_nodexia**: Sistema de ofertas compartidas
- **visualizaciones_ofertas**: Tracking de quién vio qué
- Triggers y funciones helper

### 004: Multi-rol
- Cambia UNIQUE constraint de usuarios_empresa
- Permite múltiples roles en misma empresa
- Trigger de validación de roles por tipo de empresa
- Funciones helper: `get_user_roles()`, `user_tiene_rol()`

### 005: Actualizar RLS
- Políticas de seguridad para todas las tablas
- Admin Nodexia: acceso total
- Plantas: ven sus relaciones
- Transportes: ven ofertas publicadas
- Clientes: solo visualización limitada

---

## 🔍 Después de Ejecutar

### Verificar en Supabase Dashboard

1. **Table Editor** → Ver nuevas tablas:
   - destinos
   - origenes
   - planta_transportes
   - planta_origenes
   - planta_destinos
   - ofertas_red_nodexia
   - visualizaciones_ofertas

2. **empresas** → Ver columna `tipo_empresa`:
   - Valores permitidos: planta, transporte, cliente
   - Registros con 'coordinador' cambiados a 'planta'

3. **usuarios_empresa** → Ver estructura:
   - UNIQUE(user_id, empresa_id, rol_interno)
   - Permite múltiples roles

4. **Authentication** → **Policies**:
   - Revisar políticas RLS creadas

### Queries de verificación

```sql
-- Ver tipos de empresa
SELECT DISTINCT tipo_empresa FROM empresas;

-- Ver constraint de tipo_empresa
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%empresas%';

-- Ver usuarios con múltiples roles
SELECT * FROM usuarios_multi_rol;

-- Ver tablas nuevas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('destinos', 'origenes', 'planta_transportes', 'ofertas_red_nodexia');
```

---

## 🆘 Troubleshooting

### Error: "password authentication failed"
- Verificar contraseña en DATABASE_URL
- Probar resetear contraseña en Supabase Dashboard

### Error: "SSL connection required"
- El script ya incluye `ssl: { rejectUnauthorized: false }`
- Verificar que tu red permita conexiones SSL

### Error: "relation already exists"
- Algunas tablas ya existen
- Revisar si ya ejecutaste las migraciones antes
- Ver procedimiento de rollback en cada script SQL

### Error: "function exec_sql does not exist"
- Normal si usás `run_migrations.js` (método API)
- Cambiar a `run_migrations_direct.js` (método PostgreSQL)

### Migración falló a mitad de camino
- Las exitosas se aplicaron correctamente
- La que falló hizo ROLLBACK
- Corregir el script SQL y volver a ejecutar

---

## 🔙 Rollback (Si necesitás deshacer)

Cada script SQL tiene un bloque comentado con rollback:

```sql
-- =============================================
-- ROLLBACK (si necesitas deshacer)
-- =============================================
-- DROP TABLE IF EXISTS nueva_tabla;
-- ALTER TABLE empresas DROP CONSTRAINT check_tipo_empresa;
-- etc...
```

Para ejecutar rollback:
1. Abrir el script SQL en Supabase SQL Editor
2. Descomentar sección ROLLBACK
3. Ejecutar solo esa parte

---

## 📞 Soporte

Si tenés problemas:
1. Verificar logs del script (muestra mensajes detallados)
2. Revisar documentación de Supabase
3. Verificar en Supabase Dashboard el estado de las tablas

---

## ✅ Checklist Final

Después de ejecutar todas las migraciones:

- [ ] 5 scripts ejecutados exitosamente
- [ ] Tabla `empresas` tiene tipo_empresa: planta/transporte/cliente
- [ ] 7 nuevas tablas creadas
- [ ] Políticas RLS aplicadas
- [ ] Frontend arranca sin errores (`npm run dev`)
- [ ] Tipos TypeScript actualizados (ya hecho en FASE 2)
- [ ] Listo para continuar con FASE 3 (Panel Admin)

