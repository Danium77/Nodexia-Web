-- Migration 021: Agregar campo DNI a usuarios_empresa
-- Fecha: 2025-12-19
-- Descripción: Permite registrar el DNI del usuario al momento de creación
-- Uso: Necesario para vincular choferes con su DNI posteriormente

BEGIN;

-- Agregar columna dni si no existe
ALTER TABLE public.usuarios_empresa
ADD COLUMN IF NOT EXISTS dni TEXT;

-- Crear índice para búsquedas rápidas por DNI
CREATE INDEX IF NOT EXISTS usuarios_empresa_dni_idx ON public.usuarios_empresa(dni);

-- Comentarios para documentación
COMMENT ON COLUMN public.usuarios_empresa.dni IS 'Documento Nacional de Identidad - usado para vincular choferes';

COMMIT;

-- Validación: Verificar que el campo existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'usuarios_empresa' 
    AND column_name = 'dni'
  ) THEN
    RAISE NOTICE '✅ Migración 021 completada: Campo dni agregado exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Migración 021 FALLÓ: Campo dni no se agregó correctamente';
  END IF;
END $$;
