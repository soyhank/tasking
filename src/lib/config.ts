import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { db, supabaseClave, supabaseUrl } from './db';

// Configuración de la instalación, guardada en la tabla `ajustes` (clave 'config').
// Las variables de entorno con el mismo propósito, si existen, sirven de respaldo.

export interface Smtp {
  usuario: string;
  clave: string;
  host?: string;
  puerto?: number;
  remitente?: string;
}

export interface Config {
  empresa: string;
  admin_hash: string | null;
  gemini_key: string | null;
  gemini_modelo: string | null;
  smtp: Smtp | null;
}

const VACIA: Config = { empresa: '', admin_hash: null, gemini_key: null, gemini_modelo: null, smtp: null };

let cache: { valor: Config; en: number } | null = null;

async function leerGuardada(): Promise<Partial<Config>> {
  try {
    const { data } = await db().from('ajustes').select('valor').eq('clave', 'config').maybeSingle();
    return (data?.valor as Partial<Config>) ?? {};
  } catch {
    return {};
  }
}

export async function config(): Promise<Config> {
  if (cache && Date.now() - cache.en < 15_000) return cache.valor;
  const g = await leerGuardada();
  const smtpEnv: Smtp | null =
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? {
          usuario: process.env.SMTP_USER,
          clave: process.env.SMTP_PASS,
          host: process.env.SMTP_HOST,
          puerto: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
          remitente: process.env.SMTP_FROM_NAME,
        }
      : null;
  const valor: Config = {
    ...VACIA,
    ...g,
    empresa: g.empresa || process.env.EMPRESA || '',
    gemini_key: g.gemini_key || process.env.GEMINI_API_KEY || null,
    gemini_modelo: g.gemini_modelo || process.env.GEMINI_MODEL || null,
    smtp: g.smtp?.usuario ? g.smtp : smtpEnv,
  };
  cache = { valor, en: Date.now() };
  return valor;
}

export async function guardarConfig(cambios: Partial<Config>) {
  const actual = await leerGuardada();
  const valor = { ...actual, ...cambios };
  const { error } = await db().from('ajustes').upsert({ clave: 'config', valor, actualizado_en: new Date().toISOString() });
  if (error) throw new Error(error.message);
  cache = null;
}

// --- Contraseña del operador (hash scrypt) ---
export function hashClave(clave: string) {
  const sal = randomBytes(16);
  return `scrypt$${sal.toString('base64')}$${scryptSync(clave, sal, 32).toString('base64')}`;
}

function verificarHash(clave: string, hash: string) {
  const [, sal, esperado] = hash.split('$');
  if (!sal || !esperado) return false;
  const calculado = scryptSync(clave, Buffer.from(sal, 'base64'), 32);
  const b = Buffer.from(esperado, 'base64');
  return calculado.length === b.length && timingSafeEqual(calculado, b);
}

export async function claveOperadorCorrecta(clave: string) {
  const c = await config();
  if (c.admin_hash) return verificarHash(clave, c.admin_hash);
  const env = process.env.ADMIN_PASSWORD || '';
  const a = Buffer.from(clave);
  const b = Buffer.from(env);
  return env.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

// --- Secretos derivados ---
// Se calculan a partir de la clave de servicio de Supabase: así no hay que configurarlos
// a mano y solo quien tiene esa clave (el dueño de la instalación) puede conocerlos.
function derivado(nombre: string) {
  const base = supabaseClave();
  if (!base) throw new Error('Falta la clave de servicio de Supabase.');
  return createHmac('sha256', base).update(`tasking:${nombre}`).digest('base64url').slice(0, 40);
}

export function secretoSesion() {
  return process.env.SESSION_SECRET || derivado('sesion');
}

/** Clave que usan el cron de Supabase y el programa de WhatsApp para hablar con la app. */
export function claveServicio() {
  return process.env.CRON_SECRET || derivado('servicio');
}

// --- Estado de la instalación ---
export interface EstadoInstalacion {
  variables: boolean; // SUPABASE_URL + clave de servicio presentes
  tablas: boolean; // el esquema SQL ya se aplicó
  configurado: boolean; // ya hay contraseña de operador
  autoInstalable: boolean; // hay cadena de conexión Postgres: se pueden crear las tablas solas
  error?: string;
}

export function urlPostgres() {
  return process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
}

export async function estadoInstalacion(): Promise<EstadoInstalacion> {
  const variables = !!(supabaseUrl() && supabaseClave());
  const autoInstalable = !!urlPostgres();
  if (!variables) return { variables, tablas: false, configurado: false, autoInstalable };
  const { error } = await db().from('ajustes').select('clave').limit(1);
  if (error) return { variables, tablas: false, configurado: false, autoInstalable, error: error.message };
  const c = await config();
  return { variables, tablas: true, configurado: !!(c.admin_hash || process.env.ADMIN_PASSWORD), autoInstalable };
}
