import { claveServicioCorrecta } from '@/lib/auth';
import { db } from '@/lib/db';
import { fallo, json } from '@/lib/api';

// El worker informa si está conectado y, mientras no lo esté, el QR para escanear desde el panel.
export async function POST(req: Request) {
  if (!claveServicioCorrecta(req)) return fallo('Clave inválida.', 401);
  const b = await req.json().catch(() => ({}));
  const valor = {
    conectado: !!b.conectado,
    qr: b.conectado ? null : (b.qr ?? null),
    numero: b.numero ?? null,
    nombre: b.nombre ?? null,
    detalle: b.detalle ?? null,
    latido: new Date().toISOString(),
  };
  await db().from('ajustes').upsert({ clave: 'whatsapp', valor, actualizado_en: valor.latido });
  return json({ ok: true });
}
