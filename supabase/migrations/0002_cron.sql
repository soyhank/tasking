-- Cada minuto Supabase llama a /api/cron (correos, agenda de las 8 a. m., reportes a gerencia).
-- La clave real se pone al aplicar; en el repo queda el marcador.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.unschedule('tasking_tick') where exists (select 1 from cron.job where jobname = 'tasking_tick');
select cron.schedule('tasking_tick', '* * * * *', $$select net.http_get(url := 'https://tasking-actas.vercel.app/api/cron?key=__CRON_SECRET__', timeout_milliseconds := 55000)$$);
