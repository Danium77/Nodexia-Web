# Guía Rápida: Eliminación de Usuarios para Reutilizar Emails

## 📧 Problema Común
**Situación**: "No puedo crear un usuario porque el email ya está registrado, pero necesito usar ese email nuevamente"

## ✅ Solución Implementada

### Opción 1: Interfaz Web (Recomendado)
1. Ve a **Admin → Usuarios** en tu dashboard
2. Haz clic en **🗑️ Eliminar Usuario**
3. Ingresa el email del usuario que quieres eliminar
4. Confirma la eliminación (doble confirmación por seguridad)
5. El sistema eliminará:
   - ✅ Usuario de Supabase Auth
   - ✅ Referencias en profile_users
   - ✅ Referencias en usuarios
   - ✅ Referencias en usuarios_empresa
   - ✅ Opcionalmente: todas las referencias en documentos, despachos, etc.

### Opción 2: Línea de Comandos (Para casos urgentes)
```bash
# Desde la carpeta del proyecto
node scripts/eliminar_usuario.js email@ejemplo.com
```

## 🔒 Niveles de Eliminación

### Eliminación Básica
- Elimina solo las referencias principales
- Mantiene documentos y despachos creados por el usuario
- **Usa esto** si solo quieres liberar el email

### Eliminación Completa  
- Elimina TODAS las referencias del usuario
- Incluye documentos, despachos, camiones, etc.
- **Usa esto** si quieres limpiar completamente al usuario

## ⚠️ Consideraciones Importantes

### Seguridad
- ✅ **Múltiples confirmaciones** antes de eliminar
- ✅ **Resumen detallado** de lo que se va a eliminar
- ✅ **Verificación de referencias** existentes
- ✅ **No es reversible** - ten cuidado

### Después de la Eliminación
- ✅ **Email liberado**: Se puede usar inmediatamente para registrar un nuevo usuario
- ✅ **Datos preservados**: Los documentos pueden mantenerse (según el nivel elegido)
- ✅ **Audit trail**: Las operaciones quedan registradas en logs

## 🚀 Casos de Uso Comunes

### 1. Usuario Demo/Prueba
```
Problema: Creaste "demo@empresa.com" para probar, ahora necesitas ese email para un usuario real
Solución: Eliminación completa para limpiar todos los datos de prueba
```

### 2. Email Corporativo Reasignado
```
Problema: "admin@empresa.com" era de Juan, ahora es de María
Solución: Eliminación básica para liberar el email, mantener documentos históricos
```

### 3. Error en Registro
```
Problema: Registraste mal el email, ahora está bloqueado
Solución: Eliminación básica inmediata para corregir
```

### 4. Empleado que Renunció
```
Problema: "empleado@empresa.com" ya no trabaja aquí, necesitamos reasignar el email
Solución: Eliminación completa para limpiar todos sus datos
```

## 🔧 Troubleshooting

### Error: "Usuario no encontrado"
- Verifica que el email esté escrito correctamente
- El script muestra todos los usuarios disponibles si no encuentra el email

### Error: "No se pudo eliminar de auth.users"
- Puede ser un problema de permisos
- Verifica que SUPABASE_SERVICE_ROLE_KEY esté configurado

### Error: "Referencias en tablas adicionales"
- Usa la eliminación completa
- O elimina manualmente las referencias específicas

## 💡 Tips Pro

### Para Administradores
1. **Haz respaldo** antes de eliminaciones masivas
2. **Documenta** qué usuarios eliminas y por qué
3. **Usa la interfaz web** para operaciones regulares
4. **Usa el script** solo para urgencias o eliminaciones masivas

### Para Desarrolladores
1. El endpoint `/api/admin/eliminar-usuario` está disponible para integraciones
2. El script `eliminar_usuario.js` se puede importar como módulo
3. Todos los logs aparecen en la consola para debugging

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs del navegador (F12 → Console)
2. Revisa los logs del servidor
3. Usa el script de línea de comandos para más detalles
4. Verifica la configuración de Supabase

---
**✅ Resultado**: Con esta funcionalidad, nunca más tendrás emails "bloqueados" en Supabase. Puedes limpiar y reutilizar cualquier email de forma segura y controlada.