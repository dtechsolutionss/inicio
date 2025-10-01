-- Actualizaciones de esquema para control de presupuestos, horas y adjuntos

-- 1. Campos adicionales en trabajos
alter table public.jobs
  add column if not exists presupuesto numeric,
  add column if not exists costo_real numeric,
  add column if not exists horas_estimadas numeric,
  add column if not exists horas_reales numeric;

-- 2. Campos adicionales en tareas
alter table public.tasks
  add column if not exists horas_invertidas numeric,
  add column if not exists deliverables jsonb;

update public.tasks
set deliverables = coalesce(deliverables, '[]'::jsonb)
where deliverables is null;

-- 3. Tabla para adjuntos de tareas
create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_url text,
  created_at timestamp with time zone default timezone('utc', now())
);

create index if not exists task_attachments_task_id_idx on public.task_attachments(task_id);

-- 4. Bucket público para almacenar adjuntos
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', true)
on conflict (id) do nothing;

-- 5. Políticas básicas para que los usuarios autenticados puedan gestionar adjuntos de sus tareas
create policy if not exists "allow authenticated read task attachments"
  on storage.objects for select using (
    bucket_id = 'task-attachments' and auth.role() = 'authenticated'
  );

create policy if not exists "allow authenticated upload task attachments"
  on storage.objects for insert with check (
    bucket_id = 'task-attachments' and auth.role() = 'authenticated'
  );

create policy if not exists "allow authenticated delete task attachments"
  on storage.objects for delete using (
    bucket_id = 'task-attachments' and auth.role() = 'authenticated'
  );
