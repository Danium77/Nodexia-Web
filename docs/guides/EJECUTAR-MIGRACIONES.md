# 🚀 EJECUTAR MIGRACIONES - Guía Rápida

## 🎯 MÉTODO RECOMENDADO: SQL Editor de Supabase ⭐

**✅ MÁS SEGURO - Sin exponer credenciales**

### 📖 Ver guía completa paso a paso:

👉 **[docs/guides/EJECUTAR-MIGRACIONES-SQL-EDITOR.md](docs/guides/EJECUTAR-MIGRACIONES-SQL-EDITOR.md)**

### Resumen ultra-rápido:

1. **Abrir Supabase Dashboard** → SQL Editor
2. **New Query**
3. **Copiar/Pegar** cada script SQL en orden:
   - `sql/migrations/001_migrar_coordinador_a_planta.sql`
   - `sql/migrations/002_crear_nuevas_tablas.sql`
   - `sql/migrations/003_tablas_intermedias.sql`
   - `sql/migrations/004_actualizar_usuarios_empresa.sql`
   - `sql/migrations/005_actualizar_rls_policies.sql`
4. **RUN** cada uno
5. **Verificar** mensajes ✅

**⏱️ Tiempo: 4-5 minutos**

---

## 🔄 Método Alternativo: Script Automatizado

Si preferís ejecutar desde tu máquina:

### Paso 1: Configurar DATABASE_URL

Abrir `.env.local` y agregar:

```env
DATABASE_URL=postgresql://postgres:[TU-PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
```

### ¿Dónde conseguir esto?

1. Ir a https://supabase.com/dashboard
2. Tu proyecto → **Settings** → **Database**
3. Sección **Connection string**
4. Seleccionar **Transaction mode**
5. Copiar y reemplazar `[YOUR-PASSWORD]` con tu password real

**Ejemplo:**
```
DATABASE_URL=postgresql://postgres:MiPassword123@db.abcdefghijk.supabase.co:5432/postgres
```

### Paso 2: Ejecutar migraciones

```powershell
npm run migrate
```

Este comando ejecutará automáticamente los 5 scripts SQL en orden.

---

## ✅ Después de ejecutar

- [ ] Verificar en Supabase Dashboard las nuevas tablas
- [ ] Ejecutar query de verificación (ver guía completa)
- [ ] Continuar con FASE 3 (Panel Admin Nodexia)

---

## 🆘 Si hay problemas

Ver documentación completa:
- 📄 [docs/guides/EJECUTAR-MIGRACIONES-SQL-EDITOR.md](docs/guides/EJECUTAR-MIGRACIONES-SQL-EDITOR.md)
- 📄 [sql/migrations/README.md](sql/migrations/README.md)
