import { claveServicioCorrecta } from '@/lib/auth';
import { tareasProgramadas } from '@/lib/avisos';
import { enviarCorreosPendientes } from '@/lib/correo';
import { fallo, json } from '@/lib/api';

export const maxDuration = 60;

// Lo llama Supabase (pg_cron) cada minuto, y también el worker de WhatsApp como respaldo.
export async function GET(req: Request) {
  if (!claveServicioCorrecta(req)) return fallo('Clave inválida.', 401);
  const tareas = await tareasProgramadas();
  const correo = await enviarCorreosPendientes();
  return json({ ok: true, tareas, correo });
}
