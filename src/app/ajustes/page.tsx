import { redirect } from 'next/navigation';
import { esAdmin } from '@/lib/auth';
import { claveServicio, config } from '@/lib/config';
import { appUrl, ESQUEMA } from '@/lib/db';
import { sqlInstalacion } from '@/lib/esquema-sql';
import { comandoInstalarWorker } from '@/lib/worker-instalacion';
import Ajustes from '@/components/Ajustes';
import ComandoWorker from '@/components/ComandoWorker';

export const metadata = { title: 'Ajustes' };

const ocultar = (s: string | null | undefined) => (s ? `${s.slice(0, 4)}••••••••${s.slice(-4)}` : null);

export default async function Pagina() {
  if (!(await esAdmin())) redirect('/ingresar');
  const c = await config();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ajustes</h1>
        <p className="text-sm text-slate-500">Las cuentas y claves de esta instalación. Se guardan en tu propia base de datos.</p>
      </div>
      <Ajustes empresa={c.empresa} gemini={ocultar(c.gemini_key)} correo={c.smtp?.usuario ?? null} />
      <section className="tarjeta p-5">
        <h2 className="mb-3 font-semibold text-slate-800">PC servidor de WhatsApp</h2>
        <ComandoWorker comando={comandoInstalarWorker()} />
      </section>
      <details className="tarjeta p-5">
        <summary className="cursor-pointer font-semibold text-slate-800">Base de datos (SQL de instalación)</summary>
        <p className="mt-2 text-sm text-slate-500">
          Si actualizas Tasking a una versión nueva, vuelve a ejecutar este SQL en Supabase → SQL Editor. No borra datos. Esquema: <code>{ESQUEMA}</code>.
        </p>
        <textarea readOnly value={sqlInstalacion({ esquema: ESQUEMA, appUrl: appUrl(), claveServicio: claveServicio() })} className="mt-3 h-48 w-full rounded-xl bg-slate-900 p-3 font-mono text-[11px] text-slate-200" />
      </details>
    </div>
  );
}
