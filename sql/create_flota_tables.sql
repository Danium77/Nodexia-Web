-- Tabla para camiones
create table if not exists camiones (
    id uuid primary key default gen_random_uuid(),
    patente text not null unique,
    marca text not null,
    modelo text not null,
    anio integer,
    foto_url text,
    id_transporte uuid not null, -- referencia al transporte dueño
    fecha_alta timestamptz default now(),
    usuario_alta uuid references auth.users(id)
);

create index if not exists camiones_patente_idx on camiones(patente);
create index if not exists camiones_id_transporte_idx on camiones(id_transporte);

-- Tabla para acoplados
create table if not exists acoplados (
    id uuid primary key default gen_random_uuid(),
    patente text not null unique,
    marca text not null,
    modelo text not null,
    anio integer,
    foto_url text,
    id_transporte uuid not null, -- referencia al transporte dueño
    fecha_alta timestamptz default now(),
    usuario_alta uuid references auth.users(id)
);

create index if not exists acoplados_patente_idx on acoplados(patente);
create index if not exists acoplados_id_transporte_idx on acoplados(id_transporte);
