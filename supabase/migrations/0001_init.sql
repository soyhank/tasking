-- Tasking: actas de reunión → compromisos → avisos por WhatsApp y correo.
-- Vive en su propio esquema `tasking` dentro del proyecto Supabase compartido.
-- RLS activado SIN políticas: solo el servidor (service role) lee y escribe.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists tasking;
grant usage on schema tasking to service_role;

-- Trabajadores del equipo
create table if not exists tasking.personas (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  apodos       text not null default '',          -- «Chucho, Jesu» para que la IA los reconozca
  cargo        text not null default '',
  correo       text,
  whatsapp     text,                               -- solo dígitos con código de país: 51987654321
  es_gerencia  boolean not null default false,     -- recibe los reportes
  activo       boolean not null default true,
  token        text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  creado_en    timestamptz not null default now()
);

create table if not exists tasking.reuniones (
  id                 uuid primary key default gen_random_uuid(),
  titulo             text not null default 'Reunión',
  inicio             timestamptz not null default now(),
  fin                timestamptz,
  estado             text not null default 'grabando'
                     check (estado in ('grabando', 'procesando', 'lista', 'error')),
  participantes      uuid[] not null default '{}',
  transcripcion      text not null default '',
  audio_partes       int not null default 0,
  resumen            text,
  temas              jsonb not null default '[]',
  acuerdos_generales jsonb not null default '[]',
  modelo             text,
  fuente             text,                         -- 'texto' (subtítulos en vivo) o 'audio'
  error              text,
  creado_en          timestamptz not null default now()
);

create table if not exists tasking.compromisos (
  id             uuid primary key default gen_random_uuid(),
  numero         bigserial unique,                 -- código corto: «listo 154» por WhatsApp
  reunion_id     uuid references tasking.reuniones(id) on delete set null,
  persona_id     uuid references tasking.personas(id) on delete set null,
  responsable_texto text,                          -- nombre tal como lo dijo la IA (si no se reconoció)
  descripcion    text not null,
  vence_en       timestamptz,
  hora_definida  boolean not null default false,
  estado         text not null default 'pendiente'
                 check (estado in ('pendiente', 'en_curso', 'hecho', 'anulado')),
  cita           text,
  hecho_en       timestamptz,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists compromisos_persona_idx on tasking.compromisos (persona_id, estado);
create index if not exists compromisos_vence_idx on tasking.compromisos (estado, vence_en);

-- Bandeja de salida: cada aviso programado (WhatsApp lo envía el worker local, correo lo envía Vercel)
create table if not exists tasking.mensajes (
  id             uuid primary key default gen_random_uuid(),
  canal          text not null check (canal in ('whatsapp', 'correo')),
  tipo           text not null default 'aviso',    -- asignacion, recordatorio, vencido, agenda, reporte, prueba
  persona_id     uuid references tasking.personas(id) on delete cascade,
  compromiso_id  uuid references tasking.compromisos(id) on delete cascade,
  reunion_id     uuid references tasking.reuniones(id) on delete cascade,
  destino        text not null,
  asunto         text,
  cuerpo         text not null,
  html           text,
  enviar_en      timestamptz not null default now(),
  estado         text not null default 'pendiente'
                 check (estado in ('pendiente', 'enviando', 'enviado', 'error', 'cancelado')),
  intentos       int not null default 0,
  error          text,
  enviado_en     timestamptz,
  creado_en      timestamptz not null default now()
);
create index if not exists mensajes_cola_idx on tasking.mensajes (canal, estado, enviar_en);

-- Estado del WhatsApp (QR, conectado), marcas de tareas diarias ya hechas, etc.
create table if not exists tasking.ajustes (
  clave          text primary key,
  valor          jsonb not null default '{}',
  actualizado_en timestamptz not null default now()
);

alter table tasking.personas    enable row level security;
alter table tasking.reuniones   enable row level security;
alter table tasking.compromisos enable row level security;
alter table tasking.mensajes    enable row level security;
alter table tasking.ajustes     enable row level security;

grant all on all tables in schema tasking to service_role;
grant all on all sequences in schema tasking to service_role;

-- Agrega texto a la transcripción sin pisar lo que llegó en paralelo
create or replace function tasking.agregar_texto(p_reunion uuid, p_texto text)
returns void language sql security definer set search_path = tasking as $$
  update tasking.reuniones
     set transcripcion = case when transcripcion = '' then p_texto else transcripcion || ' ' || p_texto end
   where id = p_reunion and estado = 'grabando';
$$;

-- Toma un lote de mensajes vencidos de un canal y los marca 'enviando' (evita envíos dobles)
create or replace function tasking.tomar_mensajes(p_canal text, p_limite int default 10)
returns setof tasking.mensajes language sql security definer set search_path = tasking as $$
  update tasking.mensajes m
     set estado = 'enviando', intentos = intentos + 1
   where m.id in (
     select id from tasking.mensajes
      where canal = p_canal
        and (estado = 'pendiente' or (estado = 'enviando' and enviar_en < now() - interval '10 minutes'))
        and enviar_en <= now()
        and intentos < 5
      order by enviar_en
      limit p_limite
      for update skip locked)
  returning m.*;
$$;

revoke all on function tasking.agregar_texto(uuid, text) from public, anon, authenticated;
revoke all on function tasking.tomar_mensajes(text, int) from public, anon, authenticated;
grant execute on function tasking.agregar_texto(uuid, text) to service_role;
grant execute on function tasking.tomar_mensajes(text, int) to service_role;
