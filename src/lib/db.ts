import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Cada instalación usa su propio proyecto de Supabase. Solo hacen falta dos variables de entorno;
// el resto (Gemini, correo, contraseña) se configura desde la app en /configurar.
export function supabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}

export function supabaseClave() {
  return process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
}

/** Esquema de Postgres donde viven las tablas (por defecto `public`, el de un proyecto nuevo). */
export const ESQUEMA = (process.env.SUPABASE_SCHEMA || 'public').replace(/[^a-z0-9_]/gi, '');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cliente: SupabaseClient<any, string> | null = null;

/** Cliente con la clave de servicio, solo para el servidor. */
export function db() {
  if (!cliente) {
    const url = supabaseUrl();
    const clave = supabaseClave();
    if (!url || !clave) throw new Error('Faltan SUPABASE_URL y SUPABASE_SERVICE_KEY en las variables de entorno.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cliente = createClient<any, string>(url, clave, {
      db: { schema: ESQUEMA },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cliente;
}

export const BUCKET_AUDIO = 'tasking-audio';

/** Dirección pública de la app (para los enlaces que van en WhatsApp y correo). */
export function appUrl() {
  const explicita = process.env.APP_URL;
  if (explicita) return explicita.replace(/\/$/, '');
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}
