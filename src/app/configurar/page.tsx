import { redirect } from 'next/navigation';
import { claveServicio, estadoInstalacion } from '@/lib/config';
import { appUrl, ESQUEMA, supabaseUrl } from '@/lib/db';
import { sqlInstalacion } from '@/lib/esquema-sql';
import Asistente from '@/components/Asistente';

export const metadata = { title: 'Instalación' };

export default async function Pagina() {
  const estado = await estadoInstalacion().catch((e) => ({ variables: false, tablas: false, configurado: false, autoInstalable: false, error: (e as Error).message }));
  if (estado.configurado) redirect('/ingresar');
  const ref = supabaseUrl().match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? null;
  return (
    <Asistente
      estadoInicial={estado}
      esquema={ESQUEMA}
      refSupabase={ref}
      sql={estado.variables ? sqlInstalacion({ esquema: ESQUEMA, appUrl: appUrl(), claveServicio: claveServicio() }) : null}
    />
  );
}
