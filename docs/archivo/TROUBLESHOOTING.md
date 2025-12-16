# 🔧 Guía de Resolución de Problemas - Nodexia Web

**Última actualización:** 22 de Octubre, 2025  
**Estado:** ✅ Sistema estable después de Sesión #4

Esta guía contiene soluciones a los problemas más comunes encontrados durante el desarrollo y operación del sistema.

---

## 📋 Índice de Problemas

1. [Loops Infinitos de Navegación](#1-loops-infinitos-de-navegación)
2. [Detección Incorrecta de Roles](#2-detección-incorrecta-de-roles)
3. [Performance y Carga Lenta](#3-performance-y-carga-lenta)
4. [Errores de Base de Datos](#4-errores-de-base-de-datos)
5. [Problemas de Autenticación](#5-problemas-de-autenticación)
6. [Issues de UI/UX](#6-issues-de-uiux)

---

## 1. Loops Infinitos de Navegación

### Síntoma 1.1: "Cargando tablero..." infinito
```
Síntoma: Página muestra loading spinner infinitamente
URL: /dashboard o cualquier dashboard específico
Console: Puede mostrar "Fast Refresh loop" o múltiples redirects
```

**Causa Raíz:**
- Redirect loop entre `dashboard.tsx` y dashboards específicos
- `useEffect` con dependencias que cambian en cada render
- Uso de `router.push()` que contamina el historial

**Solución:**
```typescript
// ❌ MAL - Causa loop
useEffect(() => {
  if (primaryRole === 'super_admin') {
    router.push('/admin/super-admin-dashboard');
  }
}, [primaryRole, router]); // router cambia en cada render!

// ✅ BIEN - No causa loop
const [hasRedirected, setHasRedirected] = useState(false);

useEffect(() => {
  if (!loading && primaryRole && !hasRedirected) {
    setHasRedirected(true); // Flag para evitar re-redirect
    router.replace('/admin/super-admin-dashboard'); // replace, no push
  }
}, [loading, primaryRole, hasRedirected]);
```

**Verificación:**
```bash
# 1. Limpiar localStorage
# En browser console:
localStorage.clear()

# 2. Hard refresh
Ctrl + F5 (Windows) o Cmd + Shift + R (Mac)

# 3. Verificar que dashboard.tsx sea redirector puro
# Ver: pages/dashboard.tsx (debe tener ~75 líneas)
```

---

### Síntoma 1.2: Fast Refresh Loop Warning
```
Warning: Fast Refresh had to perform a full reload due to a runtime error
```

**Causa Raíz:**
- Error en render que causa re-mount infinito
- useEffect que modifica state que es dependencia del mismo useEffect

**Solución:**
```typescript
// ❌ MAL
useEffect(() => {
  setRoles(['super_admin']); // Modifica state
}, [roles]); // Depende del state que modifica = LOOP

// ✅ BIEN
useEffect(() => {
  const fetchRoles = async () => {
    const data = await fetchFromDB();
    setRoles(data);
  };
  fetchRoles();
}, []); // Solo ejecutar una vez
```

---

## 2. Detección Incorrecta de Roles

### Síntoma 2.1: Super admin ve dashboard de coordinador
```
Usuario: admin.demo@nodexia.com
Rol esperado: super_admin
Rol detectado: coordinador o undefined
```

**Causa Raíz:**
- Usuario no existe en tabla `usuarios_empresa`
- Query usando ID incorrecto (usuarioData.id vs authUser.id)
- Timeout activando fallback a rol por defecto

**Solución Inmediata:**
```bash
# 1. Ejecutar script de verificación
node scripts/verify_and_assign_admin.js

# 2. Verificar en Supabase
SELECT * FROM usuarios_empresa 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'admin.demo@nodexia.com'
);

# Debe retornar:
# rol_interno: super_admin
# activo: true
# empresa_id: 1 (Nodexia - Sistema)
```

**Solución Permanente:**
```typescript
// En UserRoleContext.tsx
// ❌ MAL - usuarioData puede estar vacío
const { data: relacionData } = await supabase
  .from('usuarios_empresa')
  .select('rol_interno')
  .eq('user_id', usuarioData.id); // ID incorrecto!

// ✅ BIEN - usar authUser.id
const { data: relacionData } = await supabase
  .from('usuarios_empresa')
  .select('rol_interno')
  .eq('user_id', authUser.id); // ID correcto de auth
```

---

### Síntoma 2.2: Rol cambia entre navegaciones
```
Primera carga: super_admin ✅
Cambiar de página: coordinador ❌
Volver: super_admin ✅
```

**Causa Raíz:**
- Uso de `role` legacy en lugar de `primaryRole`
- Cache no persistente entre re-renders

**Solución:**
```typescript
// En componentes (Sidebar, dashboards, etc.)
// ❌ MAL
const { role } = useUserRole(); // valor legacy, puede cambiar

// ✅ BIEN
const { primaryRole } = useUserRole(); // valor calculado, estable

// En UserRoleContext
const primaryRole = roles.length > 0 ? getPrimaryRole(roles) : null;
```

---

## 3. Performance y Carga Lenta

### Síntoma 3.1: Página tarda 5-10s en cargar al volver
```
Acción: Cambiar a otra aplicación y volver a Nodexia
Resultado: Loading de 5-10 segundos
Console: Múltiples queries a Supabase
```

**Causa Raíz:**
- Sin persistencia en localStorage
- Cache muy corto (60s)
- Consultas redundantes en cada mount

**Solución (Ya Implementada):**
```typescript
// 1. localStorage persistence
const [user, setUser] = useState<User | null>(() => {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('nodexia_user');
    return cached ? JSON.parse(cached) : null;
  }
  return null;
});

// 2. Cache de 5 minutos
const CACHE_DURATION = 300000; // 5 minutos

// 3. Auto-save en localStorage
useEffect(() => {
  if (typeof window !== 'undefined') {
    if (user) localStorage.setItem('nodexia_user', JSON.stringify(user));
    if (roles.length > 0) localStorage.setItem('nodexia_roles', JSON.stringify(roles));
  }
}, [user, roles]);
```

**Verificación:**
```javascript
// En browser console
localStorage.getItem('nodexia_user') // Debe tener datos
localStorage.getItem('nodexia_roles') // Debe tener array de roles
localStorage.getItem('nodexia_lastFetch') // Debe tener timestamp
```

---

### Síntoma 3.2: Timeout de 2s activándose siempre
```
Console: ⏱️ [UserRoleContext] Timeout 2s - usando rol por defecto
```

**Causa Raíz:**
- Consultas a Supabase lentas
- Timeout muy corto

**Solución:**
```typescript
// ❌ MAL - Timeout muy corto
const timeoutId = setTimeout(() => {
  console.warn('Timeout 2s');
  setRoles(['coordinador']); // Fallback incorrecto
  setLoading(false);
}, 2000);

// ✅ BIEN - Timeout generoso, sin fallback automático
const timeoutId = setTimeout(() => {
  console.warn('Timeout 5s - manteniendo estado actual');
  setLoading(false);
  // NO cambiar roles, mantener estado actual
}, 5000);
```

---

## 4. Errores de Base de Datos

### Síntoma 4.1: "relation 'transportes' does not exist"
```
Error: relation "public.transportes" does not exist
Code: 42P01
```

**Causa Raíz:**
- Código legacy con referencias a tabla antigua que no existe

**Solución:**
```typescript
// ❌ MAL - Tabla transportes no existe
const { data } = await supabase
  .from('transportes')
  .select('*')
  .eq('disponible', true);

// ✅ BIEN - Usar tabla empresas con filtro
const { data } = await supabase
  .from('empresas')
  .select('*')
  .eq('tipo_empresa', 'transporte')
  .eq('activo', true);
```

**Búsqueda Global:**
```bash
# Buscar todas las referencias a 'transportes'
grep -r "from('transportes')" pages/ components/ lib/

# Reemplazar por empresas con filtro
```

---

### Síntoma 4.2: Foreign key constraint violation
```
Error: insert or update on table violates foreign key constraint
Detail: Key (transport_id) is not present in table "transportes"
```

**Causa Raíz:**
- Select con foreign keys que no existen
- Referencias a relaciones que no están configuradas

**Solución:**
```typescript
// ❌ MAL - Foreign keys no existen
const { data } = await supabase
  .from('despachos')
  .select(`
    *,
    transporte:transport_id(nombre),
    chofer:driver_id(nombre_completo)
  `);

// ✅ BIEN - Usar IDs directamente y consultar por separado
const { data: despachos } = await supabase
  .from('despachos')
  .select('*');

// Luego hacer queries individuales si necesitas los datos relacionados
const transportIds = despachos.map(d => d.transport_id);
const { data: transportes } = await supabase
  .from('empresas')
  .select('id, nombre')
  .in('id', transportIds);
```

---

### Síntoma 4.3: RLS Policy blocking query
```
Error: new row violates row-level security policy
Code: 42501
```

**Causa Raíz:**
- Usuario no tiene permisos según RLS policies
- Service role key no configurado en operaciones admin

**Solución:**
```typescript
// Para operaciones de usuarios normales - usar client
import { supabase } from '@/lib/supabaseClient';

// Para operaciones administrativas - usar admin client
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// ❌ MAL - user client para operación admin
const { data } = await supabase
  .from('usuarios_empresa')
  .insert({ user_id, rol_interno: 'super_admin' });

// ✅ BIEN - admin client bypassa RLS
const { data } = await supabaseAdmin
  .from('usuarios_empresa')
  .insert({ user_id, rol_interno: 'super_admin' });
```

---

## 5. Problemas de Autenticación

### Síntoma 5.1: Session expired inesperadamente
```
Error: Session not found
User: null después de refresh
```

**Causa Raíz:**
- Token JWT expirado
- localStorage corrupto
- Supabase session no refrescada

**Solución:**
```typescript
// En _app.tsx o layout principal
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_OUT') {
        // Limpiar todo
        localStorage.clear();
        router.push('/login');
      }
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refrescado exitosamente');
      }
    }
  );

  return () => subscription.unsubscribe();
}, []);
```

---

### Síntoma 5.2: Usuario existe en auth pero no en usuarios_empresa
```
Auth: Usuario existe ✅
usuarios_empresa: No existe ❌
Resultado: Sin rol, sin acceso
```

**Solución:**
```bash
# Script para sincronizar
node scripts/sync_auth_users_to_usuarios.js

# O manualmente en SQL
INSERT INTO usuarios_empresa (user_id, empresa_id, rol_interno, activo)
SELECT 
  au.id,
  1, -- Empresa sistema
  'coordinador', -- Rol por defecto
  true
FROM auth.users au
LEFT JOIN usuarios_empresa ue ON au.id = ue.user_id
WHERE ue.user_id IS NULL;
```

---

## 6. Issues de UI/UX

### Síntoma 6.1: Sidebar text cambiando
```
Inicial: "👑 Administrador del panel"
Después de navegar: "👑 Panel Admin"
```

**Causa Raíz:**
- Componente usando `role` en lugar de `primaryRole`
- Múltiples definiciones de texto en código

**Solución:**
```typescript
// En Sidebar.tsx
// ❌ MAL
const { role } = useUserRole();

// ✅ BIEN
const { primaryRole } = useUserRole();
const userRole = primaryRole; // Para compatibilidad

// Texto estandarizado
if (userRole === 'super_admin') {
  navItems = [
    { 
      name: '👑 Administrador del panel', // Siempre el mismo texto
      icon: HomeIcon, 
      href: '/admin/super-admin-dashboard' 
    },
    // ...
  ];
}
```

---

### Síntoma 6.2: Hydration mismatch
```
Warning: Text content did not match. Server: "X" Client: "Y"
Warning: Hydration failed
```

**Causa Raíz:**
- Renderizado diferente en server vs client
- Uso de datos que solo existen en client (localStorage, window, etc.)

**Solución:**
```typescript
// ✅ Usar flag de hydration
const [isHydrated, setIsHydrated] = useState(false);

useEffect(() => {
  setIsHydrated(true);
}, []);

// Mostrar placeholder mientras no está hydrated
if (!isHydrated || loading) {
  return <LoadingSpinner />;
}

// Ahora sí renderizar con datos reales
return <ActualContent />;
```

---

## 🔍 Herramientas de Debugging

### Console Logs Estructurados
```typescript
// Usar emojis para filtrado fácil
console.log('🔍 [UserRoleContext] Verificando rol...');
console.log('👑 [UserRoleContext] Super Admin confirmado');
console.log('⚠️ [UserRoleContext] Warning: ...');
console.error('❌ [UserRoleContext] Error: ...');

// Filtrar en browser console
// Solo mostrar UserRoleContext: /\[UserRoleContext\]/
// Solo errores: error
```

### React DevTools
```bash
# Verificar props de componentes
1. Abrir React DevTools
2. Seleccionar componente
3. Ver props, state, context
4. Verificar re-renders en Profiler
```

### Supabase Dashboard
```bash
# Verificar queries en tiempo real
1. Supabase Dashboard → SQL Editor
2. Ver logs en realtime
3. Ejecutar queries manuales
```

---

## 📞 Escalación

Si el problema persiste después de seguir esta guía:

1. ✅ Verificar logs en console (browser + terminal)
2. ✅ Revisar documentación en `docs/`
3. ✅ Buscar en `CHANGELOG-SESION-4.md`
4. ✅ Ejecutar scripts de verificación en `scripts/`
5. 📧 Contactar al equipo de desarrollo

---

**Última actualización:** 22 de Octubre, 2025  
**Mantenido por:** Líder de Desarrollo  
**Contribuciones:** Bienvenidas vía PR
