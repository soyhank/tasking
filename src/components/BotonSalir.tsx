'use client';
import { useRouter } from 'next/navigation';

export default function BotonSalir() {
  const router = useRouter();
  return (
    <button
      className="rounded-lg px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      onClick={async () => {
        await fetch('/api/sesion', { method: 'DELETE' });
        router.push('/ingresar');
        router.refresh();
      }}
    >
      Salir
    </button>
  );
}
