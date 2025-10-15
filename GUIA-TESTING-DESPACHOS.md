# 🧪 Guía de Testing - Flujo de Creación de Despachos

## 🎯 **Objetivo del Test**
Probar el flujo completo de creación de despachos desde el rol de **Coordinador** en la sección de Despachos.

## 🔐 **credenciales de Acceso para Testing**

### 👤 **Usuario Coordinador:**
- **Email**: `coord_demo@example.com`
- **Password**: `Demo1234!`
- **Empresa**: Nodexia San Francisco
- **Rol**: Coordinador (gestión operacional)

## 📋 **Pasos del Test**

### 🚀 **1. Acceso Inicial**
1. Navegar a: `http://localhost:3001`
2. Hacer clic en "Iniciar Sesión" o ir directamente a `/login`
3. Ingresar credenciales del coordinador
4. Verificar redirección al dashboard

### 🏢 **2. Navegación a Despachos**
1. Desde el dashboard, navegar a la sección **"Despachos"**
2. Verificar que aparece la lista de despachos existentes
3. Localizar el botón **"+ Crear Despacho"**
4. Hacer clic en "Crear Despacho"

### 📝 **3. Formulario de Creación**
**Campos a completar:**

#### 📍 **Datos del Despacho**
- **Pedido ID**: `PED-TEST-001`
- **Origen**: `Buenos Aires, Argentina`
- **Destino**: `Córdoba, Argentina`
- **Fecha de Despacho**: Fecha actual + 1 día
- **Tipo de Carga**: `General`
- **Prioridad**: `Media`

#### 🏢 **Empresa Origen/Destino**
- **Empresa Origen**: Buscar "Tecnoembalajes" (debe aparecer en autocompletado)
- **Empresa Destino**: Buscar "Logística del Centro" 

#### 📋 **Detalles Adicionales**
- **Observaciones**: `Despacho de prueba - Testing flujo coordinador`
- **Peso aproximado**: `1500 kg`
- **Cantidad de bultos**: `25`

### ✅ **4. Verificaciones Durante el Proceso**

#### 🔍 **Validaciones del Formulario**
- [ ] Campos obligatorios marcados correctamente
- [ ] Autocompletado de empresas funcionando
- [ ] Validación de fechas (no permitir fechas pasadas)
- [ ] Formato correcto de datos numéricos

#### 🎨 **Interfaz de Usuario**
- [ ] Diseño responsive funciona correctamente
- [ ] Elementos visuales consistentes con el tema
- [ ] Botones y campos accesibles
- [ ] Mensajes de error claros y útiles

#### 🔄 **Funcionalidad**
- [ ] Guardado automático de borradores (si existe)
- [ ] Navegación entre pasos del formulario
- [ ] Cancelación del proceso funciona
- [ ] Validación en tiempo real

### 💾 **5. Envío y Confirmación**
1. Hacer clic en **"Crear Despacho"** o **"Guardar"**
2. Verificar mensaje de confirmación
3. Comprobar redirección a lista de despachos
4. Verificar que el nuevo despacho aparece en la lista

### 🔍 **6. Verificación Post-Creación**
1. Localizar el despacho recién creado en la lista
2. Verificar que todos los datos se muestran correctamente
3. Probar edición del despacho (si está disponible)
4. Verificar estados del despacho (pendiente, etc.)

## 🐛 **Errores Comunes a Verificar**

### ❌ **Posibles Problemas**
- [ ] Error 401/403 - Problemas de autenticación
- [ ] Campos que no se guardan correctamente
- [ ] Autocompletado que no funciona
- [ ] Errores de validación poco claros
- [ ] Problemas de responsive en mobile
- [ ] Estados de carga que no se muestran

### 🔧 **Puntos de Atención**
- [ ] **Performance**: ¿El formulario responde rápido?
- [ ] **UX**: ¿Es intuitivo el flujo?
- [ ] **Errores**: ¿Los mensajes son claros?
- [ ] **Navegación**: ¿Se puede cancelar fácilmente?
- [ ] **Datos**: ¿Se preservan al navegar?

## 📊 **Métricas a Evaluar**

### ⏱️ **Tiempo de Carga**
- Tiempo inicial de carga de la página
- Tiempo de respuesta del autocompletado
- Tiempo de guardado del despacho

### 👆 **Usabilidad**
- Número de clics necesarios para completar el flujo
- Claridad de las instrucciones
- Facilidad para corregir errores

### 🛡️ **Estabilidad**
- ¿El sistema maneja errores graciosamente?
- ¿Se pierden datos si hay problemas de red?
- ¿Funciona correctamente en diferentes navegadores?

## 📝 **Reporte de Resultados**

### ✅ **Casos de Éxito**
- [ ] Creación exitosa de despacho
- [ ] Todos los campos se guardan correctamente
- [ ] Navegación fluida
- [ ] UX satisfactoria

### ❌ **Problemas Encontrados**
- [ ] Errores técnicos específicos
- [ ] Problemas de usabilidad
- [ ] Sugerencias de mejora
- [ ] Bugs identificados

## 🚀 **Próximos Pasos**
Después del testing básico, se puede probar:
- Creación masiva de despachos
- Integración con otros módulos
- Flujos de aprobación
- Notificaciones automáticas

---

**Fecha del Test**: Octubre 2025  
**Tester**: Equipo Nodexia  
**Versión**: 1.0  

🎯 **¡Listo para comenzar el testing!**