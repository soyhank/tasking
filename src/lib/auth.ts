import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { claveOperadorCorrecta, claveServicio, secretoSesion } from './config';
import { db } from './db';
import type { Persona } from './tipos';

// Dos tipos de acceso:
//  - Operador (quien graba las reuniones y administra): contraseña creada en el asistente de instalación.
//  - Trabajador: entra con el enlace personal que le llega por WhatsApp/correo (/c/<token>).
const COOKIE_ADMIN = 'tk_admin';
const COOKIE_PERSONA = 'tk_persona';
const DURACION_S = 60 * 60 * 24 * 60; // 60 días

function secreto() {
  return secretoSesion();
}

function firmar(valor: string) {
  const firma = createHmac('sha256', secreto()).update(valor).digest('base64url');
  return `${valor}.${firma}`;
}

function verificar(firmado: string | undefined) {
  if (!firmado) return null;
  const i = firmado.lastIndexOf('.');
  if (i < 0) return null;
  const valor = firmado.slice(0, i);
  const esperado = Buffer.from(firmar(valor));
  const recibido = Buffer.from(firmado);
  if (esperado.length !== recibido.length || !timingSafeEqual(esperado, recibido)) return null;
  return valor;
}

const opcionesCookie = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: DURACION_S,
};

export async function claveAdminCorrecta(clave: string) {
  return claveOperadorCorrecta(clave);
}

export async function iniciarAdmin() {
  (await cookies()).set(COOKIE_ADMIN, firmar(`admin:${Date.now() + DURACION_S * 1000}`), opcionesCookie);
}

export async function cerrarSesion() {
  const c = await cookies();
  c.delete(COOKIE_ADMIN);
  c.delete(COOKIE_PERSONA);
}

export async function esAdmin() {
  const cookie = (await cookies()).get(COOKIE_ADMIN)?.value;
  if (!cookie) return false;
  const valor = verificar(cookie);
  if (!valor) return false;
  const exp = Number(valor.split(':')[1]);
  return Number.isFinite(exp) && exp > Date.now();
}

export async function recordarPersona(token: string) {
  (await cookies()).set(COOKIE_PERSONA, firmar(token), opcionesCookie);
}

export async function personaActual(): Promise<Persona | null> {
  const cookie = (await cookies()).get(COOKIE_PERSONA)?.value;
  if (!cookie) return null;
  const token = verificar(cookie);
  if (!token) return null;
  const { data } = await db().from('personas').select('*').eq('token', token).eq('activo', true).maybeSingle();
  return (data as Persona) ?? null;
}

/** Quién está mirando: operador, trabajador o nadie. */
export async function sesion() {
  try {
    const [admin, persona] = await Promise.all([esAdmin(), personaActual()]);
    return { admin, persona };
  } catch {
    // App aún sin instalar (faltan las variables de Supabase o las tablas)
    return { admin: false, persona: null };
  }
}

/** Para rutas que llaman el cron de Supabase y el worker de WhatsApp. */
export function claveServicioCorrecta(req: Request) {
  const esperado = claveServicio();
  const url = new URL(req.url);
  const recibido =
    req.headers.get('x-tasking-key') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    url.searchParams.get('key') ||
    '';
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  return esperado.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}
