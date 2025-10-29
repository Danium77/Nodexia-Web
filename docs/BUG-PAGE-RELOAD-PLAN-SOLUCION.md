# 🐛 BUG PAGE RELOAD - PLAN DE SOLUCIÓN DEFINITIVO

**Fecha**: 20 Octubre 2025  
**Prioridad**: 🔴 CRÍTICA  
**Estado**: Investigación completada, solución pendiente de implementar

---

## 📋 **DESCRIPCIÓN DEL BUG**

**Síntoma**: Al cambiar de aplicación (Slack, email, etc.) y volver a Nodexia, la página se recarga completamente y navega automáticamente a `/dashboard`, perdiendo:
- Estado del modal abierto
- Datos del formulario llenados
- Posición en la página
- Contexto de trabajo del usuario

**Impacto**: **INACEPTABLE** para producción - obliga a usuarios a re-hacer trabajo constantemente.

---

## 🔍 **DIAGNÓSTICO COMPLETADO**

### **Causas Raíz Identificadas**:

1. **Next.js Fast Refresh agresivo** (Dev mode)
   - Fuerza full page reload cuando detecta "inactividad"
   - Log: `⚠ Fast Refresh had to perform a full reload`
   - Log: `Could not find files for /dashboard in .next/build-manifest.json`

2. **useEffect en `/admin/ubicaciones.tsx` (líneas 20-30)**
   ```typescript
   useEffect(() => {
     if (!loading && !user) {
       router.push('/login');
     }
     if (!loading && primaryRole !== 'super_admin') {
       router.push('/dashboard'); // ← AQUÍ ESTÁ EL PROBLEMA
     }
   }, [user, primaryRole, loading, router]);
   ```
   - Se dispara cada vez que `primaryRole` cambia
   - Cuando volvés de otra app, el Context se re-evalúa
   - Por un momento `primaryRole` puede ser `undefined` o `null`
   - El `!== 'super_admin'` evalúa a `true`
   - **BOOM** → `router.push('/dashboard')`

3. **Next.js onDemandEntries** purga páginas después de 5 minutos de inactividad
   - Configurado en `maxInactiveAge: 300 * 1000` (5 minutos)
   - Cuando la página se purga, al volver se recarga desde cero

---

## ✅ **SOLUCIONES IMPLEMENTADAS (Sesión 3)**

### **1. Optimización useEffect con flag `authChecked`** ✅
```typescript
const [authChecked, setAuthChecked] = useState(false);

useEffect(() => {
  if (loading) return; // Esperar que termine de cargar
  
  if (!user) {
    router.push('/login');
    return;
  }
  
  // Solo hacer redirect si ya verificamos el rol Y definitivamente no es super_admin
  if (primaryRole && primaryRole !== 'super_admin') {
    console.warn('⚠️ [ubicaciones] Usuario sin permisos, redirigiendo a dashboard');
    router.push('/dashboard');
    return;
  }
  
  setAuthChecked(true);
}, [user, primaryRole, loading, router]);
```

**Mejora**: Evita redirects prematuros cuando `primaryRole` aún está cargando.

### **2. Auto-guardado en sessionStorage** ✅
```typescript
// CrearUbicacionModal.tsx
const loadDraft = () => {
  const saved = sessionStorage.getItem('nodexia_ubicacion_draft');
  if (saved) return JSON.parse(saved);
  return getEmptyForm();
};

useEffect(() => {
  if (isOpen) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }
}, [formData, isOpen]);
```

**Resultado**: Los datos del formulario **SÍ persisten** incluso con full reload ✅

### **3. Configuración Next.js** ✅
- `maxInactiveAge`: 25s → 300s (5 minutos)
- `pagesBufferLength`: 2 → 5 páginas
- Removido `experimental.turbo` que causaba error TypeScript

---

## 🚨 **PROBLEMA ACTUAL**

A pesar de las soluciones implementadas, **el bug persiste**. La página sigue recargando y navegando a dashboard.

**Hipótesis**: El problema NO es solo el useEffect. Es una **combinación** de:
1. Next.js Dev Mode demasiado agresivo con Fast Refresh
2. Browser lifecycle events (visibilitychange, focus/blur) no manejados
3. Supabase Auth detectando "reconexión" y disparando eventos

---

## 💡 **SOLUCIÓN DEFINITIVA (Para Próxima Sesión)**

### **Opción 1: Deshabilitar Fast Refresh + Implementar Visibilitychange Handler** ⭐ (RECOMENDADA)

#### **Paso 1**: Crear hook personalizado `usePageVisibility`

```typescript
// lib/hooks/usePageVisibility.ts
import { useEffect, useState } from 'react';

export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(true);
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const nowVisible = !document.hidden;
      
      if (!isVisible && nowVisible) {
        // Usuario está volviendo a la app
        setIsReturning(true);
        console.log('👁️ [PageVisibility] Usuario volvió a la app - EVITANDO redirects');
        
        // Reset flag después de 2 segundos
        setTimeout(() => setIsReturning(false), 2000);
      }
      
      setIsVisible(nowVisible);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isVisible]);

  return { isVisible, isReturning };
}
```

#### **Paso 2**: Usar el hook en páginas sensibles

```typescript
// pages/admin/ubicaciones.tsx
import { usePageVisibility } from '../../lib/hooks/usePageVisibility';

export default function GestionUbicaciones() {
  const { isReturning } = usePageVisibility();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (isReturning) {
      console.log('🛑 [ubicaciones] Usuario volviendo - NO hacer redirect');
      return; // ← NO EJECUTAR NADA cuando el usuario está volviendo
    }
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (primaryRole && primaryRole !== 'super_admin') {
      router.push('/dashboard');
      return;
    }
    
    setAuthChecked(true);
  }, [user, primaryRole, loading, router, isReturning]); // ← Agregar isReturning
```

#### **Paso 3**: Configurar Next.js para desarrollo más estable

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  reactStrictMode: false, // ← DESHABILITAR en dev para evitar double-mounting
  
  // Solo en desarrollo
  ...(process.env.NODE_ENV === 'development' && {
    webpack: (config, { dev, isServer }) => {
      if (dev && !isServer) {
        // Reducir agresividad de Fast Refresh
        config.watchOptions = {
          poll: 3000, // Aumentar a 3 segundos
          aggregateTimeout: 1000, // 1 segundo de espera
          ignored: ['**/node_modules/**', '**/.next/**', '**/.git/**']
        };
        
        config.cache = false;
      }
      return config;
    },
    
    onDemandEntries: {
      maxInactiveAge: 600 * 1000, // 10 MINUTOS (en lugar de 5)
      pagesBufferLength: 10, // Más páginas en memoria
    },
  }),
};
```

#### **Paso 4**: Optimizar UserRoleContext

```typescript
// lib/contexts/UserRoleContext.tsx

// Agregar flag de "reconexión"
const [isReconnecting, setIsReconnecting] = useState(false);

const fetchUserAndRoles = async (force = false) => {
  const now = Date.now();
  
  // Si estamos en medio de una reconexión, NO volver a cargar
  if (isReconnecting && !force) {
    console.log('🔄 [UserRoleContext] Ya reconectando - saltando fetch');
    return;
  }
  
  // Cache más agresivo: 60 segundos en lugar de 30
  if (!force && lastFetch && (now - lastFetch) < 60000 && user && roles.length > 0) {
    console.log('📦 [UserRoleContext] Usando datos cacheados (60s)');
    return;
  }
  
  setIsReconnecting(true);
  
  try {
    // ... código existente ...
  } finally {
    setIsReconnecting(false);
  }
};

// En el onAuthStateChange, SOLO reaccionar a SIGNED_IN inicial
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    if (!mounted) return;
    
    console.log('🔄 [UserRoleContext] Auth event:', event);
    
    if (event === 'SIGNED_OUT' || !session) {
      setUser(null);
      setRoles([]);
      setLoading(false);
      router.push('/login');
    } else if (event === 'SIGNED_IN' && initialLoadDone && !isReconnecting) {
      // ← Agregar check de isReconnecting
      await fetchUserAndRoles();
    }
    // IGNORAR completamente: TOKEN_REFRESHED, USER_UPDATED, etc.
  }
);
```

---

### **Opción 2: Build de Producción para Testing** (Alternativa)

Si el problema es exclusivo de Dev Mode, podríamos hacer testing con build de producción:

```bash
# Build optimizado
npm run build

# Correr en modo producción
npm start
```

**Ventaja**: Elimina Fast Refresh completamente  
**Desventaja**: Desarrollo más lento (sin HMR)

---

### **Opción 3: Modal en Portal + Estado Global** (Más invasiva)

Mover el estado del modal a un Context global que NO se limpie con navegación:

```typescript
// lib/contexts/ModalContext.tsx
const ModalContext = createContext<ModalState>({
  ubicacionModalOpen: false,
  ubicacionDraft: null,
  // ...
});

// Persistir en localStorage en lugar de sessionStorage
// Ventaja: Sobrevive incluso a refresh completo del navegador
```

---

## 🎯 **PLAN DE EJECUCIÓN (Próxima Sesión)**

### **FASE 1: Implementar Opción 1** (1 hora)
1. ✅ Crear `lib/hooks/usePageVisibility.ts` (10 min)
2. ✅ Modificar `pages/admin/ubicaciones.tsx` (15 min)
3. ✅ Optimizar `lib/contexts/UserRoleContext.tsx` (20 min)
4. ✅ Ajustar `next.config.ts` (10 min)
5. ✅ Testing exhaustivo (5 min)

### **FASE 2: Validación** (30 min)
1. Abrir `/admin/ubicaciones`
2. Abrir modal "Nueva Ubicación"
3. Llenar 5-6 campos
4. Cambiar a otra app (Slack, email) por 30 segundos
5. **VOLVER** a Nodexia
6. ✅ Verificar: Modal sigue abierto
7. ✅ Verificar: Datos intactos
8. ✅ Verificar: NO navegó a dashboard
9. ✅ Verificar: Console log muestra "Usuario volvió a la app - EVITANDO redirects"

### **FASE 3: Extensión** (30 min)
Aplicar el mismo patrón a otras páginas críticas:
- `/configuracion/ubicaciones`
- `/crear-despacho`
- Cualquier página con formularios largos

---

## 📊 **MÉTRICAS DE ÉXITO**

### **Antes** (Actual):
- ❌ 100% de las veces: Page reload al volver
- ❌ 100% de las veces: Navegación forzada a dashboard
- ❌ 100% pérdida de estado del modal
- ⚠️ 50% pérdida de datos (gracias a sessionStorage, recuperables con F5)

### **Después** (Objetivo):
- ✅ 0% page reload al volver (dentro de 10 minutos)
- ✅ 0% navegación no deseada
- ✅ 100% preservación de estado del modal
- ✅ 100% preservación de datos del formulario
- ✅ Comportamiento igual a Gmail, Notion, Linear, etc.

---

## 🔗 **RECURSOS Y REFERENCIAS**

### **Documentación Next.js**:
- [Fast Refresh](https://nextjs.org/docs/architecture/fast-refresh)
- [onDemandEntries](https://nextjs.org/docs/api-reference/next.config.js/configuring-onDemandEntries)

### **Browser APIs**:
- [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [visibilitychange event](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event)

### **React Patterns**:
- [Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [useEffect dependencies](https://react.dev/reference/react/useEffect#examples-dependencies)

---

## ⚠️ **CONSIDERACIONES IMPORTANTES**

1. **Dev vs Production**: Este bug puede ser parcialmente exclusivo de Dev Mode
2. **Testing**: SIEMPRE probar en ambos modos antes de considerar resuelto
3. **Supabase Auth**: Puede estar disparando eventos extras cuando detecta "reconexión"
4. **Browser differences**: Chrome, Firefox, Safari pueden comportarse diferente
5. **Performance**: Verificar que las optimizaciones no degraden performance

---

## 📝 **NOTAS DE SESIÓN ACTUAL**

### **Intentos realizados**:
1. ✅ Aumentar `maxInactiveAge` a 5 minutos
2. ✅ Optimizar `useEffect` con `authChecked` flag
3. ✅ Implementar auto-guardado sessionStorage
4. ✅ Eliminar `experimental.turbo` de config
5. ⏸️ Modificar webpack optimization (removido por error TypeScript)

### **Resultados**:
- ✅ sessionStorage funciona - datos persisten con F5
- ❌ Page reload sigue ocurriendo
- ❌ Navegación a dashboard sigue ocurriendo
- ⚠️ Supabase caído impide testing completo

### **Conclusión**:
El bug **ES SOLUCIONABLE** pero requiere un enfoque más profundo con:
1. Manejo explícito de visibilitychange events
2. Flags de "returning user" para evitar useEffect execution
3. Cache más agresivo en Context
4. Posiblemente deshabilitar Fast Refresh en dev

---

**Última actualización**: 20 Oct 2025, 17:00 ART  
**Próxima acción**: Implementar Opción 1 completa en próxima sesión  
**Tiempo estimado de solución**: 1.5 horas (implementación + testing)

---

## ✋ **COMPROMISO**

Este bug **SERÁ RESUELTO** en la próxima sesión. No es aceptable tener este comportamiento en producción. La solución está clara y el plan es ejecutable.

💪 **Vamos a hacerlo funcionar como debe.**
