# Restauración de Campo DNI en Creación de Usuarios
**Fecha**: 19-12-2025  
**Estado**: Completado (requiere migración SQL manual)

## Problema Identificado

El modal de creación de usuarios en Admin Nodexia **NO capturaba el DNI** del usuario, lo cual es crítico porque:

1. Todos los usuarios (incluidos choferes) se crean desde Admin Nodexia
2. Los choferes necesitan ser vinculados posteriormente a la flota del transporte
3. La vinculación se realiza mediante **búsqueda por DNI**
4. Sin DNI capturado, los choferes no pueden ser vinculados a su flota

## Solución Implementada

### 1. Migración SQL (021)
**Archivo**: `sql/migrations/021_agregar_dni_usuarios_empresa.sql`

```sql
ALTER TABLE public.usuarios_empresa
ADD COLUMN IF NOT EXISTS dni TEXT;

CREATE INDEX IF NOT EXISTS usuarios_empresa_dni_idx ON public.usuarios_empresa(dni);
```

### 2. API Backend
**Archivo**: `pages/api/admin/nueva-invitacion.ts`

✅ **Interface actualizada**:
```typescript
interface NuevaInvitacionRequest {
  email: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  dni?: string;  // ← AGREGADO
  empresa_id: string;
  rol_interno: string;
  departamento?: string;
}
```

✅ **Extracción del campo**:
```typescript
const { email, nombre, apellido, telefono, dni, empresa_id, rol_interno, departamento } = req.body;
```

✅ **Guardado en usuarios_empresa**:
```typescript
const dataToInsert = {
  // ... otros campos
  dni: dni || null,  // ← AGREGADO
  // ... resto de campos
};
```

### 3. Componente Frontend
**Archivo**: `components/Admin/WizardUsuario.tsx`

✅ **Interface WizardData actualizada**:
```typescript
interface WizardData {
  empresa: string;
  rol: string;
  email: string;
  nombre_completo: string;
  telefono: string;
  dni: string;  // ← AGREGADO
  departamento: string;
  fecha_ingreso: string;
  notas: string;
}
```

✅ **Campo visual en Step 2** (Datos Personales):
```tsx
<div>
  <label className="block text-sm font-medium text-gray-300 mb-2">
    DNI
  </label>
  <input
    type="text"
    value={formData.dni}
    onChange={(e) => handleInputChange('dni', e.target.value)}
    placeholder="12345678"
    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500"
  />
  <p className="text-gray-400 text-xs mt-1">
    Necesario para vincular choferes a la flota
  </p>
</div>
```

✅ **Envío al API**:
```typescript
body: JSON.stringify({
  email: formData.email,
  nombre: nombre,
  apellido: apellido,
  telefono: formData.telefono || '',
  dni: formData.dni || '',  // ← AGREGADO
  empresa_id: formData.empresa,
  rol_interno: rolSeleccionado?.nombre_rol || 'usuario',
  departamento: formData.departamento || ''
})
```

## Flujo de Uso Esperado

1. **Admin Nodexia** crea usuario chofer:
   - Completa formulario incluyendo DNI
   - El DNI se guarda en `usuarios_empresa.dni`

2. **Empresa Transporte** vincula chofer a flota:
   - Va a Configuración > Choferes
   - Busca por DNI
   - Asocia al usuario con la flota

3. **Sistema** utiliza el DNI para:
   - Búsqueda rápida de choferes
   - Vinculación usuarios ↔ flota
   - Reportes y control de acceso

## Pasos Pendientes

### ⚠️ ACCIÓN REQUERIDA: Ejecutar Migración SQL

El usuario debe ejecutar manualmente en **Supabase SQL Editor**:

```bash
# Abrir archivo y copiar contenido
sql/migrations/021_agregar_dni_usuarios_empresa.sql

# Pegar en: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
# Ejecutar query
```

**Verificación**: Debe aparecer mensaje:
```
✅ Migración 021 completada: Campo dni agregado exitosamente
```

## Relación con Otras Tablas

| Tabla | Campo DNI | Uso |
|-------|-----------|-----|
| `usuarios_empresa` | `dni` TEXT | DNI del usuario capturado en creación |
| `choferes` | `dni` TEXT UNIQUE | DNI para vincular chofer a flota |
| `profile_users` | `dni` TEXT | DNI legacy (tabla antigua) |

## Testing

Una vez ejecutada la migración:

1. Abrir Admin Nodexia
2. Ir a Usuarios > Nuevo Usuario
3. Seleccionar empresa de tipo `transporte`
4. Seleccionar rol `Chofer`
5. Completar datos personales **incluyendo DNI**
6. Confirmar creación
7. Verificar en Supabase que `usuarios_empresa.dni` contiene el valor

## Archivos Modificados

```
✅ sql/migrations/021_agregar_dni_usuarios_empresa.sql (creado)
✅ pages/api/admin/nueva-invitacion.ts (actualizado)
✅ components/Admin/WizardUsuario.tsx (actualizado)
✅ docs/19-12-25-RESTAURACION-CAMPO-DNI.md (este documento)
```

## Contexto Histórico

Originalmente el sistema tenía más campos en la creación de usuarios:
- DNI
- Dirección
- Localidad
- Provincia

Estos campos fueron removidos en alguna refactorización anterior. Esta restauración devuelve específicamente el campo **DNI** por ser crítico para el flujo operativo de choferes.

---
**Próximos pasos después de ejecutar migración**:
- Probar creación de usuario chofer con DNI
- Verificar vinculación desde módulo de flota
- Documentar en PROXIMA-SESION.md
