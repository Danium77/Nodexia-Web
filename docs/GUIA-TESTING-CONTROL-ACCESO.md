# 🧪 Guía de Testing - Control de Acceso

**Creado:** 22-Dic-2025  
**Propósito:** Probar la nueva UI de Control de Acceso

---

## 🎯 Objetivo del Testing

Verificar que la nueva interfaz de Control de Acceso:
1. Muestre correctamente todos los datos del viaje
2. Los nombres de ubicaciones se vean legibles
3. Los mensajes contextuales aparezcan según el estado
4. Los botones funcionen correctamente
5. El flujo completo de estados funcione

---

## 🚀 Preparación

### 1. Iniciar Servidor (si no está corriendo)
```powershell
cd c:\Users\nodex\Nodexia-Web
pnpm dev
```

El servidor debería iniciar en: **http://localhost:3001**

### 2. Acceder a Control de Acceso
1. Navegar a: `http://localhost:3001`
2. Iniciar sesión con usuario de Control de Acceso
3. Ir a la página de Control de Acceso

---

## ✅ Casos de Prueba

### Caso 1: Visualización de Información Completa

**Código a probar:** `DSP-20251219-002` (o cualquier código de despacho existente)

**Pasos:**
1. Ingresar el código en el campo de búsqueda
2. Hacer clic en "Escanear"

**Resultado esperado:**
```
┌─────────────────────────────────────────────┐
│ ████ DSP-20251219-002 ████ [Estado Badge]  │ ← Header gradiente
├─────────────────────────────────────────────┤
│  📍 Rosario  →  →  →  Santa Rosa           │ ← Nombres de ubicaciones
├─────────────────────────────────────────────┤
│  🚛 Camión       👤 Chofer      ⏰ Info    │
│  ABC123          Nombre         📤 Envío   │
│  Mercedes 1518   DNI: XXX       📅 Fecha   │
│  Año: 2018       Tel: XXX                  │
└─────────────────────────────────────────────┘
```

**Verificar:**
- ✅ El código de despacho aparece en el header
- ✅ Los nombres de ubicaciones están en español (no UUIDs)
- ✅ Se muestran 3 columnas de información
- ✅ El año del camión aparece (si existe)
- ✅ El teléfono del chofer aparece (si existe)
- ✅ La fecha programada aparece (si existe)

---

### Caso 2: Mensaje Contextual - Arribo a Origen

**Pre-requisito:** Viaje en estado `arribo_origen` (tipo: envío)

**Resultado esperado:**
```
┌─────────────────────────────────────────────┐
│ ℹ️ El camión ha arribado a planta          │
│    Confirme el ingreso para permitir el     │
│    acceso a la playa de espera              │
└─────────────────────────────────────────────┘
```

**Verificar:**
- ✅ Aparece un banner azul con el mensaje
- ✅ Hay un ícono de información
- ✅ El texto es claro y accionable
- ✅ El botón "Confirmar Ingreso a Planta" está visible

---

### Caso 3: Flujo de Estados

**Pasos completos:**

#### 3.1 Estado: arribo_origen
1. Escanear código de viaje
2. Verificar que aparece el mensaje contextual azul
3. Hacer clic en "Confirmar Ingreso a Planta"
4. Verificar mensaje de confirmación verde

**Resultado:** Estado cambia a `en_playa_espera`

---

#### 3.2 Estado: en_playa_espera
1. Verificar que aparece el mensaje contextual amarillo
2. Hacer clic en "Asignar Playa de Espera"
3. Ingresar número de playa (ej: "5")
4. Verificar mensaje de confirmación

**Resultado:** Se asigna playa, estado sigue en `en_playa_espera`

---

#### 3.3 Estado: cargado
*(Este cambio lo hace el coordinador desde otro dashboard)*

1. Verificar que aparece el mensaje contextual morado
2. Verificar que dice "Carga completada - Validar documentación"
3. Hacer clic en "Validar Documentación"
4. Verificar que el badge cambia a "✅ Válida"

**Resultado:** Documentación validada, se habilita botón de egreso

---

#### 3.4 Egreso
1. Verificar que el botón "Confirmar Egreso de Planta" está habilitado
2. Hacer clic en el botón
3. Verificar mensaje de confirmación

**Resultado:** Estado cambia a `saliendo_origen`

---

### Caso 4: Diseño y Estilos

**Verificar:**
- ✅ Header tiene gradiente cyan → blue
- ✅ Los cards tienen efecto hover (border cyan al pasar el mouse)
- ✅ Los botones tienen sombra y efecto hover
- ✅ Los iconos son del tamaño correcto y visibles
- ✅ Los colores son consistentes con el design system
- ✅ El texto es legible en todos los fondos

---

### Caso 5: Responsive Design

**Probar en diferentes tamaños:**

1. **Desktop (>1024px):**
   - Grid de 3 columnas visible
   - Todos los elementos alineados correctamente

2. **Tablet (768px - 1024px):**
   - Grid colapsa a 1 columna
   - Información sigue siendo legible

3. **Mobile (<768px):**
   - Todo apilado verticalmente
   - Botones siguen siendo clickeables

---

## 🐛 Problemas Comunes

### El servidor no inicia
```powershell
# Verificar puerto 3000/3001
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess

# Matar proceso si es necesario
Stop-Process -Id <PID>

# Reiniciar servidor
pnpm dev
```

### No aparecen los nombres de ubicaciones
**Posibles causas:**
1. La tabla `ubicaciones` no tiene registros
2. Los IDs no coinciden
3. Error en la query

**Debug:**
```sql
-- Verificar ubicaciones
SELECT id, nombre, tipo FROM ubicaciones LIMIT 10;

-- Verificar despacho
SELECT origen, destino FROM despachos WHERE pedido_id = 'DSP-20251219-002';
```

### Los mensajes contextuales no aparecen
**Verificar:**
1. El estado del viaje es el correcto
2. El tipo de operación es correcto (envío/recepción)
3. Revisar consola del navegador por errores

### Botones no funcionan
**Verificar:**
1. Usuario tiene rol `control_acceso`
2. La función `actualizarEstadoUnidad` existe
3. Revisar Network tab para ver errores de API

---

## 📊 Checklist de Testing

```markdown
### Visualización
- [ ] Código de despacho visible en header
- [ ] Nombres de ubicaciones (no UUIDs)
- [ ] Información de camión completa
- [ ] Información de chofer completa
- [ ] Teléfono visible (si existe)
- [ ] Año de camión visible (si existe)
- [ ] Fecha programada visible (si existe)

### Mensajes Contextuales
- [ ] Mensaje azul en arribo_origen
- [ ] Mensaje amarillo en en_playa_espera
- [ ] Mensaje morado en cargado (sin docs)
- [ ] Mensaje teal en arribado_destino

### Funcionalidad
- [ ] Escanear QR funciona
- [ ] Confirmar ingreso actualiza estado
- [ ] Asignar playa funciona
- [ ] Validar documentación funciona
- [ ] Confirmar egreso funciona
- [ ] Crear incidencia funciona
- [ ] Limpiar resetea el formulario

### Diseño
- [ ] Gradiente en header
- [ ] Cards con hover effect
- [ ] Botones con sombra
- [ ] Iconos del tamaño correcto
- [ ] Responsive en mobile

### Historial
- [ ] Se carga correctamente
- [ ] Se actualiza después de acciones
- [ ] Muestra últimos 20 registros
- [ ] Formato de fecha/hora correcto
```

---

## 🎥 Capturas Recomendadas

Si quieres documentar el resultado:

1. **Pantalla completa** con viaje cargado
2. **Header** mostrando código y estado
3. **Sección de ruta** con nombres de ubicaciones
4. **Grid de información** con las 3 columnas
5. **Mensaje contextual** en diferentes estados
6. **Botones de acción** con hover effect
7. **Historial** con registros

---

## ✅ Criterios de Éxito

La prueba se considera exitosa si:

1. ✅ Todos los datos se muestran correctamente
2. ✅ Los nombres de ubicaciones son legibles
3. ✅ Los mensajes contextuales aparecen en los estados correctos
4. ✅ El flujo de estados funciona sin errores
5. ✅ El diseño se ve profesional y moderno
6. ✅ No hay errores en la consola del navegador
7. ✅ La experiencia es fluida y clara

---

## 📝 Reporte de Bugs

Si encuentras algún problema, documenta:

```markdown
### Bug: [Título descriptivo]

**Severidad:** 🔴 Alta / 🟡 Media / 🟢 Baja

**Pasos para reproducir:**
1. [Paso 1]
2. [Paso 2]
3. [Paso 3]

**Resultado esperado:**
[Qué debería pasar]

**Resultado actual:**
[Qué está pasando]

**Capturas:**
[Screenshots si aplica]

**Consola:**
[Errores de consola si hay]
```

---

## 🚀 Próximos Pasos Después del Testing

Si todo funciona bien:
1. ✅ Marcar feature como completa
2. ✅ Documentar en changelog
3. ✅ Pasar a siguiente objetivo

Si hay bugs:
1. Documentar todos los bugs encontrados
2. Priorizar según severidad
3. Crear plan de correcciones

---

**Happy Testing! 🎉**

*Creado por: GitHub Copilot*  
*Fecha: 22-Dic-2025*
