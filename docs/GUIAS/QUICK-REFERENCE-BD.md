# 🎯 PROTOCOLO DE TRABAJO CON BASE DE DATOS - GUÍA RÁPIDA

> **Objetivo:** Evitar errores de inconsistencia en nombres de columnas y relaciones de tablas

---

## ⚠️ ANTES DE TOCAR QUERIES DE RECURSOS DE TRANSPORTE

### Paso 1: Leer Documentación Oficial
📖 **[ESTRUCTURA-BD-RECURSOS-TRANSPORTE.md](../ESTRUCTURA-BD-RECURSOS-TRANSPORTE.md)**

Este documento contiene:
- ✅ Nombres EXACTOS de columnas
- ✅ Estructura oficial de tablas
- ✅ Patrón de acceso correcto (Dictionary Pattern)
- ✅ Errores comunes con ejemplos
- ✅ Código de referencia que funciona

### Paso 2: Copiar Código que Funciona
NO inventar, **COPIAR** de:
- [pages/crear-despacho.tsx](../../pages/crear-despacho.tsx#L1210-L1252) - Patrón completo ⭐
- [pages/control-acceso.tsx](../../pages/control-acceso.tsx#L242-L271) - Patrón simple

### Paso 3: Verificar Nombres
```typescript
// ✅ CORRECTO
chofer_id, camion_id, acoplado_id  // En viajes_despacho
dni                                 // En choferes (NO documento)
anio                               // En camiones (NO tipo)

// ❌ INCORRECTO
id_chofer, id_camion, id_acoplado  // ❌ Orden invertido
documento                          // ❌ No existe
tipo                              // ❌ No existe
```

---

## 📋 INTEGRACIÓN CON PROTOCOLOS DE SESIÓN

### Al Iniciar Sesión
Si vas a trabajar con BD → Lee:
1. [PROTOCOLO-INICIO-SESION-COPILOT.md](../GUIAS/PROTOCOLO-INICIO-SESION-COPILOT.md)
2. [ESTRUCTURA-BD-RECURSOS-TRANSPORTE.md](../ESTRUCTURA-BD-RECURSOS-TRANSPORTE.md) ⚠️

### Al Cerrar Sesión
Si modificaste queries → Verifica:
1. [PROTOCOLO-CIERRE-SESION-COPILOT.md](../GUIAS/PROTOCOLO-CIERRE-SESION-COPILOT.md)
2. Actualiza docs si descubriste nuevas columnas

---

## 🎓 REGLA DE ORO

> **"Copiar código que funciona, NO inventar variaciones"**

- ✅ Copiar patrón de crear-despacho.tsx
- ✅ Verificar nombres en ESTRUCTURA-BD
- ✅ Agregar logs para debuggear
- ❌ NO asumir nombres de columnas
- ❌ NO improvisar queries

---

**Creado:** 01-Ene-2026  
**Parte de:** Sistema de Protocolos de Sesión Nodexia
