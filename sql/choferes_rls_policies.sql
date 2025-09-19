-- Habilitar RLS para choferes
aLTER TABLE choferes ENABLE ROW LEVEL SECURITY;

-- Permitir que el usuario dueño del transporte vea y edite sus choferes
create policy if not exists "Choferes: acceso por transporte" on choferes
  for select using (auth.uid() = id_transporte or auth.role() = 'service_role');

create policy if not exists "Choferes: insertar si es dueño" on choferes
  for insert with check (auth.uid() = id_transporte or auth.role() = 'service_role');

create policy if not exists "Choferes: actualizar si es dueño" on choferes
  for update using (auth.uid() = id_transporte or auth.role() = 'service_role');

create policy if not exists "Choferes: borrar si es dueño" on choferes
  for delete using (auth.uid() = id_transporte or auth.role() = 'service_role');
