-- Script para corregir el constraint de tipo_empresa
-- Actualizar constraint para permitir los nuevos tipos de ecosistema

-- Eliminar el constraint existente
ALTER TABLE public.empresas DROP CONSTRAINT IF EXISTS empresas_tipo_empresa_check;

-- Crear nuevo constraint que incluya los tipos de ecosistema
ALTER TABLE public.empresas 
ADD CONSTRAINT empresas_tipo_empresas_check 
CHECK (tipo_empresa IN ('transporte', 'coordinador', 'Planta', 'Transporte', 'Cliente'));

-- Verificar empresas existentes
SELECT DISTINCT tipo_empresa FROM public.empresas;

COMMENT ON CONSTRAINT empresas_tipo_empresas_check ON public.empresas IS 'Permite tipos clásicos (transporte, coordinador) y nuevos tipos de ecosistema (Planta, Transporte, Cliente)';