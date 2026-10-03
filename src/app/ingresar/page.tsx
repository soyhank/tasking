import { redirect } from 'next/navigation';
import { sesion } from '@/lib/auth';
import FormIngreso from './FormIngreso';

export const metadata = { title: 'Ingresar' };

export default async function Ingresar() {
  const { admin } = await sesion();
  if (admin) redirect('/');
  return (
    <div className="mx-auto mt-10 max-w-sm">
      <div className="tarjeta p-6">
        <h1 className="text-xl font-bold text-slate-900">Entrar como operador</h1>
        <p className="mt-1 text-sm text-slate-500">Para grabar reuniones y administrar el equipo.</p>
        <FormIngreso />
      </div>
      <p className="mt-4 px-2 text-center text-sm text-slate-500">
        ¿Eres parte del equipo? Entra con el enlace personal que te llegó por WhatsApp o correo.
      </p>
    </div>
  );
}
