-- Tabla para gestionar documentos subidos por cualquier rol/entidad
create table if not exists documentos (
    id uuid primary key default gen_random_uuid(),
    bucket text not null default 'documentacion-general',
    path text not null, -- ruta dentro del bucket
    url text generated always as (bucket || '/' || path) stored,
    tipo text not null, -- ej: 'constancia_inscripcion', 'dni', 'seguro', etc
    entidad text not null, -- ej: 'transporte', 'chofer', 'planta', 'cliente'
    id_entidad uuid not null, -- id de la entidad relacionada
    nombre_archivo text not null,
    extension text,
    usuario_subio uuid references auth.users(id),
    fecha_subida timestamptz default now(),
    observaciones text
);

-- Índices útiles
create index if not exists documentos_entidad_idx on documentos(entidad, id_entidad);
create index if not exists documentos_tipo_idx on documentos(tipo);
create index if not exists documentos_usuario_idx on documentos(usuario_subio);
