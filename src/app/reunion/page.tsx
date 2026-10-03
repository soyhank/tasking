import { redirect } from 'next/navigation';
import { esAdmin } from '@/lib/auth';
import { personasActivas } from '@/lib/consultas';
import { ahoraMs, DIAS, MESES, partesLima } from '@/lib/fechas';
import Grabadora from '@/components/Grabadora';

export const metadata = { title: 'Grabar reunión' };

export default async function Pagina() {
  if (!(await esAdmin())) redirect('/ingresar');
  const personas = await personasActivas();
  const p = partesLima(ahoraMs());
  const tituloSugerido = `Reunión del ${DIAS[p.diaSemana]} ${p.dia} ${MESES[p.mes - 1]}`;
  return <Grabadora personas={personas.map(({ id, nombre, apodos }) => ({ id, nombre, apodos }))} tituloSugerido={tituloSugerido} />;
}
