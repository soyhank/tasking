import { redirect } from 'next/navigation';
import { sesion } from '@/lib/auth';
import { compromisosTablero, personasActivas, titulosReuniones } from '@/lib/consultas';
import Tablero from '@/components/Tablero';

export const metadata = { title: 'Tablero' };

export default async function Inicio() {
  const { admin, persona } = await sesion();
  if (!admin && !persona) redirect('/ingresar');
  const [compromisos, personas] = await Promise.all([compromisosTablero(), personasActivas()]);
  const reuniones = await titulosReuniones(compromisos.map((c) => c.reunion_id));
  return (
    <Tablero
      compromisos={compromisos}
      personas={personas.map(({ id, nombre, cargo }) => ({ id, nombre, cargo }))}
      reuniones={reuniones}
      admin={admin}
      yo={persona?.id ?? null}
    />
  );
}
