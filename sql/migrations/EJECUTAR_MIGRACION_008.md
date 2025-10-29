# 📋 INSTRUCCIONES: Ejecutar Migración 008

## ⚠️ IMPORTANTE - Ejecutar ANTES de probar

La migración 008 crea el sistema de ubicaciones (plantas, depósitos, clientes).

### Paso 1: Abrir Supabase Dashboard

1. Andá a: https://supabase.com/dashboard
2. Seleccioná tu proyecto Nodexia
3. En el menú izquierdo, click en **"SQL Editor"** (ícono <>)

### Paso 2: Ejecutar el SQL

1. Click en **"+ New query"**
2. Abrí el archivo: `sql/migrations/008_crear_ubicaciones.sql`
3. Copiá TODO el contenido
4. Pegalo en el SQL Editor de Supabase
5. Click en **"RUN"** (o presioná `Ctrl + Enter`)

### Paso 3: Verificar

Deberías ver al final:

```
✅ Migración 008 completada exitosamente
📊 Tablas creadas: ubicaciones, empresa_ubicaciones
🔐 Políticas RLS configuradas
🔍 Función de búsqueda: buscar_ubicaciones()
```

### Paso 4: Confirmar en Database

1. Andá a **"Table Editor"**
2. Verificá que existan las tablas:
   - `ubicaciones`
   - `empresa_ubicaciones`
3. Verificá que tengan datos de ejemplo (5 ubicaciones)

---

## ✅ Una vez completado

El sistema estará listo para:
- Panel de administración de ubicaciones
- Autocomplete en crear despacho
- Vinculación de empresas con ubicaciones

---

**Archivo SQL**: `sql/migrations/008_crear_ubicaciones.sql`
