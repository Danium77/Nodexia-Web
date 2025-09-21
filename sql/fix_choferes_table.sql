-- Crear tabla choferes si no existe
CREATE TABLE IF NOT EXISTS public.choferes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    dni TEXT NOT NULL UNIQUE,
    telefono TEXT,
    email TEXT,
    foto_url TEXT,
    id_transporte UUID NOT NULL,
    fecha_alta TIMESTAMPTZ DEFAULT NOW(),
    usuario_alta UUID REFERENCES auth.users(id)
);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS choferes_dni_idx ON public.choferes(dni);
CREATE INDEX IF NOT EXISTS choferes_id_transporte_idx ON public.choferes(id_transporte);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.choferes ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen (para evitar errores)
DROP POLICY IF EXISTS "Choferes: acceso por transporte" ON public.choferes;
DROP POLICY IF EXISTS "Choferes: insertar si es dueño" ON public.choferes;
DROP POLICY IF EXISTS "Choferes: actualizar si es dueño" ON public.choferes;
DROP POLICY IF EXISTS "Choferes: borrar si es dueño" ON public.choferes;

-- Crear políticas de seguridad
CREATE POLICY "Choferes: acceso por transporte" 
ON public.choferes FOR SELECT 
USING (auth.uid() = id_transporte OR auth.role() = 'service_role');

CREATE POLICY "Choferes: insertar si es dueño" 
ON public.choferes FOR INSERT 
WITH CHECK (auth.uid() = id_transporte OR auth.role() = 'service_role');

CREATE POLICY "Choferes: actualizar si es dueño" 
ON public.choferes FOR UPDATE 
USING (auth.uid() = id_transporte OR auth.role() = 'service_role');

CREATE POLICY "Choferes: borrar si es dueño" 
ON public.choferes FOR DELETE 
USING (auth.uid() = id_transporte OR auth.role() = 'service_role');

-- Insertar un chofer de prueba (opcional)
INSERT INTO public.choferes (nombre, apellido, dni, telefono, id_transporte, usuario_alta)
VALUES ('Juan', 'Pérez', '12345678', '1122334455', 'c95bd7aa-b68c-4246-9b4f-16aeaa8454ee', 'c95bd7aa-b68c-4246-9b4f-16aeaa8454ee')
ON CONFLICT (dni) DO NOTHING;