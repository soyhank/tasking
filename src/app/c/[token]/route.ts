import { NextResponse } from 'next/server';
import { recordarPersona } from '@/lib/auth';
import { db } from '@/lib/db';

// Enlace personal que llega por WhatsApp/correo: deja la sesión del trabajador y lo lleva a su lista.
export async function GET(req: Request, ctx: RouteContext<'/c/[token]'>) {
  const { token } = await ctx.params;
  const { data } = await db().from('personas').select('id').eq('token', token).eq('activo', true).maybeSingle();
  if (!data) return NextResponse.redirect(new URL('/ingresar', req.url));
  await recordarPersona(token);
  return NextResponse.redirect(new URL('/mis-compromisos', req.url));
}
