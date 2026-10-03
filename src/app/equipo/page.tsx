import { redirect } from 'next/navigation';
import { esAdmin } from '@/lib/auth';
import { appUrl, db } from '@/lib/db';
import type { Persona } from '@/lib/tipos';
import Equipo from '@/components/Equipo';

export const metadata = { title: 'Equipo' };

export default async function Pagina() {
  if (!(await esAdmin())) redirect('/ingresar');
  const { data } = await db().from('personas').select('*').order('activo', { ascending: false }).order('nombre');
  return <Equipo personas={(data ?? []) as Persona[]} base={appUrl()} />;
}
