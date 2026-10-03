import nodemailer from 'nodemailer';
import { db } from './db';
import type { Mensaje } from './tipos';

export function correoConfigurado() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transporte() {
  const host = process.env.SMTP_HOST;
  return nodemailer.createTransport(
    host
      ? { host, port: Number(process.env.SMTP_PORT || 465), secure: Number(process.env.SMTP_PORT || 465) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }
      : { service: 'gmail', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } },
  );
}

/** Envía los correos que ya tocan. Si el correo no está configurado, quedan en cola sin gastar intentos. */
export async function enviarCorreosPendientes(limite = 20) {
  if (!correoConfigurado()) return { enviados: 0, errores: 0, sinConfigurar: true };
  const { data, error } = await db().rpc('tomar_mensajes', { p_canal: 'correo', p_limite: limite });
  if (error) throw new Error(error.message);
  const lote = (data ?? []) as Mensaje[];
  if (!lote.length) return { enviados: 0, errores: 0 };
  const t = transporte();
  const remitente = `"${process.env.SMTP_FROM_NAME || 'Tasking'}" <${process.env.SMTP_USER}>`;
  let enviados = 0;
  let errores = 0;
  for (const m of lote) {
    try {
      await t.sendMail({ from: remitente, to: m.destino, subject: m.asunto || 'Aviso de Tasking', text: m.cuerpo, html: m.html || undefined });
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
