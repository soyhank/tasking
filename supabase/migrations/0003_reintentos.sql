-- Reintento automático cuando Gemini está saturado
alter table tasking.reuniones add column if not exists intentos int not null default 0;
alter table tasking.reuniones add column if not exists procesado_en timestamptz;
