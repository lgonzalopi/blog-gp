-- Ejecutar una sola vez en Supabase: Project → SQL Editor → New query → pegar y correr.

create table if not exists notas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null default 'Sin título',
  cuerpo text not null,
  creado_en timestamptz not null default now()
);

-- Palabras clave: le dicen al lector de qué trata la nota antes de abrirla.
alter table notas add column if not exists keywords text[] not null default '{}';

create index if not exists notas_creado_en_idx on notas (creado_en desc);

-- RLS activado: por defecto nadie puede leer ni escribir desde el cliente.
-- Todas las operaciones pasan por las rutas API de Next.js, que usan la
-- service_role key (con permisos totales, nunca expuesta al navegador).
alter table notas enable row level security;
