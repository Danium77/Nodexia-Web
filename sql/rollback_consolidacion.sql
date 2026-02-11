-- ============================================================================
-- ROLLBACK: Restaurar desde backup (si es necesario)
-- ============================================================================
-- IMPORTANTE: Este script NO puede recuperar los datos si ya se ejecutó
-- la consolidación. Solo está como referencia.
-- 
-- Para hacer rollback real, debes tener un backup de la BD antes de ejecutar
-- el script de consolidación.
-- ============================================================================

-- Para hacer rollback:
-- 1. Restaurar desde backup de Supabase
-- 2. O ejecutar: pg_restore desde un dump previo

-- Verificar si hay backup:
SELECT 
    'ADVERTENCIA: No hay rollback automático' as advertencia,
    'Debes restaurar desde backup de Supabase si algo salió mal' as instruccion;

-- Para prevenir problemas futuros, ejecuta esto ANTES de consolidar:
-- pg_dump -h <host> -U <user> -d <database> > backup_antes_consolidacion.sql
