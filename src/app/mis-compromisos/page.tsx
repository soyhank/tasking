import { redirect } from 'next/navigation';
import { sesion } from '@/lib/auth';
import { compromisosTablero, titulosReuniones } from '@/lib/consultas';
import MisCompromisos from '@/components/MisCompromisos';

export const metadata = { title: 'Mis compromisos' };

export default async function Pagina() {
  const { persona } = await sesion();
  if (!persona) redirect('/ingresar');
  const compromisos = await compromisosTablero({ personaId: persona.id, diasHechos: 30 });
  const reuniones = await titulosReuniones(compromisos.map((c) => c.reunion_id));
  return <MisCompromisos persona={{ id: persona.id, nombre: persona.nombre }} compromisos={compromisos} reuniones={reuniones} />;
}
