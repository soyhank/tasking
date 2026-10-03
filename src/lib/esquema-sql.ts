// SQL que crea todo lo que Tasking necesita en un proyecto de Supabase.
// El asistente /configurar lo aplica solo (si hay cadena de conexión Postgres) o lo muestra para pegarlo
// en Supabase → SQL Editor. Es idempotente: se puede volver a ejecutar sin perder datos.

export function sqlInstalacion(o: { esquema: string; appUrl: string; claveServicio: string }) {
  const E = o.esquema;
  const urlCron = `${o.appUrl}/api/cron?key=${o.claveServicio}`.replace(/'/g, "''");
  return `-- Tasking · instalación de la base de datos
create extension if not exists pgcrypto with schema extensions;
create schema if not exists ${E};
grant usage on schema ${E} to service_role;

create table if not exists ${E}.personas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apodos text not null default '',
  cargo text not null default '',
  correo text,
  whatsapp text,
  es_gerencia boolean not null default false,
  activo boolean not null default true,
  token text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  creado_en timestamptz not null default now()
);

create table if not exists ${E}.reuniones (
  id uuid primary key default gen_random_uuid(),
  titulo text not null default 'Reunión',
  inicio timestamptz not null default now(),
  fin timestamptz,
  estado text not null default 'grabando' check (estado in ('grabando', 'procesando', 'lista', 'error')),
  participantes uuid[] not null default '{}',
  transcripcion text not null default '',
  audio_partes int not null default 0,
  resumen text,
  temas jsonb not null default '[]',
  acuerdos_generales jsonb not null default '[]',
  modelo text,
  fuente text,
  error text,
  intentos int not null default 0,
  procesado_en timestamptz,
  creado_en timestamptz not null default now()
);
alter table ${E}.reuniones add column if not exists intentos int not null default 0;
alter table ${E}.reuniones add column if not exists procesado_en timestamptz;

create table if not exists ${E}.compromisos (
  id uuid primary key default gen_random_uuid(),
  numero bigserial unique,
  reunion_id uuid references ${E}.reuniones(id) on delete set null,
  persona_id uuid references ${E}.personas(id) on delete set null,
  responsable_texto text,
  descripcion text not null,
  vence_en timestamptz,
  hora_definida boolean not null default false,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_curso', 'hecho', 'anulado')),
  cita text,
  hecho_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists compromisos_persona_idx on ${E}.compromisos (persona_id, estado);
create index if not exists compromisos_vence_idx on ${E}.compromisos (estado, vence_en);

create table if not exists ${E}.mensajes (
  id uuid primary key default gen_random_uuid(),
  canal text not null check (canal in ('whatsapp', 'correo')),
  tipo text not null default 'aviso',
  persona_id uuid references ${E}.personas(id) on delete cascade,
  compromiso_id uuid references ${E}.compromisos(id) on delete cascade,
  reunion_id uuid references ${E}.reuniones(id) on delete cascade,
  destino text not null,
  asunto text,
  cuerpo text not null,
  html text,
  enviar_en timestamptz not null default now(),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'enviando', 'enviado', 'error', 'cancelado')),
  intentos int not null default 0,
  error text,
  enviado_en timestamptz,
  creado_en timestamptz not null default now()
);
create index if not exists mensajes_cola_idx on ${E}.mensajes (canal, estado, enviar_en);

create table if not exists ${E}.ajustes (
  clave text primary key,
  valor jsonb not null default '{}',
  actualizado_en timestamptz not null default now()
);

-- Solo el servidor (clave de servicio) puede leer y escribir: RLS activo y sin políticas
alter table ${E}.personas enable row level security;
alter table ${E}.reuniones enable row level security;
alter table ${E}.compromisos enable row level security;
alter table ${E}.mensajes enable row level security;
alter table ${E}.ajustes enable row level security;
grant all on all tables in schema ${E} to service_role;
grant all on all sequences in schema ${E} to service_role;

create or replace function ${E}.agregar_texto(p_reunion uuid, p_texto text)
returns void language sql security definer set search_path = ${E} as $$
  update ${E}.reuniones
     set transcripcion = case when transcripcion = '' then p_texto else transcripcion || ' ' || p_texto end
   where id = p_reunion and estado = 'grabando';
$$;

create or replace function ${E}.tomar_mensajes(p_canal text, p_limite int default 10)
returns setof ${E}.mensajes language sql security definer set search_path = ${E} as $$
  update ${E}.mensajes m
     set estado = 'enviando', intentos = intentos + 1
   where m.id in (
     select id from ${E}.mensajes
      where canal = p_canal
        and (estado = 'pendiente' or (estado = 'enviando' and enviar_en < now() - interval '10 minutes'))
        and enviar_en <= now()
        and intentos < 5
      order by enviar_en
      limit p_limite
      for update skip locked)
  returning m.*;
$$;

revoke all on function ${E}.agregar_texto(uuid, text) from public, anon, authenticated;
revoke all on function ${E}.tomar_mensajes(text, int) from public, anon, authenticated;
grant execute on function ${E}.agregar_texto(uuid, text) to service_role;
grant execute on function ${E}.tomar_mensajes(text, int) to service_role;

-- Cada minuto Supabase llama a la app: correos, recordatorios del día y reportes a gerencia
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.unschedule(jobname) from cron.job where jobname = 'tasking_tick_${E}';
select cron.schedule('tasking_tick_${E}', '* * * * *', $cron$select net.http_get(url := '${urlCron}', timeout_milliseconds := 55000)$cron$);

-- Avisa a la API de Supabase que hay tablas nuevas (si no, tarda unos minutos en verlas)
notify pgrst, 'reload schema';
`;
}
