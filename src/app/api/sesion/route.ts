import { cerrarSesion, claveAdminCorrecta, iniciarAdmin } from '@/lib/auth';
import { fallo, json } from '@/lib/api';

export async function POST(req: Request) {
  const { clave } = await req.json().catch(() => ({}));
  if (typeof clave !== 'string' || !(await claveAdminCorrecta(clave))) return fallo('Contraseña incorrecta.', 401);
  await iniciarAdmin();
  return json({ ok: true });
}

export async function DELETE() {
  await cerrarSesion();
  return json({ ok: true });
}
