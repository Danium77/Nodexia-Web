# 📦 Scripts Nodexia-Web

Este directorio contiene scripts de utilidad para setup, testing y mantenimiento del sistema.

## Estructura
- **setup/**: Scripts para inicialización y datos maestros
- **testing/**: Scripts para pruebas automáticas y verificación de datos
- Scripts raíz: utilidades generales, migraciones, fixes y depuración

## Uso recomendado
- Lee los comentarios al inicio de cada script para entender su propósito.
- Ejecuta los scripts de setup antes de los de testing.
- Los scripts de migración y fixes deben usarse solo si lo indica la documentación oficial.

## Scripts principales
- `setup_roles.js`: Configura roles base en la base de datos
- `setup_super_admin.js`: Vincula el usuario super admin
- `sync_auth_users_to_usuarios.js`: Sincroniza usuarios de Supabase Auth
- `test_final_roles.js`: Prueba la asignación de roles y permisos

## Scripts de testing
- `testing/check_users.js`: Verifica usuarios y roles
- `testing/check_db_quick.js`: Chequeo rápido de estructura
- `testing/check_all_dispatches.js`: Prueba despachos y asignaciones

## Scripts obsoletos o a revisar
- `fix_admin_user.js`, `fix-common-errors.js`, `debug_user_role.js`: Usar solo si lo indica la documentación

## Buenas prácticas
- Mantén los scripts actualizados y elimina los que ya no se usan
- Documenta cualquier cambio importante en este README
- Agrupa scripts nuevos en subcarpetas si crecen mucho

---
Para dudas o sugerencias, consulta la documentación oficial o contacta al equipo de desarrollo.
