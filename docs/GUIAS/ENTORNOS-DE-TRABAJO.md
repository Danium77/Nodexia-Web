# 🌐 ENTORNOS DE TRABAJO - Guía Simple

**Para:** Jary (usuario no-técnico)  
**Última actualización:** 17-Ene-2026

---

## ¿Qué son los entornos?

Imagina que tienes **dos versiones** de tu aplicación:

---

## 🖥️ DESARROLLO (Dev) - Tu laboratorio

| Característica | Detalle |
|----------------|---------|
| **Dirección** | `http://localhost:3000` |
| **Dónde vive** | En tu computadora |
| **Quién lo ve** | Solo tú |
| **Para qué sirve** | Probar cambios, experimentar, romper cosas |

### Cómo acceder:
1. Abrir terminal en VS Code
2. Escribir `pnpm dev`
3. Abrir navegador en `localhost:3000`

---

## 🌐 PRODUCCIÓN (Prod) - La versión real

| Característica | Detalle |
|----------------|---------|
| **Dirección** | `www.nodexiaweb.com` |
| **Dónde vive** | En Vercel (internet) |
| **Quién lo ve** | Todos los usuarios reales |
| **Para qué sirve** | La app que usan tus clientes |

### Cómo acceder:
- Simplemente abrir `www.nodexiaweb.com` en cualquier navegador

---

## 🔄 Flujo de trabajo

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   1️⃣  Copilot hace cambios en tu computadora (DEV)     │
│                        ↓                                │
│   2️⃣  Probamos que funcione en localhost:3000          │
│                        ↓                                │
│   3️⃣  Si funciona → Subimos el código a GitHub         │
│                        ↓                                │
│   4️⃣  Vercel detecta el cambio y actualiza PROD        │
│                        ↓                                │
│   5️⃣  Verificamos en www.nodexiaweb.com                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Reglas de oro

| ✅ CORRECTO | ❌ INCORRECTO |
|-------------|---------------|
| Probar siempre en DEV primero | Hacer cambios directo en producción |
| Cambios pequeños y frecuentes | Acumular muchos cambios y subir todo junto |
| Verificar PROD después de subir | Asumir que va a funcionar |
| Preguntar si no estás seguro | Borrar cosas sin confirmar |

---

## 🚨 Si algo se rompe en producción

**No entrar en pánico.** Tenemos opciones:

1. **Rollback rápido:** Vercel puede volver a una versión anterior en 1 minuto
2. **Hotfix:** Corregir rápido en DEV y subir la corrección
3. **Investigar:** Ver qué cambio causó el problema

---

## 🔐 Variables de entorno

Son como "contraseñas secretas" que la aplicación necesita para funcionar.

| Entorno | Dónde están configuradas |
|---------|--------------------------|
| DEV | Archivo `.env.local` en tu computadora |
| PROD | Panel de Vercel → Settings → Environment Variables |

**Importante:** Las variables pueden ser DIFERENTES entre DEV y PROD.  
Por ejemplo: DEV usa una base de datos de prueba, PROD usa la real.

---

## 📊 Resumen visual

```
TU COMPUTADORA                    INTERNET
┌──────────────┐                 ┌──────────────┐
│              │    GitHub       │              │
│  DESARROLLO  │ ────────────→   │  PRODUCCIÓN  │
│  localhost   │    (código)     │  nodexiaweb  │
│              │                 │    .com      │
└──────────────┘                 └──────────────┘
      ↑                                ↑
   Solo tú                     Usuarios reales
   lo ves                         lo usan
```

---

## ❓ Preguntas frecuentes

### ¿Puedo ver producción desde mi computadora?
Sí, solo abre `www.nodexiaweb.com` en tu navegador.

### ¿Los cambios en DEV afectan a PROD?
No automáticamente. Solo cuando hacemos "commit" y "push" a GitHub.

### ¿Cuánto tarda en actualizarse producción?
Vercel tarda aproximadamente 1-3 minutos después del push.

### ¿Qué pasa si rompo algo en DEV?
Nada grave. Solo afecta tu computadora. PROD sigue funcionando.

### ¿Qué pasa si rompo algo en PROD?
Podemos volver atrás rápidamente con rollback en Vercel.

---

**Este documento es tu referencia rápida para entender cómo trabajamos con los dos entornos.**

