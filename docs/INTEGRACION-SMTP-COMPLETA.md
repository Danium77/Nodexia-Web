# 📧 Guía de Integración SMTP - Sistema de Usuarios Nodexia

## 📋 Estado Actual del Sistema

### ✅ Sistema Funcionando SIN SMTP
- **Password temporal:** `Temporal2024!`
- **Auto-confirmación de email:** Activada
- **Creación de usuario:** Completa (auth.users, profiles, usuarios, usuarios_empresa)
- **Wizard:** Muestra credenciales por 30 segundos
- **Login:** Inmediato después de creación

### 🎯 Objetivo con SMTP
- **Email de activación:** Automático
- **Password:** Usuario lo establece
- **Confirmación de email:** Via link en email
- **Wizard:** Muestra confirmación de envío (10 segundos)

---

## 🚀 Pasos para Activar SMTP

### 1️⃣ Configurar Variables de Entorno

Agregar a **`.env.local`**:

```env
# ========================================
# SMTP Configuration para envío de emails
# ========================================

# Servidor SMTP (ejemplo con Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Credenciales (para Gmail usar App Password)
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password-de-16-digitos

# Remitente
SMTP_FROM=noreply@nodexia.com
SMTP_FROM_NAME=Nodexia Sistema de Transporte

# URL del sitio (para links de activación)
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
```

#### 📌 Obtener App Password de Gmail:
1. Ir a: https://myaccount.google.com/security
2. Activar verificación en 2 pasos
3. Ir a "Contraseñas de aplicaciones"
4. Seleccionar "Correo" y "Otro dispositivo"
5. Copiar la contraseña de 16 dígitos generada

---

### 2️⃣ Instalar Dependencias

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

---

### 3️⃣ Activar Código de Email

#### Archivo: `lib/email/sendActivationEmail.ts`

**DESCOMENTAR** toda la implementación:

```typescript
// Quitar comentarios de /* ... */ en las líneas 28-71
// La implementación ya está lista, solo descomentar
```

**Específicamente:**
1. Línea 28: `const nodemailer = require('nodemailer');`
2. Todo el bloque hasta línea 71: `console.log('✅ Email de activación enviado...')`

---

### 4️⃣ Activar Llamada en API

#### Archivo: `pages/api/admin/nueva-invitacion.ts`

**Línea 4:** Descomentar import
```typescript
import { sendActivationEmail } from '../../../lib/email/sendActivationEmail'
```

**Línea ~225:** Descomentar llamada
```typescript
if (smtpConfigured) {
  // CON SMTP: Usuario recibirá email de activación
  await sendActivationEmail(email, newUser.user.id, empresa.nombre); // ← DESCOMENTAR
  
  return res.status(200).json({
    metodo: 'email_activacion',
    // ...
  });
}
```

---

### 5️⃣ Crear Página de Activación

#### Archivo: `pages/auth/activate.tsx` (CREAR NUEVO)

```typescript
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function ActivatePage() {
  const router = useRouter();
  const { token } = router.query;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);
    
    try {
      // Actualizar password del usuario usando el token
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      alert('¡Cuenta activada exitosamente! Redirigiendo al login...');
      router.push('/auth/login');
    } catch (err: any) {
      setError(err.message || 'Error al activar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Activar tu cuenta</h1>
          <p className="text-gray-400">Establece tu contraseña para continuar</p>
        </div>
        
        <form onSubmit={handleActivate} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2 text-sm font-medium">
              Nueva contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="Mínimo 8 caracteres"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2 text-sm font-medium">
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="Repite tu contraseña"
              required
            />
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 text-white py-3 rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {loading ? 'Activando...' : 'Activar cuenta'}
          </button>
        </form>
        
        <p className="text-center text-gray-500 text-sm mt-6">
          ¿Problemas con el link? Contacta al administrador
        </p>
      </div>
    </div>
  );
}
```

---

### 6️⃣ Reiniciar Servidor

```bash
# Detener servidor actual (Ctrl+C)
npm run dev
```

---

## ✅ Checklist de Activación

- [ ] Variables de entorno configuradas en `.env.local`
- [ ] Paquete `nodemailer` instalado
- [ ] Código descomentado en `lib/email/sendActivationEmail.ts`
- [ ] Import descomentado en `pages/api/admin/nueva-invitacion.ts`
- [ ] Llamada `await sendActivationEmail(...)` descomentada
- [ ] Página `pages/auth/activate.tsx` creada
- [ ] Servidor reiniciado
- [ ] Prueba de creación de usuario

---

## 🧪 Prueba de Funcionamiento

### Con SMTP Activo:

1. **Crear usuario desde Wizard:**
   - Admin → Usuarios → Nuevo Usuario
   - Completar todos los datos
   - Click "Crear Usuario"

2. **Verificar en Wizard:**
   ```
   ✅ Usuario creado exitosamente!
   
   📧 Email: test@ejemplo.com
   👤 Nombre: Usuario Test
   🏢 Empresa: Logística del Centro Demo
   📍 Rol: Coordinador de Transporte
   
   📬 EMAIL DE ACTIVACIÓN ENVIADO
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   El usuario recibirá un email con instrucciones
   para activar su cuenta y establecer su contraseña.
   
   ⚠️ IMPORTANTE:
   • El link de activación expira en 24 horas
   • El usuario debe revisar su bandeja de entrada
   • Si no recibe el email, verifica la carpeta de spam
   • Esta ventana se cerrará automáticamente en 10 segundos
   ```

3. **Usuario recibe email:**
   - Asunto: "Invitación a [Empresa] - Nodexia"
   - Botón: "Activar mi cuenta"
   - Link: `https://tu-dominio.com/auth/activate?token=[UUID]`

4. **Usuario activa cuenta:**
   - Click en link del email
   - Página de activación se abre
   - Establece su contraseña (min 8 caracteres)
   - Confirma contraseña
   - Click "Activar cuenta"

5. **Login exitoso:**
   - Redirige a `/auth/login`
   - Usuario ingresa email y contraseña establecida
   - Accede al sistema

---

## 🔄 Comparativa: Sin SMTP vs Con SMTP

### SIN SMTP (Estado Actual)

```javascript
// API detecta: smtpConfigured = false
const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
  email,
  password: 'Temporal2024!',  // ← Password definido
  email_confirm: true,         // ← Auto-confirmado
});

// Respuesta
{
  metodo: 'password_temporal',
  password_temporal: 'Temporal2024!',
  smtp_configurado: false
}

// Wizard muestra credenciales por 30 segundos
```

### CON SMTP (Cuando actives)

```javascript
// API detecta: smtpConfigured = true
const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
  email,
  password: undefined,         // ← Sin password
  email_confirm: false,        // ← Requiere confirmación
});

// Envía email
await sendActivationEmail(email, newUser.user.id, empresa.nombre);

// Respuesta
{
  metodo: 'email_activacion',
  email_enviado: true
}

// Wizard muestra confirmación por 10 segundos
```

---

## 🐛 Troubleshooting

### Email no se envía

**Verificar:**
```bash
# En consola del servidor debe aparecer:
SMTP configured: true
✅ Email de activación enviado a: usuario@ejemplo.com
```

**Si aparece error:**
- Verificar credenciales SMTP en `.env.local`
- Gmail: Usar App Password, no contraseña normal
- Verificar firewall/puerto 587 abierto

### Usuario no recibe email

1. **Revisar spam/correo no deseado**
2. **Verificar `SMTP_FROM` es válido**
3. **Logs del servidor:** `npm run dev` debe mostrar "✅ Email enviado"
4. **Probar con email diferente** (a veces dominios bloquean)

### Link de activación no funciona

1. **Verificar `NEXT_PUBLIC_SITE_URL`** en `.env.local`
2. **URL debe ser completa:** `https://tu-dominio.com` (sin trailing slash)
3. **Token expira en 24h:** Crear nuevo usuario si pasó el tiempo

### Error "email already exists"

**Solución:**
1. Ir a Supabase Dashboard
2. Authentication → Users
3. Buscar y eliminar usuario
4. Ejecutar `sql/limpiar-usuario-completo.sql` con el email
5. Crear usuario nuevamente

---

## 📝 Configuraciones Adicionales (Opcional)

### Personalizar Template de Email

Editar `lib/email/sendActivationEmail.ts` líneas 35-58:

```typescript
const html = `
  <!-- Tu diseño personalizado aquí -->
  <div style="font-family: Arial, sans-serif;">
    <img src="https://tu-dominio.com/logo.png" alt="Logo" />
    <h1>Bienvenido a Nodexia</h1>
    <!-- ... -->
  </div>
`;
```

### Cambiar Tiempo de Expiración del Link

Por defecto Supabase usa 24 horas. Para cambiar:
- Ir a Supabase Dashboard
- Authentication → Email Templates
- Ajustar "Confirm signup" template

### Usar otro proveedor SMTP

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=tu-api-key-de-sendgrid
```

**AWS SES:**
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=tu-smtp-username
SMTP_PASSWORD=tu-smtp-password
```

---

## 🎯 Resumen

**Estado Actual:**
- ✅ Sistema funciona SIN SMTP
- ✅ Código preparado para activar SMTP
- ✅ Solo requiere configuración de variables de entorno
- ✅ Transición automática sin cambios de lógica

**Cuando actives SMTP:**
1. Configurar 6 variables de entorno
2. Instalar nodemailer
3. Descomentar 2 líneas de código
4. Crear 1 página nueva (activate.tsx)
5. Reiniciar servidor
6. ✅ Sistema usa email de activación automáticamente

**Tiempo estimado de activación:** 15-20 minutos

---

## 📚 Archivos Clave

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `pages/api/admin/nueva-invitacion.ts` | API de creación de usuarios | ✅ Preparado |
| `lib/email/sendActivationEmail.ts` | Helper de envío de email | ✅ Preparado |
| `components/Admin/WizardUsuario.tsx` | Interfaz de creación | ✅ Preparado |
| `pages/auth/activate.tsx` | Página de activación | ⏳ Pendiente crear |
| `.env.local` | Variables de entorno | ⏳ Pendiente configurar |

---

**Última actualización:** Diciembre 4, 2025  
**Próxima acción:** Configurar SMTP cuando esté disponible
