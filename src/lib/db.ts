import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cliente: SupabaseClient<any, 'tasking'> | null = null;

/** Cliente con la clave de servicio, solo para el servidor. Todo vive en el esquema `tasking`. */
export function db() {
  if (!cliente) {
    const url = process.env.SUPABASE_URL;
    const clave = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !clave) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cliente = createClient<any, 'tasking'>(url, clave, {
      db: { schema: 'tasking' },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cliente;
}

export const BUCKET_AUDIO = 'tasking-audio';

export function appUrl() {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}
