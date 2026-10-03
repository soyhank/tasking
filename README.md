# Tasking

**Actas de reunión que se convierten solas en compromisos con recordatorios por WhatsApp y correo.**

Quien dirige la reunión pulsa **Grabar**, se conversa con normalidad, al final se repasan los acuerdos en voz alta («María: enviar la cotización, hoy a las 4 de la tarde») y se pulsa **Terminar**. En menos de un minuto:

1. La IA (Gemini, gratis) arma el acta: resumen, acuerdos generales y **compromisos por persona** con fecha y hora.
2. Cada trabajador recibe **su lista** por WhatsApp y correo, con un enlace personal para marcar lo que termina (o responde `listo 154` por WhatsApp).
3. Se programan los recordatorios: **30 y 5 minutos antes**, **aviso de vencido** y una **agenda diaria a las 8 a. m.**
4. Gerencia recibe el acta, un **cierre diario a las 6 p. m.** con lo vencido y un **reporte semanal** los lunes.

Incluye tablero kanban del equipo, actas editables, reportes de cumplimiento por persona y página personal para cada trabajador (sin contraseña).

Software libre (licencia MIT). Cada instalación usa **sus propias cuentas gratuitas**: nada pasa por servidores de terceros salvo los tuyos.

---

## Instalación (unos 15 minutos)

Necesitas tres cuentas gratuitas: **GitHub**, **Vercel** y **Supabase**. Durante la instalación la app te pide además una clave de **Google AI Studio** (Gemini, gratis) y, si quieres correo, una cuenta de **Gmail**.

### 1. Base de datos

1. Crea un proyecto gratis en [supabase.com](https://supabase.com/dashboard/new) (en Sudamérica, región São Paulo).
2. En **Project Settings → API Keys**, copia la clave **secret** (o `service_role`). En **Data API**, copia la **Project URL**.

### 2. Publicar la app

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsoyhank%2Ftasking&project-name=tasking&env=SUPABASE_URL,SUPABASE_SERVICE_KEY&envDescription=La%20Project%20URL%20y%20la%20clave%20secret%20de%20tu%20proyecto%20de%20Supabase&envLink=https%3A%2F%2Fgithub.com%2Fsoyhank%2Ftasking%23instalaci%C3%B3n-unos-15-minutos)

Pulsa el botón, pega las dos variables (`SUPABASE_URL` y `SUPABASE_SERVICE_KEY`) y espera a que termine.

### 3. Asistente de instalación

Abre la dirección que te dio Vercel. Un asistente te guía paso a paso:

1. **Tablas:** copia el SQL que te muestra y pégalo en Supabase → SQL Editor → Run (si conectaste Supabase desde el Marketplace de Vercel, lo hace solo).
2. **Empresa y contraseña** del operador.
3. **Clave de Gemini:** se crea en [Google AI Studio](https://aistudio.google.com/apikey) y se prueba en el momento.
4. **Correo (opcional):** Gmail con una [contraseña de aplicación](https://myaccount.google.com/apppasswords); te envía una prueba.

Todo se puede cambiar después en **Ajustes**.

### 4. WhatsApp

Los WhatsApp salen desde un **chip secundario** vinculado por QR, igual que WhatsApp Web. Como eso necesita una conexión abierta todo el día, corre en una **PC que quede siempre encendida** (la «PC servidor», con Windows):

1. Instala [Node.js](https://nodejs.org/es/download) (LTS) en esa PC.
2. En Tasking, ve a **Ajustes → PC servidor de WhatsApp**, copia el comando y pégalo en **PowerShell**. No necesita administrador.
3. Abre la página **WhatsApp** de Tasking y escanea el QR desde el celular del chip (*Dispositivos vinculados → Vincular un dispositivo*).

El programa queda en segundo plano: arranca solo al iniciar sesión en Windows y se reinicia si se cae. Desde la web puedes generar un QR nuevo o desvincular el número. Si la PC está apagada, los mensajes esperan en cola.

> ⚠️ **Usa un chip secundario, nunca tu número personal.** La vinculación por QR no es la API oficial de WhatsApp y WhatsApp puede bloquear números que envían mensajes automáticos. Tasking envía con pausas (5 a 11 s, máximo 6 por minuto) para parecerse al uso normal, pero el riesgo no es cero.

---

## Uso

- **Grabar reunión:** en Chrome o Edge se ven subtítulos en vivo. Si fallan, el audio grabado se transcribe al terminar.
- **Equipo:** registra a cada trabajador con su WhatsApp, correo y apodos (para que la IA lo reconozca). «Enviar prueba» comprueba que le llega.
- **Respuestas por WhatsApp:** `listo 154`, `listo 154, 160`, `pendientes`, `ayuda`.

## Cómo está hecho

| Pieza | Dónde corre | Qué hace |
|---|---|---|
| Web (Next.js 16) | Vercel | Grabadora, tablero, actas, equipo, reportes, asistente y ajustes |
| Base de datos | Supabase (Postgres + Storage) | Personas, reuniones, compromisos, cola de mensajes, configuración |
| Tarea de cada minuto | Supabase `pg_cron` | Llama a `/api/cron`: correos, agenda, reportes, reintentos |
| WhatsApp | `worker/` en la PC servidor | Baileys vinculado por QR; toma la cola de la web y responde a «listo» |
| IA | Gemini (Google AI Studio) | Acta y compromisos en JSON; transcripción del audio como respaldo |

Variables de entorno: solo `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` (ver `.env.example` para las opcionales). Los secretos internos (sesiones y clave del cron/worker) se derivan de la clave de Supabase.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # completa las dos variables de Supabase
npm run dev                  # abre http://localhost:3000 y sigue el asistente
```

Probar la extracción con una reunión guardada: `npx tsx --env-file=.env.local scripts/probar-gemini.mts <id-de-reunión>`.

## Licencia

MIT. Úsalo, modifícalo y compártelo libremente.
