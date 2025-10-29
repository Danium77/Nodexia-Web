# 🔄 PROMPT PARA PRÓXIMA SESIÓN

**Copia y pega este prompt al iniciar la próxima sesión con GitHub Copilot**

---

## 📋 VERSIÓN COMPLETA (RECOMENDADA)

```
Proyecto: Nodexia Web
Fecha última sesión: 26 Octubre 2025
Branch: main

CONTEXTO RÁPIDO:
- Lee: LEER-PRIMERO-SESION-26-OCT.md (obligatorio)
- Estado: PROGRESO-ACTUAL-26-OCT.md
- Plan: CHECKLIST-PROXIMA-SESION.md

ESTADO ACTUAL:
✅ Onboarding end-to-end funcionando
✅ Sidebar colapsable implementado  
✅ Buscador en modal transporte completado
✅ FK constraints corregidos
✅ RLS policies configuradas
⚠️  1 bug menor (SQL listo para ejecutar)
⏳ Múltiples camiones esperando decisión

CREDENCIALES PRUEBA:
- Email: logistica@aceiterasanmiguel.com
- Password: Aceitera2024!
- Empresa: Aceitera San Miguel S.A

ARCHIVOS CLAVE:
- components/Modals/AssignTransportModal.tsx (buscador)
- components/layout/Sidebar.tsx (colapsable)
- pages/crear-despacho.tsx (crear despachos)
- sql/fix-medios-comunicacion.sql (pendiente ejecutar)

MI OBJETIVO HOY:
[DESCRIBE QUÉ QUIERES HACER - EJEMPLOS ABAJO]

¿Listo para continuar?
```

---

## 🎯 VERSIÓN CORTA (RÁPIDA)

```
Continuar Nodexia Web desde sesión 26 Oct 2025.

Lee: LEER-PRIMERO-SESION-26-OCT.md + PROGRESO-ACTUAL-26-OCT.md

Estado: Sistema operativo, onboarding validado, buscador implementado
Pendiente: SQL cleanup + múltiples camiones

Objetivo hoy: [TU TAREA]
```

---

## 💡 EJEMPLOS DE OBJETIVOS

Reemplaza `[DESCRIBE QUÉ QUIERES HACER]` con uno de estos:

### 1. Implementar Múltiples Camiones
```
Implementar sistema de múltiples camiones - Opción [A/B/C].
Lee también: docs/TAREAS-PENDIENTES.md sección 3.
Ayúdame con el plan de implementación paso a paso.
```

### 2. Ejecutar SQL y Testing
```
1. Ejecutar SQL para limpiar "Medios de comunicación"
2. Hacer testing end-to-end completo del flujo onboarding
3. Documentar resultados
```

### 3. Resolver Bug o Error
```
Encontré un error en [COMPONENTE/ARCHIVO].
Error: [DESCRIPCIÓN]
¿Qué puede estar causando esto según el contexto del proyecto?
```

### 4. Continuar Desarrollo
```
Continuar con las tareas de alta prioridad del checklist.
Empezar por la primera tarea pendiente.
```

### 5. Entender Arquitectura
```
Necesito entender cómo funciona [FEATURE/COMPONENTE].
Explícame la arquitectura y muéstrame el código relevante.
```

### 6. Agregar Nueva Feature
```
Agregar nueva funcionalidad: [DESCRIPCIÓN].
Revisar arquitectura actual y proponerme un plan de implementación.
```

---

## 📚 ARCHIVOS DE DOCUMENTACIÓN (POR ORDEN DE LECTURA)

### Nivel 1 - OBLIGATORIO (2 min)
1. ✅ `LEER-PRIMERO-SESION-26-OCT.md`

### Nivel 2 - RECOMENDADO (5 min)
2. ✅ `PROGRESO-ACTUAL-26-OCT.md`
3. ✅ `CHECKLIST-PROXIMA-SESION.md`

### Nivel 3 - SI NECESITAS MÁS CONTEXTO (10 min)
4. 📖 `docs/TAREAS-PENDIENTES.md`
5. 📖 `docs/SESION-2025-10-26.md`
6. 📖 `RESUMEN-ESTADO-ACTUAL.md`

### Nivel 4 - REFERENCIA COMPLETA
7. 📑 `INDICE-DOCUMENTACION.md` (índice de TODO)

---

## 🔧 COMANDOS ÚTILES AL INICIAR

```bash
# Iniciar servidor desarrollo
pnpm run dev

# Verificar tipos
pnpm type-check

# Ver branch actual
git branch

# Ver últimos commits
git log --oneline -5

# Ver archivos modificados
git status
```

---

## 🎯 CHECKLIST INICIO DE SESIÓN

Antes de empezar a codear:

- [ ] Copiar prompt de arriba
- [ ] Esperar a que GitHub Copilot lea los archivos
- [ ] Confirmar que entendió el contexto
- [ ] Definir objetivo específico de la sesión
- [ ] ¿Necesitas ejecutar SQL pendiente? (2 min)
- [ ] ¿Qué feature vas a implementar?
- [ ] Crear branch si es feature grande

---

## 💾 DATOS IMPORTANTES

### Credenciales Prueba
```
Email: logistica@aceiterasanmiguel.com
Password: Aceitera2024!
Empresa: Aceitera San Miguel S.A (CUIT: 30-71234567-8)
Transporte: Transportes Nodexia Demo (CUIT: 30-98765432-1)
```

### SQL Pendiente
```sql
-- Ejecutar en Supabase SQL Editor
-- Archivo: sql/fix-medios-comunicacion.sql

UPDATE despachos 
SET prioridad = 'Media' 
WHERE prioridad = 'Medios de comunicación';

ALTER TABLE despachos 
ADD CONSTRAINT check_prioridad 
CHECK (prioridad IN ('Baja', 'Media', 'Alta', 'Urgente'));
```

### Servidor Local
```
URL: http://localhost:3000
Comando: pnpm run dev
```

---

## 🚨 SI GITHUB COPILOT NO ENTIENDE EL CONTEXTO

Pide que lea archivos específicos:

```
Por favor lee estos archivos en orden:
1. LEER-PRIMERO-SESION-26-OCT.md
2. PROGRESO-ACTUAL-26-OCT.md
3. CHECKLIST-PROXIMA-SESION.md

Luego confirma que entendiste:
- Estado actual del proyecto
- Qué features están completas
- Qué está pendiente
- Credenciales de prueba
```

---

## 📞 CONTACTO DE EMERGENCIA

Si algo no funciona:

1. **Revisa documentación**: `INDICE-DOCUMENTACION.md`
2. **Ver errores comunes**: `.jary/TROUBLESHOOTING.md`
3. **Arquitectura**: `.jary/ARCHITECTURE.md`
4. **Changelog**: `.jary/CHANGELOG-SESION-4.md`

---

## ✨ TIPS

1. **Siempre menciona la fecha**: "26 Octubre 2025" ayuda al contexto
2. **Lee archivos en orden**: LEER-PRIMERO → PROGRESO → CHECKLIST
3. **Define objetivo claro**: Qué quieres lograr en la sesión
4. **Menciona archivos clave**: Si vas a modificar algo específico
5. **Credenciales a mano**: Para testing rápido

---

**¡Buena suerte en la próxima sesión! 🚀**

---

*Archivo creado: 26 Oct 2025*  
*Actualizar si cambia estructura de documentación*
