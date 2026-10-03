'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FormIngreso() {
  const router = useRouter();
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  return (
    <form
      className="mt-5 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setCargando(true);
        setError('');
        const r = await fetch('/api/sesion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave }) });
        setCargando(false);
        if (!r.ok) return setError((await r.json().catch(() => ({}))).error || 'No se pudo entrar.');
        router.push('/');
        router.refresh();
      }}
    >
      <label className="block">
        <span className="etiqueta">Contraseña</span>
        <input type="password" autoFocus value={clave} onChange={(e) => setClave(e.target.value)} className="campo" />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={cargando || !clave} className="btn-primario w-full">
        {cargando ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
