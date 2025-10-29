# 📧 Guía de Troubleshooting - Sistema de Invitaciones

## 🎯 Funcionalidades Disponibles

### En `/admin/usuarios` tienes estos botones:

1. **📊 Estado Invitaciones** - Ve el resumen de todas las invitaciones
2. **📧 Probar Email** - Prueba el envío de emails de diagnóstico  
3. **🔄 Reenviar** - Reenvía invitación a un usuario específico
4. **🔗 Enlace Manual** - Crea usuario con enlace manual (backup)
5. **➕ Nuevo Usuario** - Wizard normal de creación

## 🔍 Diagnóstico de Problemas

### Si un usuario no recibe el email:

1. **Usar "📊 Estado Invitaciones"**
   - Ve cuántos usuarios están pendientes
   - Identifica invitaciones antiguas (>7 días)

2. **Usar "📧 Probar Email"**
   - Envía un email de prueba a cualquier dirección
   - Verifica que el SMTP esté funcionando

3. **Usar "🔄 Reenviar"**
   - Reenvía la invitación a un email específico
   - Útil si el primer email se perdió

### Posibles Causas de Problemas:

✅ **SMTP Configurado Correctamente** (tu caso)
- ✉️ Email en carpeta de spam
- 🚫 Filtros de email corporativo
- ⏰ Retraso en la entrega
- 📧 Dirección de email incorrecta
- 🔄 Rate limits de Supabase

❌ **Problemas de Configuración**
- 🔧 SMTP mal configurado
- 🔑 Credenciales SMTP expiradas
- 📊 Límites del proveedor alcanzados

## 🛠️ Soluciones Rápidas

### Para un Usuario Específico:
1. Ir a `/admin/usuarios`
2. Clic en "🔄 Reenviar"
3. Ingresar el email del usuario
4. Pedir al usuario que revise spam

### Si el SMTP Falla:
1. Usar "🔗 Enlace Manual"
2. Copiar el mensaje generado
3. Enviarlo por WhatsApp/Telegram
4. El usuario puede completar registro manualmente

### Verificación Masiva:
1. Clic en "📊 Estado Invitaciones"
2. Ver lista de usuarios pendientes
3. Reenviar a usuarios con +7 días

## 📋 Checklist de Verificación

- [ ] El SMTP está configurado en Supabase
- [ ] El usuario revisó la carpeta de spam
- [ ] La dirección de email es correcta
- [ ] No hay filtros corporativos bloqueando
- [ ] No se alcanzaron límites de rate (< 10 invites/min)
- [ ] La URL de redirección está correcta

## 🚨 Códigos de Error Comunes

- **409**: Usuario ya existe → Usar login normal
- **503**: Error SMTP → Revisar configuración en Supabase
- **429**: Rate limit → Esperar 1-2 minutos
- **400**: Datos faltantes → Verificar email/profileId/roleId

## 💡 Mejores Prácticas

1. **Siempre probar primero** con "📧 Probar Email"
2. **Reenviar después de 24h** si no hay respuesta
3. **Usar enlace manual** como backup para casos urgentes
4. **Verificar estado regularmente** con el botón de estadísticas
5. **Documentar emails problemáticos** para identificar patrones

## 🔧 Configuración Recomendada

```env
# En Supabase Dashboard → Authentication → Email Templates
SMTP Provider: SendGrid / Resend / Mailgun
From Email: noreply@tudominio.com
Reply To: support@tudominio.com
```

## 📞 Soporte

Si los problemas persisten:
1. Revisar logs en Supabase Dashboard
2. Verificar estadísticas del proveedor SMTP
3. Contactar soporte del proveedor SMTP si es necesario