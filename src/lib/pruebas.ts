import type { Smtp } from './config';
import { remitente, transporte } from './correo';
import { BUCKET_AUDIO, supabaseClave, supabaseUrl } from './db';

// Comprobaciones de las cuentas externas que pide el asistente de instalación.

export async function crearBucket() {
  const r = await fetch(`${supabaseUrl()}/storage/v1/bucket`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${supabaseClave()}`, apikey: supabaseClave(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: BUCKET_AUDIO, name: BUCKET_AUDIO, public: false }),
  });
  if (!r.ok && r.status !== 409) {
    const t = await r.text();
    if (!/already exists|Duplicate/i.test(t)) throw new Error(`No se pudo crear el almacén de audio: ${t.slice(0, 200)}`);
  }
}

export async function probarGemini(clave: string) {
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': clave } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.error?.message || `Google respondió HTTP ${r.status}`);
  const flash = ((d.models ?? []) as { name: string }[]).map((m) => m.name.replace('models/', '')).filter((n) => /^gemini-[\d.]+-flash$|^gemini-flash-latest$/.test(n));
  if (!flash.length) throw new Error('La clave funciona, pero no tiene acceso a ningún modelo Gemini Flash.');
  return flash;
}

export async function probarCorreo(s: Smtp, para: string, empresa: string) {
  await transporte(s).sendMail({
    from: remitente(s, empresa),
    to: para,
    subject: 'Prueba de Tasking',
    text: 'Si lees esto, el correo de Tasking quedó bien configurado.',
    html: '<p>Si lees esto, el correo de <b>Tasking</b> quedó bien configurado. ✅</p>',
  });
}
