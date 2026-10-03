import nodemailer from 'nodemailer';
import { config, type Smtp } from './config';
import { db } from './db';
import type { Mensaje } from './tipos';

export async function correoConfigurado() {
  return !!(await config()).smtp?.usuario;
}

export function transporte(s: Smtp) {
  return nodemailer.createTransport(
    s.host
      ? { host: s.host, port: s.puerto || 465, secure: (s.puerto || 465) === 465, auth: { user: s.usuario, pass: s.clave } }
      : { service: 'gmail', auth: { user: s.usuario, pass: s.clave } },
  );
}

export function remitente(s: Smtp, empresa?: string) {
  return `"${s.remitente || (empresa ? `Tasking · ${empresa}` : 'Tasking')}" <${s.usuario}>`;
}

/** Envía los correos que ya tocan. Si el correo no está configurado, quedan en cola sin gastar intentos. */
export async function enviarCorreosPendientes(limite = 20) {
  const c = await config();
  if (!c.smtp?.usuario) return { enviados: 0, errores: 0, sinConfigurar: true };
  const { data, error } = await db().rpc('tomar_mensajes', { p_canal: 'correo', p_limite: limite });
  if (error) throw new Error(error.message);
  const lote = (data ?? []) as Mensaje[];
  if (!lote.length) return { enviados: 0, errores: 0 };
  const t = transporte(c.smtp);
  const de = remitente(c.smtp, c.empresa);
  let enviados = 0;
  let errores = 0;
  for (const m of lote) {
    try {
      await t.sendMail({ from: de, to: m.destino, subject: m.asunto || 'Aviso de Tasking', text: m.cuerpo, html: m.html || undefined });
      await db().from('mensajes').update({ estado: 'enviado', enviado_en: new Date().toISOString(), error: null }).eq('id', m.id);
      enviados++;
    } catch (e) {
      const final = m.intentos >= 5;
      await db()
        .from('mensajes')
        .update({ estado: final ? 'error' : 'pendiente', error: (e as Error).message.slice(0, 500), enviar_en: new Date(Date.now() + 5 * 60_000).toISOString() })
        .eq('id', m.id);
      errores++;
    }
  }
  return { enviados, errores };
}
