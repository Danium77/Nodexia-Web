# 🔗 Sistema de Invitaciones - Modo Testing (Sin Email)

## 📋 Resumen

Sistema dual de invitaciones que permite trabajar sin SMTP configurado durante el desarrollo/testing, manteniendo todo el código listo para producción con SendGrid.

## 🎯 Métodos Disponibles

### Método 1: Sin Email (ACTUAL - Testing)
**Estado**: ✅ Activo por defecto  
**Requiere**: Nada, funciona out-of-the-box

**Flujo:**
1. Admin crea usuario en el wizard
2. Sistema genera usuario directamente en Supabase Auth
3. Crea password temporal seguro
4. Genera link de invitación
5. **Muestra credenciales en pantalla**
6. Admin copia y envía por WhatsApp/otro medio

**Ventajas:**
- ✅ No requiere SMTP
- ✅ No costos de SendGrid
- ✅ Perfecto para testing
- ✅ Control total del proceso

**Desventajas:**
- ❌ Manual (admin debe enviar credenciales)
- ❌ No profesional para producción

---

### Método 2: Con Email (PREPARADO - Producción)
**Estado**: 🔧 Listo para activar  
**Requiere**: SMTP configurado en Supabase (SendGrid, AWS SES, etc.)

**Flujo:**
1. Admin crea usuario en el wizard
2. Sistema envía email automático con Supabase Auth
3. Usuario recibe email de invitación
4. Click en link → completa registro

**Ventajas:**
- ✅ Totalmente automático
- ✅ Profesional
- ✅ Mejor UX
- ✅ Seguimiento de emails

**Desventajas:**
- ❌ Requiere SMTP configurado
- ❌ Costos de SendGrid ($15-20/mes mínimo)

---

## ⚙️ Configuración

### Testing (Actual)

```env
# .env.local
NEXT_PUBLIC_USE_EMAIL_INVITES=false
```

**Nada más que hacer!** El sistema funciona de inmediato.

---

### Producción (Futuro con SendGrid)

#### Paso 1: Configurar SMTP en Supabase

1. Ve a **Supabase Dashboard** → **Project Settings** → **Auth** → **SMTP Settings**
2. Configura SendGrid (o tu proveedor):
   ```
   Host: smtp.sendgrid.net
   Port: 587
   Username: apikey
   Password: TU_API_KEY_DE_SENDGRID
   Sender email: noreply@tudominio.com
   Sender name: Nodexia
   ```
3. Guarda y verifica que funcione (Send test email)

#### Paso 2: Activar método con email

```env
# .env.local
NEXT_PUBLIC_USE_EMAIL_INVITES=true
```

#### Paso 3: Reiniciar servidor

```bash
pnpm dev
```

**¡Listo!** Ahora las invitaciones se envían automáticamente por email.

---

## 💻 Código

### Archivo: `pages/api/admin/nueva-invitacion.ts`

```typescript
// CONTROL DE MÉTODO
const USE_EMAIL_METHOD = process.env.NEXT_PUBLIC_USE_EMAIL_INVITES === 'true';

if (!USE_EMAIL_METHOD) {
  // MÉTODO SIN EMAIL (Testing)
  // Crea usuario + genera link + devuelve credenciales
}

// MÉTODO CON EMAIL (Producción)
// Usa inviteUserByEmail de Supabase
```

**Ambos métodos están en el mismo archivo**, solo cambia la variable de entorno.

---

## 🧪 Testing del Método Actual

### Crear Usuario de Transporte

1. **Login** como super_admin
2. **Ir a**: `/admin/usuarios`
3. **Click**: "Nuevo Usuario"
4. **Completar wizard**:
   - Empresa: Seleccionar empresa de transporte
   - Rol: Coordinador/Supervisor
   - Email: `gonzalo@logisticaexpres.com`
   - Nombre: Gonzalo Almada
   - Teléfono: +54 11 1234-5678

5. **Resultado esperado**:
   ```
   ✅ Usuario creado exitosamente!
   
   📧 Email: gonzalo@logisticaexpres.com
   👤 Nombre: Gonzalo Almada
   🏢 Empresa: Logística Express SRL
   
   🔗 Link de activación:
   http://localhost:3000/complete-invite?token=...
   
   🔑 Credenciales temporales:
   Email: gonzalo@logisticaexpres.com
   Password: Temp8x3f7b!2025
   
   📋 Envía estos datos al usuario por WhatsApp
   ```

6. **Click**: "📋 Copiar credenciales"
7. **Enviar** por WhatsApp al usuario

### Usuario Activa Cuenta

1. **Usuario abre** el link de activación
2. **Ve pantalla** de complete-invite
3. **Ingresa credenciales** temporales
4. **Completa** su perfil
5. **Establece** nueva contraseña
6. ✅ **Cuenta activada**

---

## 📦 Archivos Modificados

- ✅ `pages/api/admin/nueva-invitacion.ts` - API con ambos métodos
- ✅ `components/Admin/WizardUsuario.tsx` - Muestra credenciales
- ✅ `.env.local.example` - Documentación de variables

---

## 🚀 Migración a Producción

Cuando estés listo para producción:

1. **Contratar SendGrid** (o proveedor SMTP)
2. **Configurar SMTP** en Supabase Dashboard
3. **Cambiar variable**: `NEXT_PUBLIC_USE_EMAIL_INVITES=true`
4. **Restart server**: `pnpm dev`
5. **Probar** creando un usuario de prueba
6. **Verificar** que llegue el email

**El código NO necesita cambios!** Solo la variable de entorno.

---

## 🔒 Seguridad

### Passwords Temporales

- ✅ Generados con `Math.random()` + timestamp
- ✅ Formato: `TempXXXXXX!YYYY` (12+ caracteres)
- ✅ Usuario DEBE cambiar en primer login
- ✅ Válidos solo 24-48h (configurable en Supabase)

### Links de Invitación

- ✅ Token de un solo uso
- ✅ Expiran en 24h por defecto
- ✅ Generados por Supabase Auth (seguros)

---

## 📚 Referencias

- [Supabase Auth - Invite Users](https://supabase.com/docs/guides/auth/auth-email-templates)
- [SendGrid Setup Guide](https://docs.sendgrid.com/for-developers/sending-email/getting-started-smtp)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

## ❓ FAQ

**P: ¿Puedo usar Gmail SMTP?**  
R: Sí, pero SendGrid es más confiable para producción. Gmail tiene límites diarios (500 emails/día).

**P: ¿Qué pasa si el usuario pierde las credenciales?**  
R: Admin puede "Reenviar Invitación" desde la lista de usuarios.

**P: ¿El método sin email es seguro?**  
R: Sí, para testing interno. Para producción, usa el método con email.

**P: ¿Cuánto cuesta SendGrid?**  
R: Plan Free: 100 emails/día. Plan Essentials: $15/mes (40k emails/mes).

---

## 📞 Soporte

Si tienes problemas:
1. Verifica la variable de entorno
2. Revisa logs de Supabase Dashboard
3. Chequea configuración SMTP si usas email method
