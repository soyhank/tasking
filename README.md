# Tasking

Actas de reunión con compromisos. Quien dirige la reunión pulsa **Grabar**, se conversa con normalidad, al final se repasan los acuerdos en voz alta y se pulsa **Terminar**. En menos de un minuto:

1. La IA (Gemini) arma el acta: resumen, acuerdos generales y **compromisos por persona** con fecha y hora.
2. Cada trabajador recibe **su lista** por WhatsApp y correo, con un enlace personal para marcar lo que termina.
3. Se programan los recordatorios: **30 min antes, 5 min antes, aviso de vencido** y una **agenda diaria a las 8 a. m.**
4. Gerencia recibe el acta, un **cierre diario a las 6 p. m.** con lo vencido y un **reporte semanal los lunes**.

En vivo: https://tasking-actas.vercel.app

## Piezas

| Pieza | Dónde corre | Qué hace |
|---|---|---|
| Web (Next.js 16) | Vercel, proyecto `soyhanks-projects/tasking-app` | Grabadora, tablero kanban, actas, equipo, reportes |
| Base de datos | Supabase, esquema `tasking` dentro del proyecto `dotapuesta` | Personas, reuniones, compromisos, bandeja de mensajes |
| Cron | Supabase `pg_cron` (job `tasking_tick`) | Llama a `/api/cron` cada minuto: correos, agenda, reportes |
| WhatsApp | `worker/` en una PC encendida | Se vincula por QR a un chip secundario y envía la cola |

## Transcripción

- **En vivo:** subtítulos del navegador (Web Speech API). Funciona en **Chrome o Edge** con internet.
- **Respaldo:** el audio se sube en partes de 15 s. Si los subtítulos captaron menos de 40 palabras, Gemini transcribe el audio completo al terminar.

## WhatsApp (worker)

1. Usar un **chip secundario**, nunca un número personal: la vinculación por QR no es la API oficial y WhatsApp puede bloquear el número.
2. Doble clic en `worker\iniciar.bat` (la primera vez instala dependencias). Necesita Node.js.
3. Escanear el QR desde la página **WhatsApp** de la web (o en la ventana negra) con *Dispositivos vinculados*.
4. Mientras el worker esté apagado, los mensajes quedan en cola y salen al encenderlo.
5. Para que arranque con Windows: acceso directo a `iniciar.bat` en `shell:startup`.

Respuestas que entiende: `listo 154` (o `listo 154, 160`), `pendientes`, `ayuda`.

## Correo

Gmail con contraseña de aplicación: variables `SMTP_USER` y `SMTP_PASS` en Vercel (opcional `SMTP_FROM_NAME`, o `SMTP_HOST`/`SMTP_PORT` para otro proveedor). Sin ellas, los correos quedan en cola.

## Variables de entorno (Vercel)

`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `CRON_SECRET`, `APP_URL`, `SMTP_USER`, `SMTP_PASS`.
El worker usa `worker/.env` con `APP_URL` y `TASKING_KEY` (= `CRON_SECRET`).

## Desarrollo

```bash
npm install
npm run dev
node scripts/sql.mjs supabase/migrations/0001_init.sql   # requiere SUPABASE_ACCESS_TOKEN
vercel deploy --prod --yes
```
