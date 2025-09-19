-- Tabla para choferes
create table if not exists choferes (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    apellido text not null,
    dni text not null unique,
    telefono text,
    email text,
    foto_url text,
    id_transporte uuid not null, -- referencia al transporte dueño
    fecha_alta timestamptz default now(),
    usuario_alta uuid references auth.users(id)
);

create index if not exists choferes_dni_idx on choferes(dni);
create index if not exists choferes_id_transporte_idx on choferes(id_transporte);
