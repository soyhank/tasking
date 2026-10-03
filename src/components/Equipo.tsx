'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Persona } from '@/lib/tipos';
import { Avatar } from './TarjetaCompromiso';

type Form = { nombre: string; apodos: string; cargo: string; correo: string; whatsapp: string; es_gerencia: boolean };
const VACIO: Form = { nombre: '', apodos: '', cargo: '', correo: '', whatsapp: '', es_gerencia: false };

function Formulario({ inicial, onListo, onCancelar, id }: { inicial: Form; onListo: () => void; onCancelar?: () => void; id?: string }) {
  const [f, setF] = useState(inicial);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  return (
    <form
      className="grid gap-3 md:grid-cols-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setGuardando(true);
        setError('');
        const r = await fetch(id ? `/api/personas/${id}` : '/api/personas', { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
        setGuardando(false);
        if (!r.ok) return setError((await r.json().catch(() => ({}))).error || 'No se pudo guardar.');
        if (!id) setF(VACIO);
        onListo();
      }}
    >
      <label className="md:col-span-2">
        <span className="etiqueta">Nombre</span>
        <input required value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} className="campo" placeholder="María Quispe" />
      </label>
      <label className="md:col-span-2">
        <span className="etiqueta">Cómo le dicen</span>
        <input value={f.apodos} onChange={(e) => setF({ ...f, apodos: e.target.value })} className="campo" placeholder="Mari, Mary" />
      </label>
      <label className="md:col-span-2">
        <span className="etiqueta">Cargo</span>
        <input value={f.cargo} onChange={(e) => setF({ ...f, cargo: e.target.value })} className="campo" placeholder="Ventas" />
      </label>
      <label className="md:col-span-2">
        <span className="etiqueta">WhatsApp</span>
        <input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} className="campo" placeholder="987 654 321" inputMode="tel" />
      </label>
      <label className="md:col-span-2">
        <span className="etiqueta">Correo</span>
        <input type="email" value={f.correo} onChange={(e) => setF({ ...f, correo: e.target.value })} className="campo" placeholder="maria@empresa.com" />
      </label>
      <label className="flex items-end gap-2 pb-2.5 md:col-span-2">
        <input type="checkbox" checked={f.es_gerencia} onChange={(e) => setF({ ...f, es_gerencia: e.target.checked })} className="size-4 accent-marca-600" />
        <span className="text-sm text-slate-700">Gerencia (recibe actas y reportes)</span>
      </label>
      <div className="flex items-center gap-2 md:col-span-6">
        <button disabled={guardando} className="btn-primario">{guardando ? 'Guardando…' : id ? 'Guardar' : 'Agregar al equipo'}</button>
        {onCancelar && <button type="button" onClick={onCancelar} className="btn-claro">Cancelar</button>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

export default function Equipo({ personas, base }: { personas: Persona[]; base: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | null>(null);
  const [nota, setNota] = useState<Record<string, string>>({});
  const listo = () => {
    setEditando(null);
    router.refresh();
  };

  async function prueba(p: Persona) {
    setNota((n) => ({ ...n, [p.id]: 'Enviando…' }));
    const r = await fetch('/api/mensajes/prueba', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ persona_id: p.id }) });
    const d = await r.json().catch(() => ({}));
    setNota((n) => ({ ...n, [p.id]: r.ok ? `Prueba en cola (${d.canales.join(' y ')}). Revisa el estado en la página WhatsApp.` : d.error }));
  }

  async function activar(p: Persona) {
    await fetch(`/api/personas/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: !p.activo }) });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Equipo</h1>
        <p className="text-sm text-slate-500">Registra a cada trabajador con su WhatsApp y correo. Los apodos ayudan a la IA a reconocerlo en la conversación.</p>
      </div>

      <section className="tarjeta p-5">
        <h2 className="mb-3 font-semibold text-slate-800">Agregar persona</h2>
        <Formulario inicial={VACIO} onListo={listo} />
      </section>

      <section className="space-y-2.5">
        {personas.map((p) =>
          editando === p.id ? (
            <div key={p.id} className="tarjeta p-5">
              <Formulario
                id={p.id}
                inicial={{ nombre: p.nombre, apodos: p.apodos, cargo: p.cargo, correo: p.correo ?? '', whatsapp: p.whatsapp ?? '', es_gerencia: p.es_gerencia }}
                onListo={listo}
                onCancelar={() => setEditando(null)}
              />
            </div>
          ) : (
            <div key={p.id} className={`tarjeta flex flex-col gap-3 p-4 md:flex-row md:items-center ${p.activo ? '' : 'opacity-50'}`}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar nombre={p.nombre} id={p.id} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                    {p.nombre}
                    {p.es_gerencia && <span className="chip bg-violet-50 text-violet-700">Gerencia</span>}
                    {!p.activo && <span className="chip bg-slate-100 text-slate-500">Inactivo</span>}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {[p.cargo, p.apodos && `«${p.apodos}»`, p.whatsapp ? `+${p.whatsapp}` : 'sin WhatsApp', p.correo ?? 'sin correo'].filter(Boolean).join(' · ')}
                  </div>
                  {nota[p.id] && <div className="mt-1 text-xs text-marca-700">{nota[p.id]}</div>}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => navigator.clipboard.writeText(`${base}/c/${p.token}`).then(() => setNota((n) => ({ ...n, [p.id]: 'Enlace personal copiado.' })))}
                  className="btn-claro btn-chico"
                >
                  Copiar enlace
                </button>
                {p.activo && <button onClick={() => prueba(p)} className="btn-claro btn-chico">Enviar prueba</button>}
                <button onClick={() => setEditando(p.id)} className="btn-claro btn-chico">Editar</button>
                <button onClick={() => activar(p)} className="btn-claro btn-chico">{p.activo ? 'Desactivar' : 'Activar'}</button>
              </div>
            </div>
          ),
        )}
      </section>
    </div>
  );
}
