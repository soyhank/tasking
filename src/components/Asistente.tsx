'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from './Logo';

type Estado = { variables: boolean; tablas: boolean; configurado: boolean; autoInstalable: boolean; error?: string };

async function llamar(accion: string, datos: Record<string, unknown> = {}) {
  const r = await fetch('/api/configurar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion, ...datos }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Algo salió mal.');
  return d;
}

function Paso({ n, titulo, listo, activo, children }: { n: number; titulo: string; listo: boolean; activo: boolean; children: React.ReactNode }) {
  return (
    <section className={`tarjeta p-5 transition ${activo ? 'ring-4 ring-marca-100' : ''} ${!activo && !listo ? 'opacity-60' : ''}`}>
      <h2 className="flex items-center gap-3 font-semibold text-slate-900">
        <span className={`grid size-7 shrink-0 place-items-center rounded-full text-sm ${listo ? 'bg-emerald-500 text-white' : activo ? 'bg-marca-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{listo ? '✓' : n}</span>
        {titulo}
      </h2>
      {(activo || listo) && <div className="mt-3 pl-10">{children}</div>}
    </section>
  );
}

function Enlace({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-marca-600 underline-offset-2 hover:underline">
      {children} ↗
    </a>
  );
}

export default function Asistente({ estadoInicial, esquema, refSupabase, sql }: { estadoInicial: Estado; esquema: string; refSupabase: string | null; sql: string | null }) {
  const router = useRouter();
  const [estado, setEstado] = useState(estadoInicial);
  const [ocupado, setOcupado] = useState('');
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [f, setF] = useState({ empresa: '', clave: '', clave2: '', gemini: '', smtpUsuario: '', smtpClave: '', smtpPara: '' });
  const [geminiOk, setGeminiOk] = useState<string[] | null>(null);
  const [correo, setCorreo] = useState<'pendiente' | 'ok' | 'omitido'>('pendiente');
  const [cuenta, setCuenta] = useState(false);

  async function hacer(nombre: string, fn: () => Promise<void>) {
    setOcupado(nombre);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    }
    setOcupado('');
  }

  const pasoActual = !estado.variables ? 1 : !estado.tablas ? 2 : !cuenta ? 3 : !geminiOk ? 4 : correo === 'pendiente' ? 5 : 6;
  const errorDe = (paso: number) => pasoActual === paso && error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-10">
      <div className="text-center">
        <Logo className="text-2xl" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Instalemos Tasking</h1>
        <p className="mt-1 text-sm text-slate-500">Cinco pasos con tus propias cuentas gratuitas. Tus datos quedan en tu base de datos, no en la de nadie más.</p>
      </div>

      <Paso n={1} titulo="Conectar la base de datos (Supabase)" listo={estado.variables} activo={pasoActual === 1}>
        {estado.variables ? (
          <p className="text-sm text-slate-600">Conectado a tu proyecto de Supabase.</p>
        ) : (
          <div className="space-y-2 text-sm text-slate-600">
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>Crea una cuenta y un proyecto gratis en <Enlace href="https://supabase.com/dashboard/new">supabase.com</Enlace>. Elige la región São Paulo si estás en Sudamérica.</li>
              <li>En el proyecto, ve a <b>Project Settings → API Keys</b> y copia la clave <b>secret</b> (o <i>service_role</i>). También copia la <b>Project URL</b> (en <b>Data API</b>).</li>
              <li>
                En Vercel, abre tu proyecto → <b>Settings → Environment Variables</b> y agrega <code className="rounded bg-slate-100 px-1">SUPABASE_URL</code> y{' '}
                <code className="rounded bg-slate-100 px-1">SUPABASE_SERVICE_KEY</code>. Luego, en <b>Deployments</b>, pulsa <b>Redeploy</b>.
              </li>
            </ol>
            <p className="text-xs text-slate-400">Si conectas Supabase desde el Marketplace de Vercel, estas variables se crean solas.</p>
            <button onClick={() => router.refresh()} className="btn-primario mt-2">Ya lo hice, verificar</button>
          </div>
        )}
      </Paso>

      <Paso n={2} titulo="Crear las tablas" listo={estado.tablas} activo={pasoActual === 2}>
        {estado.tablas ? (
          <p className="text-sm text-slate-600">Tablas, funciones y tarea automática de cada minuto creadas.</p>
        ) : estado.autoInstalable ? (
          <div className="space-y-2 text-sm text-slate-600">
            <p>Se detectó la conexión directa a Postgres: Tasking puede crear todo solo.</p>
            <button
              disabled={!!ocupado}
              onClick={() =>
                hacer('bd', async () => {
                  await llamar('instalar_bd');
                  setEstado({ ...estado, tablas: true });
                })
              }
              className="btn-primario"
            >
              {ocupado === 'bd' ? 'Creando…' : 'Crear las tablas automáticamente'}
            </button>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-slate-600">
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>Copia este código.</li>
              <li>
                Ábrelo en {refSupabase ? <Enlace href={`https://supabase.com/dashboard/project/${refSupabase}/sql/new`}>el SQL Editor de tu proyecto</Enlace> : <b>Supabase → SQL Editor</b>}, pégalo y pulsa <b>Run</b>.
              </li>
              {esquema !== 'public' && (
                <li>
                  Como usas el esquema <code className="rounded bg-slate-100 px-1">{esquema}</code>, agrégalo en <b>Project Settings → Data API → Exposed schemas</b>.
                </li>
              )}
            </ol>
            <div className="relative">
              <textarea readOnly value={sql ?? ''} className="h-40 w-full rounded-xl border border-slate-200 bg-slate-900 p-3 font-mono text-[11px] text-slate-200" />
              <button
                onClick={() => navigator.clipboard.writeText(sql ?? '').then(() => setCopiado(true))}
                className="btn-chico btn absolute top-2 right-2 bg-white text-slate-800"
              >
                {copiado ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
            <button
              disabled={!!ocupado}
              onClick={() =>
                hacer('bd', async () => {
                  await llamar('verificar_bd');
                  setEstado({ ...estado, tablas: true });
                })
              }
              className="btn-primario"
            >
              {ocupado === 'bd' ? 'Verificando…' : 'Ya lo ejecuté, verificar'}
            </button>
          </div>
        )}
        {errorDe(2)}
      </Paso>

      <Paso n={3} titulo="Tu empresa y la contraseña del operador" listo={cuenta} activo={pasoActual === 3}>
        {cuenta ? (
          <p className="text-sm text-slate-600">{f.empresa || 'Sin nombre de empresa'} · contraseña lista.</p>
        ) : (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setError('');
              if (f.clave.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
              if (f.clave !== f.clave2) return setError('Las contraseñas no coinciden.');
              setCuenta(true);
            }}
          >
            <label className="sm:col-span-2">
              <span className="etiqueta">Nombre de la empresa</span>
              <input value={f.empresa} onChange={(e) => setF({ ...f, empresa: e.target.value })} className="campo" placeholder="Mi Empresa S.A.C." />
            </label>
            <label>
              <span className="etiqueta">Contraseña del operador</span>
              <input type="password" value={f.clave} onChange={(e) => setF({ ...f, clave: e.target.value })} className="campo" autoComplete="new-password" />
            </label>
            <label>
              <span className="etiqueta">Repítela</span>
              <input type="password" value={f.clave2} onChange={(e) => setF({ ...f, clave2: e.target.value })} className="campo" autoComplete="new-password" />
            </label>
            <p className="text-xs text-slate-500 sm:col-span-2">El operador es quien graba las reuniones y administra el equipo. Los trabajadores no necesitan contraseña: entran con su enlace personal.</p>
            <div className="sm:col-span-2">
              <button className="btn-primario">Continuar</button>
            </div>
          </form>
        )}
        {pasoActual === 3 && error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </Paso>

      <Paso n={4} titulo="Inteligencia artificial (Gemini, gratis)" listo={!!geminiOk} activo={pasoActual === 4}>
        {geminiOk ? (
          <p className="text-sm text-slate-600">Clave válida · {geminiOk.length} modelos disponibles.</p>
        ) : (
          <div className="space-y-3 text-sm text-slate-600">
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>Entra a <Enlace href="https://aistudio.google.com/apikey">Google AI Studio</Enlace> con una cuenta de Google.</li>
              <li>Pulsa <b>Create API key</b> (crear clave) y cópiala.</li>
            </ol>
            <input value={f.gemini} onChange={(e) => setF({ ...f, gemini: e.target.value })} className="campo font-mono" placeholder="Pega aquí la clave" />
            <button
              disabled={!f.gemini.trim() || !!ocupado}
              onClick={() => hacer('gemini', async () => setGeminiOk((await llamar('probar_gemini', { clave: f.gemini })).modelos))}
              className="btn-primario"
            >
              {ocupado === 'gemini' ? 'Probando…' : 'Probar la clave'}
            </button>
            <p className="text-xs text-slate-400">El plan gratuito alcanza de sobra para las actas de una empresa.</p>
          </div>
        )}
        {errorDe(4)}
      </Paso>

      <Paso n={5} titulo="Correo para enviar los avisos (opcional)" listo={correo !== 'pendiente'} activo={pasoActual === 5}>
        {correo !== 'pendiente' ? (
          <p className="text-sm text-slate-600">{correo === 'ok' ? `Los correos saldrán desde ${f.smtpUsuario}.` : 'Sin correo por ahora; puedes configurarlo después en Ajustes.'}</p>
        ) : (
          <div className="space-y-3 text-sm text-slate-600">
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>Usa una cuenta de Gmail (mejor una creada para esto). Debe tener activada la <b>verificación en dos pasos</b>.</li>
              <li>Crea una <Enlace href="https://myaccount.google.com/apppasswords">contraseña de aplicación</Enlace> con el nombre «Tasking» y copia los 16 caracteres.</li>
            </ol>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={f.smtpUsuario} onChange={(e) => setF({ ...f, smtpUsuario: e.target.value })} className="campo" placeholder="avisos@gmail.com" type="email" />
              <input value={f.smtpClave} onChange={(e) => setF({ ...f, smtpClave: e.target.value })} className="campo font-mono" placeholder="abcd efgh ijkl mnop" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={!f.smtpUsuario || !f.smtpClave || !!ocupado}
                onClick={() =>
                  hacer('correo', async () => {
                    await llamar('probar_correo', { usuario: f.smtpUsuario, clave: f.smtpClave, empresa: f.empresa });
                    setCorreo('ok');
                  })
                }
                className="btn-primario"
              >
                {ocupado === 'correo' ? 'Enviando prueba…' : 'Enviarme un correo de prueba'}
              </button>
              <button onClick={() => setCorreo('omitido')} className="btn-claro">Omitir por ahora</button>
            </div>
          </div>
        )}
        {errorDe(5)}
      </Paso>

      {pasoActual === 6 && (
        <section className="tarjeta p-5 text-center">
          <p className="font-semibold text-slate-900">Todo listo</p>
          <p className="mt-1 text-sm text-slate-500">Después registra a tu equipo y conecta el WhatsApp desde el menú.</p>
          <button
            disabled={!!ocupado}
            onClick={() =>
              hacer('guardar', async () => {
                await llamar('guardar', {
                  empresa: f.empresa,
                  clave_operador: f.clave,
                  gemini_key: f.gemini,
                  smtp_usuario: correo === 'ok' ? f.smtpUsuario : undefined,
                  smtp_clave: correo === 'ok' ? f.smtpClave : undefined,
                });
                router.push('/equipo');
                router.refresh();
              })
            }
            className="btn-primario mt-4 px-8 py-3 text-base"
          >
            {ocupado === 'guardar' ? 'Guardando…' : 'Terminar instalación'}
          </button>
          {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </section>
      )}
    </div>
  );
}
