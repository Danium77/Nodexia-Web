# 🎯 GUÍA: Ejecutar Migraciones en SQL Editor de Supabase

## ⚠️ ANTES DE EMPEZAR

### Hacer Backup Manual (Opcional pero recomendado)
1. En Supabase Dashboard → **Settings** → **Database** → **Backups**
2. Click en "Create backup" (snapshot manual)

---

## 📋 EJECUTAR EN ORDEN

### 🔹 MIGRACIÓN 1/5: Coordinador → Planta

**Archivo:** `sql/migrations/001_migrar_coordinador_a_planta.sql`

**Qué hace:**
- ✅ Crea backup automático de tabla `empresas`
- ✅ Cambia todos los registros de 'coordinador' a 'planta'
- ✅ Actualiza constraint para aceptar: planta, transporte, cliente
- ✅ Agrega columnas: localidad, provincia, notas
- ✅ Renombra columna en `relaciones_empresa`

**Instrucciones:**
1. SQL Editor → New query
2. Copiar TODO el contenido del archivo `001_migrar_coordinador_a_planta.sql`
3. Pegar en el editor
4. Click en **RUN** (o Ctrl+Enter)
5. Verificar que aparezcan mensajes ✅ en la consola

**Mensajes esperados:**
```
✅ Backup de empresas creado: X registros
✅ Constraint anterior eliminado
✅ Migrados X registros de coordinador → planta
✅ Nuevo constraint creado: planta, transporte, cliente
✅ Columnas agregadas
🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE
📋 Siguiente paso: Ejecutar 002_crear_nuevas_tablas.sql
```

---

### 🔹 MIGRACIÓN 2/5: Crear Tablas Destinos y Orígenes

**Archivo:** `sql/migrations/002_crear_nuevas_tablas.sql`

**Qué hace:**
- ✅ Crea tabla `destinos` (puntos de entrega para clientes)
- ✅ Crea tabla `origenes` (puntos de carga: plantas, depósitos)
- ✅ Crea vista `depositos` (subset de orígenes)
- ✅ Agrega índices para búsquedas eficientes
- ✅ Configura políticas RLS
- ✅ Inserta 3 ejemplos de orígenes

**Instrucciones:**
1. SQL Editor → New query
2. Copiar TODO el contenido del archivo `002_crear_nuevas_tablas.sql`
3. Pegar en el editor
4. Click en **RUN**
5. Verificar tablas creadas en **Table Editor**

**Verificar después:**
- Table Editor → Ver tabla `destinos` (vacía por ahora)
- Table Editor → Ver tabla `origenes` (3 registros ejemplo)

---

### 🔹 MIGRACIÓN 3/5: Tablas Intermedias y Red Nodexia

**Archivo:** `sql/migrations/003_tablas_intermedias.sql`

**Qué hace:**
- ✅ Crea `planta_transportes` (plantas agregan transportes por CUIT)
- ✅ Crea `planta_origenes` (plantas agregan orígenes)
- ✅ Crea `planta_destinos` (plantas agregan destinos)
- ✅ Crea `ofertas_red_nodexia` (sistema de ofertas compartidas)
- ✅ Crea `visualizaciones_ofertas` (tracking de visualizaciones)
- ✅ Funciones: incrementar_visualizaciones(), expirar_ofertas_vencidas()
- ✅ Políticas RLS para cada tabla

**Instrucciones:**
1. SQL Editor → New query
2. Copiar TODO el contenido del archivo `003_tablas_intermedias.sql`
3. Pegar en el editor
4. Click en **RUN**

**Verificar después:**
- Table Editor → Ver las 5 nuevas tablas creadas
- Database → Functions → Ver funciones creadas

---

### 🔹 MIGRACIÓN 4/5: Multi-Rol por Usuario

**Archivo:** `sql/migrations/004_actualizar_usuarios_empresa.sql`

**Qué hace:**
- ✅ Crea backup de `usuarios_empresa`
- ✅ Elimina constraint UNIQUE(user_id, empresa_id)
- ✅ Crea nuevo UNIQUE(user_id, empresa_id, rol_interno)
- ✅ Trigger de validación de roles por tipo de empresa
- ✅ Funciones helper: get_user_roles(), user_tiene_rol()
- ✅ Vista: usuarios_multi_rol

**Instrucciones:**
1. SQL Editor → New query
2. Copiar TODO el contenido del archivo `004_actualizar_usuarios_empresa.sql`
3. Pegar en el editor
4. Click en **RUN**

**Qué permite:**
- Un usuario puede tener múltiples roles en la MISMA empresa
- Ejemplo: Juan es 'coordinador' Y 'control_acceso' en Planta ABC

---

### 🔹 MIGRACIÓN 5/5: Actualizar Políticas RLS

**Archivo:** `sql/migrations/005_actualizar_rls_policies.sql`

**Qué hace:**
- ✅ Actualiza políticas de `empresas` para nueva estructura
- ✅ Políticas para `destinos` (plantas y clientes)
- ✅ Políticas para `origenes` (todos ven activos)
- ✅ Políticas para tablas intermedias (planta_*)
- ✅ Políticas para `ofertas_red_nodexia` (transportes y plantas)
- ✅ Actualiza políticas de `despachos`
- ✅ Función helper: user_tiene_permiso()

**Instrucciones:**
1. SQL Editor → New query
2. Copiar TODO el contenido del archivo `005_actualizar_rls_policies.sql`
3. Pegar en el editor
4. Click en **RUN**

**Verificar después:**
- Authentication → Policies → Ver políticas actualizadas

---

## ✅ VERIFICACIÓN FINAL

Después de ejecutar las 5 migraciones, ejecutar esta query de verificación:

```sql
-- Verificación completa del sistema

-- 1. Verificar tipos de empresa
SELECT DISTINCT tipo_empresa, COUNT(*) 
FROM empresas 
GROUP BY tipo_empresa;

-- 2. Verificar nuevas tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'destinos', 
    'origenes', 
    'planta_transportes', 
    'planta_origenes', 
    'planta_destinos', 
    'ofertas_red_nodexia',
    'visualizaciones_ofertas'
  )
ORDER BY table_name;

-- 3. Verificar constraint de usuarios_empresa (multi-rol)
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'usuarios_empresa'
  AND constraint_type = 'UNIQUE';

-- 4. Verificar funciones creadas
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'incrementar_visualizaciones',
    'expirar_ofertas_vencidas',
    'validar_rol_por_tipo_empresa',
    'get_user_roles',
    'user_tiene_rol',
    'user_tiene_permiso'
  )
ORDER BY routine_name;

-- 5. Contar políticas RLS
SELECT 
    schemaname,
    tablename,
    COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;
```

**Resultado esperado:**
- ✅ tipo_empresa: planta, transporte, cliente
- ✅ 7 nuevas tablas creadas
- ✅ UNIQUE constraint permite múltiples roles
- ✅ 6 funciones creadas
- ✅ Múltiples políticas RLS por tabla

---

## 🆘 SI ALGO SALE MAL

### Rollback disponible en cada script

Cada archivo SQL tiene una sección comentada de ROLLBACK al final.

**Para revertir una migración:**
1. Abrir el script SQL correspondiente
2. Ir a la sección `-- ROLLBACK`
3. Descomentar esas líneas
4. Ejecutar solo esa parte

### Ejemplo (script 001):
```sql
-- Descomenta esto para revertir:
TRUNCATE TABLE empresas;
INSERT INTO empresas SELECT * FROM backup_empresas_migration;
ALTER TABLE empresas DROP CONSTRAINT empresas_tipo_empresa_check;
ALTER TABLE empresas ADD CONSTRAINT empresas_tipo_empresa_check 
  CHECK (tipo_empresa IN ('coordinador', 'transporte'));
```

---

## 📊 TIEMPO ESTIMADO

- Migración 1: ~30 segundos
- Migración 2: ~1 minuto
- Migración 3: ~1 minuto
- Migración 4: ~30 segundos
- Migración 5: ~30 segundos

**Total: ~4-5 minutos**

---

## 🎉 DESPUÉS DE COMPLETAR

1. ✅ Verificar en **Table Editor** que todas las tablas existen
2. ✅ Ejecutar query de verificación final
3. ✅ Actualizar el TODO: Marcar "Ejecutar migraciones" como completado
4. ✅ Continuar con **FASE 3: Panel Admin Nodexia**

---

## 📝 NOTAS

- Cada script crea sus propios backups automáticos
- Las transacciones protegen contra errores parciales
- Los mensajes `RAISE NOTICE` confirman cada paso
- Las políticas RLS mantienen la seguridad
- No es necesario detener el frontend

---

**¿Listo para empezar?** 🚀

Abrí Supabase Dashboard y seguí los pasos uno por uno. Cualquier error o duda, avisame!
