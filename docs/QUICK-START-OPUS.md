# QUICK START - CÓMO USAR OPUS COMO TECH LEAD

**Para:** Usuario (Product Owner)  
**Objetivo:** Guía rápida para trabajar con Opus entre sesiones

---

## ⚡ INICIO DE SESIÓN (Cada día al abrir VS Code)

### 1. Abrir VS Code en el proyecto:
```powershell
cd C:\Users\nodex\Nodexia-Web
code .
```

### 2. Abrir Copilot Chat y escribir:

```
Opus, nueva sesión. Leé .copilot/PROJECT-STATE.md y .copilot/TASKS-ACTIVE.md para cargar contexto y continuar.
```

> **¿Por qué esta frase?** Le indica exactamente qué archivos leer. Esos dos archivos referencian al resto del sistema de memoria (.copilot/DECISIONS.md, SONNET-GUIDELINES.md, WORK-LOG.md). Funciona con cualquier modelo (Opus, Sonnet, etc.).

### 3. Opus responderá con:
```
✅ Contexto cargado.
📍 Estado actual: [resumen del proyecto]
✅ Completado última sesión: [lista]
🎯 Plan para hoy: [tareas pendientes]
⏭️ Próxima tarea: [específica]

¿Procedo? O si prefieres cambiar prioridad, dime.
```

### 4. Tú respondes:
- **"Procede"** → Opus comienza con plan del día
- **"Cambiar a [X]"** → Ajusta prioridad
- **"Reportar bug: [descripción]"** → Fix inmediato

---

## 🔄 DURANTE LA SESIÓN

### Protocolo de Tareas:

#### Cuando Opus dice: "Creo TASK-XXX para Sonnet"

1. **Opus crea archivo:** `.copilot/tasks/TASK-XXX-nombre.md`

2. **Tú abres nueva ventana de Copilot/nueva conversación**

3. **Copias y pegas el contenido completo de TASK-XXX.md**

4. **Agregas al final:**
   ```
   Ejecuta esta tarea y reporta aquí el código completo generado.
   ```

5. **Sonnet responde con código**

6. **Copias la respuesta de Sonnet**

7. **Vuelves a la conversación con Opus y pegas:**
   ```
   TASK-XXX ejecutado por Sonnet:
   [pegar respuesta completa]
   ```

8. **Opus revisa y dice:**
   - ✅ "Código aprobado, aplicando..." → Se aplica automático
   - ⚠️ "Requiere ajustes: [detalles]" → Le pasas feedback a Sonnet
   - ❌ "Rechazado: [razón]" → Se descarta, Opus hace otro plan

9. **Testeas inmediatamente:**
   - ✅ "Funciona correctamente"
   - ⚠️ "Funciona pero [detalle]"
   - ❌ "Error: [descripción exacta]"

---

## 🛑 CIERRE DE SESIÓN (Antes de apagar PC)

### IMPORTANTE: Nunca cierres sin esto

```
Opus, cerrar sesión y actualizar memoria.
```

### Opus responderá:
```
✅ Sesión cerrada.

Resumen de hoy:
- ✅ Completado: [lista]
- ⏸️ En progreso: [lista]
- ⏭️ Próxima sesión: [plan]

Archivos actualizados:
- .copilot/WORK-LOG.md
- .copilot/TASKS-ACTIVE.md
- .copilot/sessions/[hoy].md
- .copilot/PROJECT-STATE.md

¡Buen trabajo! Nos vemos mañana.
```

### Entonces puedes cerrar VS Code tranquilo

---

## 📁 ARCHIVOS DE MEMORIA (No tocar manualmente)

Estos archivos se actualizan automáticamente:

```
.copilot/
├── PROJECT-STATE.md        # Estado general del proyecto
├── TASKS-ACTIVE.md         # Tareas pendientes/en progreso
├── WORK-LOG.md             # Log cronológico de trabajo
├── DECISIONS.md            # Decisiones técnicas importantes
├── sessions/
│   ├── 2026-02-08.md       # Log detallado de cada sesión
│   └── ...
└── tasks/
    ├── TASK-001-xxx.md     # Tareas para Sonnet
    └── ...
```

**Solo leer si Opus te lo pide expresamente.**

---

## 🆘 COMANDOS ÚTILES

### Reportar problema:
```
Opus, problema: [descripción específica]
```

### Cambiar prioridad:
```
Opus, priorizar [feature/bug] sobre [otra cosa]
```

### Pedir explicación:
```
Opus, explica por qué [decisión/código/arquitectura]
```

### Verificar estado:
```
Opus, ¿dónde estamos con [feature específica]?
```

### Ayuda con decisión:
```
Opus, ¿debería hacer A o B para [objetivo]?
```

### Ver plan completo:
```
Opus, mostrar roadmap MVP
```

### Ver plan post-MVP:
```
Opus, mostrar plan de profesionalización
```

---

## 🐛 TROUBLESHOOTING

### "Opus no recuerda lo que hicimos ayer"
**Solución:**
```
Opus, cargar contexto. Leer:
1. .copilot/PROJECT-STATE.md
2. .copilot/TASKS-ACTIVE.md
3. .copilot/sessions/[última fecha].md
```

### "Sonnet generó código que rompe todo"
**Solución:**
1. NO aplicar cambios
2. Reportar a Opus: "Código de Sonnet tiene problema: [detalle]"
3. Opus revisará y propondrá fix o nueva estrategia

### "No entiendo una decisión técnica"
**Solución:**
```
Opus, explica en términos simples: [concepto/decisión]
```

### "Cambió mi prioridad de negocio"
**Solución:**
```
Opus, cambio de plan. Nueva prioridad: [explicar]
```

### "Perdí mucho tiempo hoy, no avancé"
**Solución:**
```
Opus, hoy solo tengo [X] horas. ¿Qué priorizamos?
```

---

## 📅 FLUJO TÍPICO DE UN DÍA

```
08:00 - Abrir VS Code
08:05 - "Opus, nueva sesión. Cargar contexto."
08:10 - Opus propone plan del día
08:15 - "Procede"

--- Opus crea TASK-001 ---

08:20 - Abrir nueva ventana Sonnet
08:25 - Pegar TASK-001, Sonnet ejecuta
08:35 - Copiar resultado a Opus
08:40 - Opus revisa y aprueba
08:45 - Cambios aplicados

08:50 - Testing manual
09:00 - "Funciona! ¿Siguiente?"

--- Opus crea TASK-002 ---

09:05 - Repetir proceso...

---

12:00 - "Opus, pausa. Vuelvo en [X] horas."
12:05 - Opus guarda estado

14:00 - "Opus, continuar"
14:05 - Opus retoma desde donde quedó

---

17:00 - "Opus, cerrar sesión"
17:05 - Opus actualiza memoria
17:10 - Cerrar VS Code
```

---

## ✅ CHECKLIST DIARIA

### Al iniciar:
- [ ] "Opus, nueva sesión. Cargar contexto."
- [ ] Leer resumen del día
- [ ] Confirmar plan o ajustar

### Durante:
- [ ] Testear cada cambio inmediatamente
- [ ] Reportar problemas en cuanto aparezcan
- [ ] Hacer commits de git periódicos (recomendado)

### Al cerrar:
- [ ] "Opus, cerrar sesión"
- [ ] Verificar archivos de memoria actualizados
- [ ] Cerrar VS Code

---

## 🎯 RECUERDA

### ✅ SÍ hacer:
- Cargar contexto al inicio de cada sesión
- Cerrar sesión antes de apagar PC
- Testear cada cambio inmediatamente
- Reportar problemas específicos
- Preguntar si no entiendes algo

### ❌ NO hacer:
- Cerrar VS Code sin "cerrar sesión"
- Modificar archivos de .copilot/ manualmente
- Aplicar código de Sonnet sin revisión de Opus
- Trabajar sin cargar contexto primero
- Asumir que Opus "recuerda" sin cargar

---

## 🚀 LISTO PARA EMPEZAR

Ya tienes todo configurado:

1. ✅ Sistema de memoria (.copilot/)
2. ✅ Plan post-MVP completo (docs/POST-MVP-PLAN.md)
3. ✅ MVP Roadmap de 10 días (docs/MVP-ROADMAP.md)
4. ✅ Esta guía de uso

**Próxima acción:**
```
Opus, continuar con auditoría express de BD.
```

---

## 📞 EN CASO DE DUDA

**Siempre puedes preguntar:**
```
Opus, ayuda con [lo que necesites]
```

**Estoy aquí para guiarte en cada paso.** 🤝

---

**Última actualización:** 18-Feb-2026  
**Versión:** 1.1

---

## 🔒 PRINCIPIOS DE ARQUITECTURA Y SEGURIDAD (OBLIGATORIOS)

**Fecha de establecimiento:** 18-Feb-2026  
**Autoridad:** Product Owner  
**Aplicación:** Inmediata y permanente para todo desarrollo futuro

### Principios Inquebrantables:

1. **CERO bypass de RLS (`supabaseAdmin`) para servir datos a usuarios autenticados**
   - Si el usuario tiene sesión, la query DEBE pasar por RLS
   - `supabaseAdmin` solo se permite para: migraciones, webhooks externos sin sesión, cron jobs del sistema
   - Grandes plataformas (Stripe, Shopify, Linear, Notion) NO usan bypass para servir datos

2. **CERO inserts/updates directos desde frontend**
   - Siempre vía API endpoints con validación del backend
   - El frontend PRESENTA, el backend VALIDA, la BD AUTORIZA

3. **CERO parches o soluciones temporales**
   - Si algo no funciona, se arregla la raíz (RLS policies, FK, permisos)
   - Cada cambio debe MEJORAR la arquitectura, nunca degradarla

4. **Datos comunes como puente entre entidades**
   - Usar CUIT, empresa_id, ubicacion_id como relaciones verificables
   - Ejemplo: Control de Acceso ve documentación porque su empresa (CUIT) coincide con origen/destino del despacho
   - NO bypass para conectar entidades sin relación directa

5. **Separación estricta de responsabilidades:**
   - **Base de datos:** Autorización (RLS policies), integridad (constraints, FK)
   - **Backend (API routes):** Validación de negocio, orquestación
   - **Frontend (React):** Presentación, UX, llamadas a API
   - **Mobile:** Consumo de APIs, UX específica móvil

6. **Arquitectura profesional orientada a mercado**
   - Seguir patrones de grandes plataformas (Stripe, Shopify, Linear)
   - Código auditable, escalable y mantenible
   - Seguridad de datos como prioridad absoluta

### Regla de Validación Pre-Commit:

Antes de implementar cualquier cambio, verificar:
- [ ] ¿Usa `supabaseAdmin` para servir datos a un usuario autenticado? → **PROHIBIDO**
- [ ] ¿Hace insert/update directo desde frontend sin API? → **PROHIBIDO**
- [ ] ¿Es un parche que no arregla la raíz del problema? → **PROHIBIDO**
- [ ] ¿Degrada la arquitectura actual? → **PROHIBIDO**
- [ ] ¿Compromete la seguridad de datos entre empresas? → **PROHIBIDO**

### Ejemplo de Patrón Correcto (CUIT como dato común):

```
Control Acceso (usuario)
  → pertenece a empresa (CUIT: 30-12345678-9)
    → empresa tiene ubicaciones/plantas

Despacho
  → origen tiene empresa_id con CUIT
  → destino tiene empresa_id con CUIT

RLS Policy:
  SI usuario.empresa_id == ubicacion.empresa_id
  Y ubicacion.id == despacho.origen OR despacho.destino
  → PERMITIR lectura de documentos de recursos del viaje
```

### Implementación Técnica (Migration 062):

```
API Route (withAuth)
  → auth.token → createUserSupabaseClient(token)
    → Supabase client con RLS del usuario
      → get_visible_*_ids() SECURITY DEFINER functions
        → Evalúan visibilidad cross-company vía ubicaciones.empresa_id

supabaseAdmin SOLO permitido en withAuth middleware para:
  - Verificar JWT token (auth.getUser)
  - Obtener rol del usuario (usuarios_empresa)
  - Storage signed URLs (operación de backend)
```

**Archivos clave:**
- `lib/supabaseServerClient.ts` → `createUserSupabaseClient(token)`
- `lib/middleware/withAuth.ts` → `AuthContext.token`
- `sql/migrations/062_fix_rls_documentos_cross_company.sql`

