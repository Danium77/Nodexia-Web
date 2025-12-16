# Configuración SMTP para envío de emails

## Variables de entorno necesarias (.env.local)

```env
# SMTP Configuration (descomentarlas cuando tengas servidor SMTP)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=tu-email@gmail.com
# SMTP_PASSWORD=tu-app-password
# SMTP_FROM=noreply@nodexia.com
# SMTP_FROM_NAME=Nodexia Sistema de Transporte
```

## Comportamiento del Sistema

### SIN SMTP (Actual)
- ✅ Usuario creado con password temporal: `Temporal2024!`
- ✅ `email_confirm: true` → Email auto-confirmado
- ✅ Wizard muestra credenciales por 30 segundos
- ✅ Admin debe enviar credenciales por WhatsApp/otro medio
- ✅ Usuario hace login inmediato

### CON SMTP (Futuro)
- ✅ Usuario creado sin password
- ✅ `email_confirm: false` → Email debe ser confirmado
- ✅ Sistema envía email de activación automáticamente
- ✅ Wizard muestra confirmación de envío (10 segundos)
- ✅ Usuario recibe email con link de activación
- ✅ Usuario establece su propia contraseña

## Implementación del envío de email

Cuando configures SMTP, crea este archivo:

**`lib/email/sendActivationEmail.ts`:**

```typescript
import nodemailer from 'nodemailer';

export async function sendActivationEmail(
  email: string,
  userId: string,
  empresaNombre: string
) {
  // Configurar transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // Generar link de activación
  const activationLink = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/activate?token=${userId}`;

  // HTML del email
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Bienvenido a Nodexia</h2>
      <p>Has sido invitado a unirte a <strong>${empresaNombre}</strong> en el sistema Nodexia.</p>
      
      <p>Para activar tu cuenta y establecer tu contraseña, haz clic en el siguiente botón:</p>
      
      <a href="${activationLink}" 
         style="display: inline-block; padding: 12px 24px; background-color: #0ea5e9; 
                color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
        Activar mi cuenta
      </a>
      
      <p>O copia y pega este enlace en tu navegador:</p>
      <p style="color: #666; font-size: 12px;">${activationLink}</p>
      
      <p style="margin-top: 30px; color: #666; font-size: 12px;">
        Este enlace expira en 24 horas.<br>
        Si no solicitaste esta invitación, puedes ignorar este email.
      </p>
    </div>
  `;

  // Enviar email
  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: `Invitación a ${empresaNombre} - Nodexia`,
    html,
  });
}
```

## Descomentar en nueva-invitacion.ts

Cuando tengas SMTP configurado, descomenta estas líneas en `pages/api/admin/nueva-invitacion.ts`:

```typescript
if (smtpConfigured) {
  // CON SMTP: Usuario recibirá email de activación
  // TODO: Implementar envío de email cuando SMTP esté configurado
  // await sendActivationEmail(email, newUser.user.id, empresa.nombre); // ← DESCOMENTAR
  
  return res.status(200).json({
    metodo: 'email_activacion',
    // ...
  });
}
```

## Página de activación

También necesitarás crear: **`pages/auth/activate.tsx`**

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
      // Actualizar password del usuario
      const { error } = await supabase.auth.admin.updateUserById(
        token as string,
        { password }
      );

      if (error) throw error;

      alert('¡Cuenta activada! Redirigiendo al login...');
      router.push('/auth/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-6">Activar tu cuenta</h1>
        
        <form onSubmit={handleActivate} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2">Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">Confirmar contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded"
              required
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 text-white py-2 rounded hover:bg-cyan-600 disabled:opacity-50"
          >
            {loading ? 'Activando...' : 'Activar cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

## Paquete necesario

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

## Resumen

**Ahora:**
- ✅ Sistema funciona sin SMTP
- ✅ Password temporal: `Temporal2024!`
- ✅ Listo para agregar SMTP cuando esté disponible

**Cuando tengas SMTP:**
1. Agregar variables de entorno en `.env.local`
2. Instalar `nodemailer`
3. Crear `lib/email/sendActivationEmail.ts`
4. Crear `pages/auth/activate.tsx`
5. Descomentar línea en `nueva-invitacion.ts`
6. ✅ Sistema cambia automáticamente a email de activación
