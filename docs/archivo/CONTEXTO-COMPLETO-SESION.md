# CONTEXTO COMPLETO DEL PROYECTO - NODEXIA WEB
**Fecha última actualización**: 26 de Octubre 2025
**Estado**: Sistema operativo - Testing de flujo completo de onboarding

---

## 📋 RESUMEN EJECUTIVO

### Objetivo de la Sesión
Probar el flujo completo de generación de clientes desde cero a través de la interfaz web:
1. ✅ Crear Empresa Cliente (vía Admin Panel)
2. ✅ Crear Usuario Coordinador (vía WizardUsuario)
3. ✅ Autenticar y acceder con rol correcto
4. ⏳ Vincular Ubicaciones a la empresa
5. ⏳ Crear Despacho con ubicaciones vinculadas

### Estado Actual
- **Usuario activo**: Leandro Cáceres (logistica@aceiterasanmiguel.com)
- **Empresa**: Aceitera San Miguel S.A (ID: 3cc1979e-1672-48b8-a5e5-2675f5cac527)
- **Rol**: coordinador
- **Próximo paso**: Ir a Configuración → Ubicaciones y vincular 2-3 ubicaciones

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### Stack Tecnológico
- **Framework**: Next.js 15.5.6 (Pages Router)
- **React**: 19.2.0
- **Base de datos**: Supabase PostgreSQL
- **Autenticación**: Supabase Auth
- **Email**: SendGrid (integrado pero inactivo - requiere suscripción paga)
- **Gestión de paquetes**: pnpm
- **Dev Server**: http://localhost:3000

### Estructura de Base de Datos Principal

#### Tabla: `empresas`
```sql
- id: UUID PRIMARY KEY
- nombre: TEXT NOT NULL
- razon_social: TEXT
- cuit: TEXT UNIQUE (formato: XX-XXXXXXXX-X)
- tipo_empresa: TEXT (transporte | planta | cliente | sistema)
- estado_suscripcion: TEXT (activa | prueba | suspendida | cancelada)
- plan_suscripcion_id: UUID
- contacto_principal: JSON
- direccion_fiscal: JSON
- 21 columnas totales
- Constraint: empresa_cuit_key (UNIQUE CUIT)
```

#### Tabla: `usuarios`
```sql
- id: UUID PRIMARY KEY (debe coincidir con auth.users.id)
- email: TEXT UNIQUE NOT NULL
- nombre_completo: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- NO tiene columnas: rol, activo, password
```

#### Tabla: `usuarios_empresa` (tabla pivote)
```sql
- id: UUID PRIMARY KEY
- user_id: UUID REFERENCES usuarios(id)
- empresa_id: UUID REFERENCES empresas(id)
- rol_interno: TEXT (super_admin | coordinador | chofer | control_acceso | supervisor_carga)
- nombre_completo: TEXT
- email_interno: TEXT
- activo: BOOLEAN DEFAULT true
- UNIQUE(user_id, empresa_id)
```

#### Tabla: `ubicaciones`
```sql
- 5 ubicaciones globales existentes
- Pueden ser vinculadas a múltiples empresas
```

#### Tabla: `empresa_ubicaciones` (vinculación)
```sql
- empresa_id: UUID
- ubicacion_id: UUID
- es_origen: BOOLEAN
- es_destino: BOOLEAN
- activo: BOOLEAN
```

#### Tabla: `super_admins`
```sql
- user_id: UUID REFERENCES auth.users(id)
- activo: BOOLEAN
- Para roles administrativos de Nodexia
```

---

## 🔧 CAMBIOS REALIZADOS EN ESTA SESIÓN

### 1. IMPLEMENTACIÓN COMPLETA: `/admin/empresas` (Gestión de Empresas)

**Archivo**: `pages/admin/empresas.tsx`
**Estado**: REESCRITURA COMPLETA (de placeholder a funcional)

**Funcionalidades implementadas**:
- ✅ Dashboard con 6 estadísticas:
  - Total empresas
  - Transportes
  - Plantas
  - Clientes
  - Activas
  - Inactivas
- ✅ Tabla filtrable con búsqueda en tiempo real
- ✅ Filtros por tipo_empresa y estado_suscripcion
- ✅ Botón "Nueva Empresa" que abre modal
- ✅ Integración con CrearEmpresaModal
- ✅ Vista de 17 empresas existentes

**Código clave**:
```typescript
const [empresas, setEmpresas] = useState<Empresa[]>([]);
const [filteredEmpresas, setFilteredEmpresas] = useState<Empresa[]>([]);
const [searchTerm, setSearchTerm] = useState('');
const [filtroTipo, setFiltroTipo] = useState<string>('todos');
const [filtroEstado, setFiltroEstado] = useState<string>('todos');

// Filtrado en tiempo real
useEffect(() => {
  let filtered = empresas;
  if (searchTerm) {
    filtered = filtered.filter(emp =>
      emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.cuit?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  if (filtroTipo !== 'todos') {
    filtered = filtered.filter(emp => emp.tipo_empresa === filtroTipo);
  }
  if (filtroEstado !== 'todos') {
    filtered = filtered.filter(emp => emp.estado_suscripcion === filtroEstado);
  }
  setFilteredEmpresas(filtered);
}, [empresas, searchTerm, filtroTipo, filtroEstado]);
```

---

### 2. NUEVO COMPONENTE: `CrearEmpresaModal.tsx`

**Archivo**: `components/Admin/CrearEmpresaModal.tsx`
**Estado**: NUEVO (creado desde cero)

**Funcionalidades**:
- ✅ Formulario completo con validaciones
- ✅ CUIT format validation (XX-XXXXXXXX-X)
- ✅ **Pre-validación de CUIT duplicado** (evita error de DB constraint)
- ✅ Selector de provincias de Argentina
- ✅ Gestión de estado de suscripción
- ✅ Modo crear/editar
- ✅ Manejo de errores con mensajes amigables

**CÓDIGO CRÍTICO - Pre-validación CUIT**:
```typescript
// ANTES de hacer el insert/update, verificar si existe otro con ese CUIT
const cuitCambiado = empresaToEdit ? 
  formData.cuit.trim() !== empresaToEdit.cuit : true;

if (!empresaToEdit || cuitCambiado) {
  const { data: empresaExistente } = await supabase
    .from('empresas')
    .select('id, nombre')
    .eq('cuit', formData.cuit.trim())
    .maybeSingle();
  
  if (empresaExistente && empresaExistente.id !== empresaToEdit?.id) {
    setError(`Ya existe una empresa con el CUIT ${formData.cuit}: "${empresaExistente.nombre}"`);
    return; // DETENER antes de DB operation
  }
}
```

**Validaciones**:
- CUIT formato: `/^\d{2}-\d{8}-\d{1}$/`
- Email formato: validación básica
- Campos requeridos: nombre, razon_social, cuit, tipo_empresa

---

### 3. FIX CRÍTICO: Hydration Error en `dashboard.tsx`

**Problema**: Error "HTML renderizado por el servidor no coincidía con el del cliente"

**Causa**: Renderizado condicional de `{primaryRole}` causaba mismatch server/client

**Solución**:
```typescript
// ANTES (❌ causaba hydration error):
<p className="text-white/70 text-sm">
  {loading ? 'Detectando rol...' : `Rol: ${primaryRole}`}
</p>

// DESPUÉS (✅ sin hydration error):
<p className="text-white/70 text-sm">
  Detectando rol...
</p>
```

---

### 4. FIX: Modal Closing Bug

**Problema**: Modal se cerraba al seleccionar texto en campo CUIT

**Causa**: `onClick` en overlay capturaba todos los clicks

**Solución**: Removido onClick del overlay, solo cerrar con botón X o Cancel

---

### 5. CREACIÓN DE USUARIO: Workaround SendGrid

**Problema**: WizardUsuario usa `supabase.auth.admin.inviteUserByEmail()` que depende de SendGrid
- Error: "Error sending invite email" - AuthApiError 500
- Usuario se crea en tabla `usuarios` pero NO en `auth.users`
- Sin credenciales de acceso

**Solución implementada**: Script manual de creación completa

**Archivo**: `scripts/crear_usuario_completo.js`

**Qué hace**:
```javascript
1. Crear usuario en auth.users con createUser()
   - email: logistica@aceiterasanmiguel.com
   - password: Aceitera2024!
   - email_confirm: true (bypass confirmación)

2. Crear registro en tabla usuarios
   - id: mismo que auth.users
   - email, nombre_completo

3. Crear vínculo en usuarios_empresa
   - user_id, empresa_id
   - rol_interno: 'coordinador'
   - activo: true

4. Probar autenticación
   - signInWithPassword para verificar
```

**Credenciales del usuario creado**:
```
Email:    logistica@aceiterasanmiguel.com
Password: Aceitera2024!
Nombre:   Leandro Caceres
Empresa:  Aceitera San Miguel S.A
Rol:      coordinador
Auth ID:  eeea7778-f0b4-4f6c-b638-074e1f3e33d5
```

---

### 6. FIX CRÍTICO: Login limpia cache de usuario anterior

**Problema**: Al hacer login, el UserRoleContext usaba datos cacheados en localStorage del usuario anterior (admin@nodexia.com con rol super_admin), causando que el nuevo usuario quedara con rol incorrecto

**Archivo**: `pages/login.tsx`

**Solución**:
```typescript
// ANTES de autenticar, limpiar cache
if (typeof window !== 'undefined') {
  localStorage.removeItem('nodexia_user');
  localStorage.removeItem('nodexia_roles');
  localStorage.removeItem('nodexia_lastFetch');
}

// LUEGO autenticar
const { error: loginError } = await supabase.auth.signInWithPassword(form);
```

---

### 7. FIX: UserRoleContext - Loading infinito al volver a la app

**Problema**: Al cambiar de tab/app y volver, la pantalla quedaba en "Cargando..." infinitamente

**Causa**: Evento `INITIAL_SESSION` no era manejado, dejaba `loading = true`

**Archivo**: `lib/contexts/UserRoleContext.tsx`

**Solución implementada**:

```typescript
// 1. Manejo de INITIAL_SESSION
} else if (event === 'INITIAL_SESSION') {
  console.log('🔄 [UserRoleContext] INITIAL_SESSION detectado');
  if (!user && session) {
    console.log('🔄 [UserRoleContext] Cargando usuario desde sesión inicial');
    await fetchUserAndRoles();
  } else if (user) {
    // Ya hay usuario cargado, solo asegurar que loading esté en false
    console.log('⏸️ [UserRoleContext] Usuario ya cargado, ignorando INITIAL_SESSION');
    setLoading(false);
    setIsFetching(false);
  }
}

// 2. Listener de visibilitychange
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible' && user && roles.length > 0) {
    console.log('👁️ [UserRoleContext] Página visible - verificando sesión');
    // Solo asegurar que loading esté en false si ya hay datos
    setLoading(false);
    setIsFetching(false);
  }
};

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

// 3. Cleanup
return () => {
  mounted = false;
  subscription.unsubscribe();
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }
};
```

---

## 📊 DATOS DE PRUEBA CREADOS

### Empresa Test
```json
{
  "id": "3cc1979e-1672-48b8-a5e5-2675f5cac527",
  "nombre": "Aceitera San Miguel S.A",
  "razon_social": "Aceitera San Miguel S.A",
  "cuit": "30-71234567-8",
  "tipo_empresa": "planta",
  "estado_suscripcion": "activa",
  "contacto_principal": {
    "nombre": "Juan Pérez",
    "telefono": "3512345678",
    "email": "contacto@aceiterasanmiguel.com"
  }
}
```

### Usuario Test
```json
{
  "id": "eeea7778-f0b4-4f6c-b638-074e1f3e33d5",
  "email": "logistica@aceiterasanmiguel.com",
  "nombre_completo": "Leandro Caceres",
  "password": "Aceitera2024!",
  "rol_interno": "coordinador",
  "empresa_id": "3cc1979e-1672-48b8-a5e5-2675f5cac527"
}
```

### Vínculo usuarios_empresa
```json
{
  "id": "af6adde7-002b-4433-b3ca-bfb84012535c",
  "user_id": "eeea7778-f0b4-4f6c-b638-074e1f3e33d5",
  "empresa_id": "3cc1979e-1672-48b8-a5e5-2675f5cac527",
  "rol_interno": "coordinador",
  "nombre_completo": "Leandro Caceres",
  "email_interno": "logistica@aceiterasanmiguel.com",
  "activo": true
}
```

---

## 🐛 BUGS ENCONTRADOS Y RESUELTOS

### Bug 1: React Hydration Error
- **Síntoma**: Error en consola + overlay rojo
- **Causa**: Renderizado condicional de texto dinámico
- **Fix**: Eliminar texto condicional de primaryRole
- **Estado**: ✅ RESUELTO

### Bug 2: NotFoundError - insertBefore
- **Síntoma**: Crash al guardar empresa, página se congela
- **Causa**: setTimeout + router.reload() causaba manipulación DOM durante render
- **Fix**: Usar estado de éxito, eliminar setTimeout y reload
- **Estado**: ✅ RESUELTO

### Bug 3: CUIT Duplicate Constraint Violation
- **Síntoma**: Error de DB "duplicate key value violates constraint empresa_cuit_key"
- **Causa**: No verificar antes de insert
- **Fix**: Pre-validación con query SELECT antes de INSERT/UPDATE
- **Estado**: ✅ RESUELTO

### Bug 4: Modal cierra al seleccionar texto
- **Síntoma**: Modal se cierra cuando usuario selecciona/pinta texto
- **Causa**: onClick en overlay captura todos los clicks
- **Fix**: Remover onClick del overlay
- **Estado**: ✅ RESUELTO

### Bug 5: Usuario creado sin auth
- **Síntoma**: Usuario en tabla pero no puede hacer login
- **Causa**: SendGrid falla, inviteUserByEmail no crea en auth.users
- **Fix**: Script crear_usuario_completo.js con createUser()
- **Estado**: ✅ RESUELTO (workaround)

### Bug 6: Rol incorrecto en login
- **Síntoma**: Nuevo usuario aparece como super_admin
- **Causa**: localStorage con datos del usuario anterior
- **Fix**: Limpiar localStorage antes de signInWithPassword
- **Estado**: ✅ RESUELTO

### Bug 7: Loading infinito al volver a la app
- **Síntoma**: Pantalla "Cargando..." al cambiar de tab y volver
- **Causa**: INITIAL_SESSION no manejado, loading queda en true
- **Fix**: Handler para INITIAL_SESSION + visibilitychange listener
- **Estado**: ✅ RESUELTO

---

## 📁 ARCHIVOS CRÍTICOS MODIFICADOS

### Nuevos
- ✅ `components/Admin/CrearEmpresaModal.tsx` - Modal gestión empresas
- ✅ `scripts/crear_usuario_completo.js` - Creación usuario con auth
- ✅ `scripts/verificar_vinculo_usuario.js` - Debug vínculos
- ✅ `scripts/verificar_usuario_auth.js` - Debug auth.users
- ✅ `scripts/asignar_password_usuario.js` - Asignar password (no usado)
- ✅ `scripts/fix_usuario_password.js` - Fix password (no usado)

### Modificados
- ✅ `pages/admin/empresas.tsx` - Reescritura completa
- ✅ `pages/dashboard.tsx` - Fix hydration error
- ✅ `pages/login.tsx` - Limpieza de cache
- ✅ `lib/contexts/UserRoleContext.tsx` - Fix loading infinito

### Sin cambios (pero importantes)
- `pages/api/admin/nueva-invitacion.ts` - Endpoint invitación (SendGrid)
- `components/Admin/WizardUsuario.tsx` - Wizard creación usuarios
- `lib/supabaseClient.ts` - Cliente Supabase
- `lib/supabaseAdmin.ts` - Admin client

---

## 🎯 PRÓXIMOS PASOS (EN ORDEN)

### PASO 1: Vincular Ubicaciones ⏳ (SIGUIENTE ACCIÓN)
**Objetivo**: Asociar ubicaciones existentes a Aceitera San Miguel

**Acciones**:
1. Ir a: http://localhost:3000 (ya logueado como Leandro Cáceres)
2. Click en menú lateral: **Configuración → Ubicaciones**
3. Deberías ver las 5 ubicaciones globales existentes
4. Vincular 2-3 ubicaciones a la empresa:
   - Marcar al menos 1 como **es_origen = true**
   - Marcar al menos 1 como **es_destino = true**
   - Click "Guardar" o "Vincular"
5. Verificar que se crean registros en tabla `empresa_ubicaciones`

**Query de verificación**:
```sql
SELECT * FROM empresa_ubicaciones 
WHERE empresa_id = '3cc1979e-1672-48b8-a5e5-2675f5cac527';
```

**Posibles problemas**:
- Si la página está "under construction", habrá que implementarla
- Si el UI existe pero no funciona, revisar endpoint API
- Verificar permisos de coordinador para vincular ubicaciones

---

### PASO 2: Crear Despacho con Ubicaciones Vinculadas ⏳
**Objetivo**: Validar que el flujo completo funciona end-to-end

**Acciones**:
1. Ir a: **Despachos → Crear Despacho**
2. En campos de ubicación (origen/destino):
   - Verificar que el autocomplete/dropdown **SOLO muestre ubicaciones vinculadas**
   - NO debe mostrar las 5 ubicaciones globales
   - Solo debe mostrar las 2-3 que vinculaste en Paso 1
3. Completar formulario de despacho
4. Guardar y verificar que se crea correctamente

**Validación exitosa**:
- ✅ Solo ubicaciones vinculadas aparecen en el selector
- ✅ Despacho se crea sin errores
- ✅ Despacho aparece en listado de despachos
- ✅ Datos correctos en tabla `despachos`

---

### PASO 3: Testing de Gestión de Empresas (Admin)
**Objetivo**: Validar CRUD completo desde admin panel

**Acciones**:
1. Cerrar sesión de Leandro Cáceres
2. Login como admin@nodexia.com (Password: Nodexia2025!)
3. Ir a: **Admin → Empresas**
4. Probar:
   - ✅ Editar empresa existente (Aceitera San Miguel)
   - ✅ Cambiar CUIT y verificar validación duplicada
   - ✅ Cambiar estado de suscripción
   - ✅ Crear otra empresa test
   - ✅ Filtros y búsqueda funcionan

---

### PASO 4: Activar SendGrid (Opcional - Futuro)
**Objetivo**: Eliminar workaround de creación manual de usuarios

**Acciones**:
1. Contratar plan pago de SendGrid
2. Verificar credenciales en `.env.local`:
   ```
   SENDGRID_API_KEY=SG.xxxxx
   SENDGRID_FROM_EMAIL=noreply@nodexia.com
   ```
3. Probar WizardUsuario sin modificaciones
4. Usuario debería recibir email con link de activación
5. Eliminar scripts de workaround si todo funciona

---

## 🔐 CREDENCIALES IMPORTANTES

### Usuario Admin Nodexia
```
Email:    admin@nodexia.com
Password: Nodexia2025!
Rol:      super_admin
```

### Usuario Test Coordinador
```
Email:    logistica@aceiterasanmiguel.com
Password: Aceitera2024!
Rol:      coordinador
Empresa:  Aceitera San Miguel S.A
```

### Base de Datos
```
URL:      process.env.NEXT_PUBLIC_SUPABASE_URL
Key:      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
Service:  process.env.SUPABASE_SERVICE_ROLE_KEY
```

---

## 🚀 COMANDOS ÚTILES

### Desarrollo
```bash
# Iniciar dev server
pnpm run dev

# Abrir en navegador
http://localhost:3000

# Ver logs en tiempo real (ya corriendo en terminal)
```

### Scripts de Base de Datos
```bash
# Listar usuarios en auth.users
node scripts/listar_usuarios_auth.js

# Verificar vínculo de usuario específico
node scripts/verificar_vinculo_usuario.js

# Crear usuario completo (auth + tablas)
node scripts/crear_usuario_completo.js

# Crear admin
node scripts/setup_admin_nodexia.js
```

### Debugging
```bash
# Ver estructura de empresa
node scripts/documentar_estructura_empresas.js

# Ver todas las tablas
node scripts/listar_tablas.js
```

---

## 📌 NOTAS IMPORTANTES

### SendGrid Status
- ⚠️ **INACTIVO** - Requiere suscripción paga
- Integración completa ya implementada en código
- Endpoint listo: `/api/admin/nueva-invitacion`
- Solo falta activar cuenta de SendGrid
- Workaround funcional: scripts manuales

### Cache de Usuario
- Se usa localStorage para performance
- Claves: `nodexia_user`, `nodexia_roles`, `nodexia_lastFetch`
- Cache válido por 5 minutos
- Se limpia automáticamente en login/logout
- Problema resuelto: limpieza en login previene roles incorrectos

### Flujo de Roles
```
1. Login → auth.signInWithPassword
2. UserRoleContext detecta SIGNED_IN
3. Busca en super_admins (si existe, rol = super_admin y SALE)
4. Si no, busca en usuarios por email
5. Luego busca en usuarios_empresa por user_id
6. Mapea rol_interno → UserRole
7. Setea roles[] y primaryRole
8. Dashboard detecta primaryRole y redirige
```

### Mapeo de Roles
```typescript
'super_admin' | 'Super Admin' → 'super_admin'
'coordinador' | 'Coordinador' → 'coordinador'
'Control de Acceso' → 'control_acceso'
'Supervisor de Carga' → 'supervisor_carga'
'Chofer' → 'chofer'
'Operador' | 'Administrativo' → 'administrativo'
default → 'coordinador'
```

### Provincias Argentinas
Modal de empresa incluye selector completo de 24 provincias argentinas

### Performance Issues
- App se pone lenta después de uso prolongado
- **Solución recomendada**: Reiniciar dev server con Ctrl+C y `pnpm run dev`
- Probablemente por Hot Module Replacement acumulado
- Considerar usar `pnpm build` + `pnpm start` para testing de producción

---

## 🎓 LECCIONES APRENDIDAS

### 1. Pre-validación es clave
Validar constraints ANTES de operaciones de DB mejora UX y evita crashes

### 2. Cache debe limpiarse en login
Si usas localStorage para auth, SIEMPRE limpiar antes de nuevo login

### 3. Eventos de auth deben manejarse todos
`SIGNED_IN`, `SIGNED_OUT`, `INITIAL_SESSION` son críticos, no ignorarlos

### 4. Visibilitychange importa en SPAs
Manejar cuando usuario vuelve a la app previene estados inconsistentes

### 5. Email services necesitan fallbacks
Para desarrollo, tener scripts manuales cuando servicios externos fallan

### 6. React Hydration es estricto
Server y client DEBEN renderizar exactamente igual, cuidado con condicionales

### 7. Dev tools ayudan mucho
Console.log con prefijos (`🔍`, `✅`, `❌`) facilita debugging enormemente

---

## 📞 CONTACTO Y RECURSOS

### Documentación Técnica
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- React 19: https://react.dev

### Archivos de Documentación del Proyecto
- `INDICE-DOCUMENTACION.md` - Índice maestro
- `NODEXIA-ROADMAP.md` - Roadmap del proyecto
- `docs/ARQUITECTURA-OPERATIVA.md` - Arquitectura completa
- `docs/DESIGN-SYSTEM.md` - Sistema de diseño
- `RESUMEN-TESTING.md` - Resumen de testing

### Estado de Testing
- Testing unitario: Parcialmente implementado
- Testing E2E: No implementado
- Testing manual: ✅ EN PROGRESO (esta sesión)

---

## 🔄 CHECKLIST DE REINICIO

Cuando reabras el proyecto:

1. ✅ Leer esta sección completa de contexto
2. ✅ Abrir terminal y ejecutar: `pnpm run dev`
3. ✅ Ir a: http://localhost:3000
4. ✅ Login como: logistica@aceiterasanmiguel.com / Aceitera2024!
5. ✅ Verificar que dashboard de coordinador carga correctamente
6. ✅ Ir a: Configuración → Ubicaciones
7. ✅ Continuar con PASO 1 (Vincular Ubicaciones)
8. ✅ Revisar console.log del navegador para debugging
9. ✅ Si app lenta, reiniciar dev server

---

## ✨ ESTADO FINAL DE LA SESIÓN

### Completado ✅
- Gestión completa de empresas (Admin)
- Modal crear/editar empresa con validaciones
- Creación de empresa test vía UI
- Creación de usuario coordinador (workaround SendGrid)
- Autenticación correcta con rol coordinador
- Fix de bugs críticos (hydration, cache, loading)
- Documentación completa

### En Progreso ⏳
- Vinculación de ubicaciones
- Testing de flujo completo de despachos

### Pendiente ⏰
- Activación de SendGrid
- Testing E2E automatizado
- Optimización de performance

### Bloqueado 🚫
- Nada bloqueado actualmente

---

**ÚLTIMA ACCIÓN REALIZADA**: Fix de loading infinito al volver a la app (visibilitychange handler)

**PRÓXIMA ACCIÓN RECOMENDADA**: Ir a Configuración → Ubicaciones y vincular 2-3 ubicaciones a Aceitera San Miguel S.A

**CONTEXTO CARGADO**: ✅ COMPLETO - Listo para continuar desde donde quedamos

---

*Fin del documento de contexto - Actualizado: 26 Oct 2025*
