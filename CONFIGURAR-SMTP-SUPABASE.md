# 🔧 Configuración SMTP en Supabase - Guía Paso a Paso

## 🎯 Objetivo
Configurar el servidor SMTP en Supabase para que la aplicación pueda enviar emails de invitación automáticamente.

## 📍 Estado Actual
- ❌ **SMTP no configurado** en Supabase Dashboard
- ✅ **Sistema de diagnóstico** implementado y funcionando
- ✅ **Sistema de enlaces manuales** como alternativa
- ✅ **Usuario admin** creado (`admin@example.com`)

## 🚀 Pasos de Configuración

### 1. **Acceder al Dashboard de Supabase**
- URL: https://supabase.com/dashboard
- Buscar proyecto: `lkdcofsfjnltuzzzwoir.supabase.co`
- Hacer clic en el proyecto

### 2. **Navegar a Settings → Authentication**
- En el menú lateral: **Settings**
- Submenu: **Authentication**  
- Scroll hasta: **"SMTP Settings"**

### 3. **Configurar Servidor SMTP**

#### **Opción A: Gmail (Recomendado)**
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: [tu-email@gmail.com]
SMTP Pass: [App Password - Ver instrucciones abajo]
Sender Name: Nodexia
Sender Email: [tu-email@gmail.com]
```

#### **Cómo crear App Password para Gmail:**
1. Ir a: https://myaccount.google.com/security
2. Buscar: "App passwords" / "Contraseñas de aplicaciones"
3. Seleccionar: "Mail" o "Custom"
4. Copiar la contraseña generada (16 caracteres)
5. Usar esa contraseña en SMTP Pass

#### **Opción B: Outlook/Hotmail**
```
SMTP Host: smtp-mail.outlook.com
SMTP Port: 587
SMTP User: [tu-email@hotmail.com]
SMTP Pass: [tu-contraseña-normal]
Sender Name: Nodexia
Sender Email: [tu-email@hotmail.com]
```

#### **Opción C: Proveedores Profesionales**

**SendGrid:**
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Pass: [tu-api-key-de-sendgrid]
Sender Name: Nodexia
Sender Email: noreply@tu-dominio.com
```

**Mailgun:**
```
SMTP Host: smtp.mailgun.org
SMTP Port: 587
SMTP User: [tu-smtp-username]
SMTP Pass: [tu-smtp-password]
Sender Name: Nodexia
Sender Email: noreply@tu-dominio.com
```

### 4. **Probar la Configuración**

Una vez configurado el SMTP:

1. **Guardar configuración** en Supabase Dashboard
2. **Abrir tu app**: http://localhost:3001
3. **Loguearte como admin**: `admin@example.com` / `StrongPass123!`
4. **Ir a Admin → Usuarios**
5. **Hacer clic**: "🔬 Diagnóstico SMTP"
6. **Verificar resultado**: Debería mostrar "SMTP configurado correctamente"

### 5. **Crear Usuario de Prueba**

Después de configurar SMTP:

1. **En Admin → Usuarios**
2. **Hacer clic**: "+ Nuevo Usuario"
3. **Completar datos** de un usuario de prueba
4. **El email debería enviarse automáticamente**
5. **Verificar** que llegue el email de invitación

## 🔍 Solución de Problemas

### **Error: "Invalid login"**
- ✅ **Gmail**: Asegúrate de usar App Password, no contraseña normal
- ✅ **Outlook**: Verifica que la cuenta permita SMTP
- ✅ **Verificar**: Puerto 587 y configuración TLS

### **Error: "Authentication failed"**
- ✅ **Credenciales correctas** en SMTP User/Pass
- ✅ **Two-factor auth** configurado si usas Gmail
- ✅ **Permisos de aplicación** habilitados

### **Emails no llegan**
- ✅ **Verificar spam/junk** en email destino
- ✅ **Sender Email válido** y verificado
- ✅ **Límites de envío** del proveedor SMTP

## 📋 Checklist de Verificación

### **Antes de Configurar SMTP:**
- [x] ✅ Usuario admin creado
- [x] ✅ Sistema de diagnóstico funcionando
- [x] ✅ Enlaces manuales como backup
- [x] ✅ App funcionando en localhost:3001

### **Durante Configuración:**
- [ ] 🔧 Acceso a Supabase Dashboard
- [ ] 🔧 Email válido disponible (Gmail/Outlook)
- [ ] 🔧 App Password generada (si Gmail)
- [ ] 🔧 Configuración SMTP guardada
- [ ] 🔧 Prueba de diagnóstico exitosa

### **Después de Configurar:**
- [ ] ✅ Diagnóstico SMTP muestra "OK"
- [ ] ✅ Creación de usuario envía email
- [ ] ✅ Email de invitación llega correctamente
- [ ] ✅ Usuario puede activar cuenta con el enlace

## 🎉 Resultado Esperado

Una vez configurado correctamente:

1. **🔬 Diagnóstico SMTP**: ✅ "SMTP configurado correctamente"
2. **📧 Wizard de Usuario**: Envía emails automáticamente
3. **🔁 Reenvío de Invitaciones**: Funciona sin errores
4. **📱 Flujo Completo**: Usuario recibe email → hace clic → cuenta activada

## 💡 Recomendación

**Para desarrollo**: Usa Gmail con App Password (más fácil)  
**Para producción**: Considera SendGrid o Mailgun (más confiable)  
**Como backup**: Sistema de enlaces manuales siempre disponible

---

**🎯 Próximo paso**: Configurar SMTP en Supabase Dashboard siguiendo esta guía