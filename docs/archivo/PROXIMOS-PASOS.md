# 🎯 PRÓXIMOS PASOS - Para Jary

**Última actualización**: 19 de Octubre, 2025  
**Propósito**: Saber QUÉ hacer en la próxima sesión

---

## 🚀 PRÓXIMA SESIÓN (#2)

### Objetivos de la Sesión

**Tema principal**: Seguridad y Bug Crítico  
**Tiempo estimado**: 2-3 horas  
**Prioridad**: 🔴 MÁXIMA

---

## ✅ CHECKLIST DE INICIO DE SESIÓN

Antes de empezar a trabajar:

```markdown
- [ ] Leer JARY-MEMORIA.md
- [ ] Leer JARY-CONTEXTO-NODEXIA.md
- [ ] Leer JARY-ESTADO-ACTUAL.md
- [ ] Leer JARY-PROXIMOS-PASOS.md (este archivo)
- [ ] Ejecutar: pnpm test
- [ ] Ejecutar: git status
- [ ] Saludar al usuario con estado actual
```

**Mi mensaje de inicio**:
```
Hola! Soy Jary, tu desarrollador líder.

📊 Estado actual:
- Errores TypeScript: 325
- Vulnerabilidades: 3 (Next.js desactualizado)
- Bug crítico: Asignación de transporte
- Tests: 3/3 passing ✅

🎯 Próxima tarea: Actualizar Next.js y dependencias críticas

¿Qué necesitas que haga hoy?
```

---

## 📋 TAREAS INMEDIATAS (Orden de ejecución)

### Tarea 1: Actualizar Dependencias Críticas ⚡
**Prioridad**: 🔴 CRÍTICA  
**Tiempo**: 5 minutos  
**Bloqueante**: No, pero urgente

**Comandos**:
```powershell
cd "c:\Users\nodex\Nodexia-Web"
pnpm update next@latest
pnpm update @supabase/supabase-js@latest
pnpm update eslint-config-next@latest
pnpm update react@latest
pnpm update react-dom@latest
pnpm audit
```

**Verificación**:
```powershell
pnpm test
pnpm dev
# Abrir http://localhost:3000 y verificar login
```

**Resultado esperado**:
- ✅ Next.js 15.5.6
- ✅ Supabase 2.75.1
- ✅ 0 vulnerabilidades
- ✅ Tests pasan
- ✅ App funciona

**Si hay problemas**:
1. Revisar errores en terminal
2. Verificar breaking changes en Next.js 15.5.6
3. Ajustar código si es necesario

---

### Tarea 2: Investigar Bug de Asignación de Transporte 🐛
**Prioridad**: 🔴 CRÍTICA  
**Tiempo**: 1-2 horas  
**Bloqueante**: Sí (funcionalidad principal)

**Pasos de investigación**:

1. **Leer documentación del bug**:
   ```
   - Archivo: docs/bugs/BUG-REPORT-ASIGNACION-TRANSPORTE.md
   - Entender síntomas
   - Revisar capturas/descripción
   ```

2. **Revisar código del modal**:
   ```typescript
   // Archivo: components/Modals/AssignTransportModal.tsx
   - Ver función de confirmación
   - Verificar manejo de estado
   - Buscar llamada a API
   ```

3. **Revisar API backend**:
   ```typescript
   // Buscar en pages/api/ el endpoint relacionado
   - Probablemente: pages/api/despachos/[id]/asignar-transporte.ts
   - O similar
   - Verificar que existe
   - Revisar lógica de actualización
   ```

4. **Revisar tabla despachos**:
   ```sql
   -- Verificar estructura
   SELECT * FROM despachos LIMIT 1;
   
   -- Verificar columnas
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'despachos';
   ```

5. **Reproducir el bug**:
   ```
   - Iniciar app: pnpm dev
   - Login como coordinador: coord_demo@example.com
   - Ir a crear-despacho.tsx
   - Intentar asignar transporte
   - Ver console.log para errores
   ```

**Resultado esperado**:
- Identificar causa raíz del bug
- Documentar hallazgos en JARY-NOTAS.md

---

### Tarea 3: Implementar Fix del Bug 🔧
**Prioridad**: 🔴 CRÍTICA  
**Tiempo**: 1 hora  
**Bloqueante**: Sí

**Solo ejecutar si Tarea 2 identificó la causa**

**Posibles soluciones** (depende de qué encontremos):

#### Escenario A: Falta endpoint API
```typescript
// Crear: pages/api/despachos/[id]/asignar-transporte.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { transporte_id } = req.body;

  const { data, error } = await supabaseAdmin
    .from('despachos')
    .update({ 
      transporte_id,
      estado: 'transporte_asignado'
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
}
```

#### Escenario B: Error en el modal
```typescript
// Corregir en: components/Modals/AssignTransportModal.tsx
const handleConfirm = async () => {
  setLoading(true);
  try {
    const response = await fetch(`/api/despachos/${despachoId}/asignar-transporte`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transporte_id: selectedTransporteId })
    });
    
    if (!response.ok) throw new Error('Error al asignar');
    
    // Refrescar lista
    await onSuccess();
    onClose();
  } catch (error) {
    console.error(error);
    alert('Error al asignar transporte');
  } finally {
    setLoading(false);
  }
};
```

#### Escenario C: Problema de permisos RLS
```sql
-- Verificar política en Supabase
-- Si falta, crear política para permitir UPDATE de despachos
CREATE POLICY "coordinadores_pueden_asignar_transporte" 
ON despachos 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresa 
    WHERE user_id = auth.uid() 
    AND rol_interno = 'coordinador'
  )
);
```

**Verificación**:
```
1. Probar asignación en la app
2. Verificar en DB que se guardó
3. Verificar que UI se actualiza
4. Probar múltiples veces
```

---

### Tarea 4: Crear Test para el Bug ✅
**Prioridad**: 🟡 ALTA  
**Tiempo**: 30 minutos  
**Bloqueante**: No

```typescript
// Crear: __tests__/components/Modals/AssignTransportModal.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AssignTransportModal from '@/components/Modals/AssignTransportModal';

describe('AssignTransportModal', () => {
  it('debería asignar transporte correctamente', async () => {
    // Mockear fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: '123', transporte_id: 'T1' })
      })
    ) as jest.Mock;

    const onSuccess = jest.fn();
    const onClose = jest.fn();

    render(
      <AssignTransportModal 
        isOpen={true}
        despachoId="123"
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    // Seleccionar transporte
    const transporteOption = screen.getByText(/Rápido Express/i);
    fireEvent.click(transporteOption);

    // Confirmar
    const confirmButton = screen.getByText(/Confirmar/i);
    fireEvent.click(confirmButton);

    // Verificar que llamó a la API
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/despachos/123/asignar-transporte',
        expect.objectContaining({ method: 'POST' })
      );
    });

    // Verificar que cerró y llamó onSuccess
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
```

---

## 📅 SESIONES SIGUIENTES

### Sesión #3: TypeScript - Archivos Prioritarios
**Tareas**:
1. Corregir `pages/crear-despacho.tsx` (21 errores)
2. Corregir `components/SuperAdmin/SuscripcionesManager.tsx` (22 errores)
3. Corregir `components/SuperAdmin/LogsManager.tsx` (15 errores)

**Tiempo estimado**: 2-3 horas

---

### Sesión #4: TypeScript - Limpieza de Código
**Tareas**:
1. Eliminar variables no usadas (~60 errores)
2. Agregar tipos explícitos (~20 errores)
3. Corregir imports no usados

**Tiempo estimado**: 2 horas

---

### Sesión #5: TypeScript - Correcciones Restantes
**Tareas**:
1. Corregir tipos posiblemente undefined (~40 errores)
2. Corregir propiedades inexistentes (~30 errores)
3. Validar con pnpm type-check

**Tiempo estimado**: 3 horas

---

## 🎯 METAS A CORTO PLAZO (1-2 semanas)

- [ ] 0 vulnerabilidades
- [ ] 0 bugs críticos
- [ ] < 100 errores TypeScript
- [ ] ESLint migrado
- [ ] 10 tests unitarios

---

## 🎯 METAS A MEDIANO PLAZO (3-4 semanas)

- [ ] 0 errores TypeScript
- [ ] 50% cobertura de tests
- [ ] Red Nodexia implementada
- [ ] Panel Admin completo

---

## 🎯 METAS A LARGO PLAZO (5+ semanas)

- [ ] 70% cobertura de tests
- [ ] CI/CD configurado
- [ ] Documentación completa de APIs
- [ ] Listo para producción

---

## 🚨 COSAS QUE NO DEBO OLVIDAR

1. **Siempre** hacer commit después de cada tarea completada
2. **Siempre** ejecutar tests después de cambios
3. **Siempre** actualizar JARY-ESTADO-ACTUAL.md al final
4. **Siempre** documentar decisiones en JARY-DECISIONES.md
5. **Nunca** deployar sin resolver vulnerabilidades

---

## 📊 TRACKING DE PROGRESO

### Errores TypeScript
```
Sesión #1: 325 errores (baseline)
Sesión #2: [actualizar después de correcciones]
Sesión #3: [objetivo: < 300]
Sesión #4: [objetivo: < 250]
```

### Vulnerabilidades
```
Sesión #1: 3 vulnerabilidades
Sesión #2: [objetivo: 0]
```

### Bugs Críticos
```
Sesión #1: 1 bug (asignación transporte)
Sesión #2: [objetivo: 0]
```

---

## 💬 PREGUNTAS PARA EL USUARIO (Si es necesario)

Si durante la investigación del bug necesito información:

1. **¿Tienes acceso a Supabase Dashboard?**
   - Para verificar estructura de tablas
   - Para revisar logs de errores

2. **¿Hay algún workaround temporal que estés usando?**
   - Para entender el flujo esperado

3. **¿Cuándo se detectó el bug por primera vez?**
   - Para buscar en git history

---

## 📝 FORMATO DE REPORTE AL FINALIZAR TAREA

```markdown
✅ Tarea completada: [nombre]

**Lo que hice**:
- [cambio 1]
- [cambio 2]

**Archivos modificados**:
- [archivo 1] - [qué cambió]
- [archivo 2] - [qué cambió]

**Verificación**:
- [x] Tests pasan (pnpm test)
- [x] No hay errores nuevos (pnpm type-check)
- [x] Funcionalidad probada manualmente
- [x] Documentación actualizada

**Métricas**:
- Errores TS: [antes] → [después]
- Vulnerabilidades: [antes] → [después]

**Próximo paso**: [siguiente tarea]

**Tiempo usado**: [X] minutos
```

---

**Este archivo es mi "plan de trabajo" - Lo consulto al inicio de cada sesión.**

---

*Última actualización: 19-Oct-2025*  
*Próxima revisión: Al inicio de Sesión #2*
