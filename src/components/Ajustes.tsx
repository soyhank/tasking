'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

async function llamar(accion: string, datos: Record<string, unknown> = {}) {
  const r = await fetch('/api/configurar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion, ...datos }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Algo salió mal.');
  return d;
}

function Bloque({ titulo, actual, children }: { titulo: string; actual?: React.ReactNode; children: (cerrar: () => void) => React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="border-b border-slate-100 py-4 first:pt-0 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-800">{titulo}</div>
          <div className="truncate text-sm text-slate-500">{actual}</div>
        </div>
        <button onClick={() => setAbierto(!abierto)} className="btn-claro btn-chico">{abierto ? 'Cancelar' : 'Cambiar'}</button>
      </div>
      {abierto && <div className="mt-3">{children(() => setAbierto(false))}</div>}
    </div>
  );
}

export default function Ajustes({ empresa, gemini, correo }: { empresa: string; gemini: string | null; correo: string | null }) {
  const router = useRouter();
  const [v, setV] = useState({ empresa, clave: '', gemini: '', smtpUsuario: '', smtpClave: '' });
  const [ocupado, setOcupado] = useState(false);
  const [nota, setNota] = useState<{ ok: boolean; texto: string } | null>(null);

  async function guardar(datos: Record<string, unknown>, cerrar: () => void, mensaje: string) {
    setOcupado(true);
    setNota(null);
    try {
      await llamar('ajustes', datos);
      setNota({ ok: true, texto: mensaje });
      cerrar();
      router.refresh();
    } catch (e) {
      setNota({ ok: false, texto: (e as Error).message });
    }
    setOcupado(false);
  }

  return (
    <section className="tarjeta p-5">
      {nota && <p className={`mb-4 rounded-xl px-3 py-2 text-sm ${nota.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{nota.texto}</p>}

      <Bloque titulo="Empresa" actual={empresa || 'Sin nombre'}>
        {(cerrar) => (
          <div className="flex gap-2">
            <input value={v.empresa} onChange={(e) => setV({ ...v, empresa: e.target.value })} className="campo" />
            <button disabled={ocupado} onClick={() => guardar({ empresa: v.empresa }, cerrar, 'Nombre guardado.')} className="btn-primario">Guardar</button>
          </div>
        )}
      </Bloque>

      <Bloque titulo="Contraseña del operador" actual="••••••••">
        {(cerrar) => (
          <div className="flex gap-2">
            <input type="password" value={v.clave} onChange={(e) => setV({ ...v, clave: e.target.value })} className="campo" placeholder="Nueva contraseña (mín. 8)" autoComplete="new-password" />
            <button disabled={ocupado || v.clave.length < 8} onClick={() => guardar({ clave_operador: v.clave }, cerrar, 'Contraseña cambiada.')} className="btn-primario">Guardar</button>
          </div>
        )}
      </Bloque>

      <Bloque titulo="Clave de Gemini" actual={gemini ? <span className="font-mono">{gemini}</span> : <span className="text-red-600">Falta configurar</span>}>
        {(cerrar) => (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              Créala gratis en <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="font-semibold text-marca-600">Google AI Studio ↗</a>. Se prueba antes de guardar.
            </p>
            <div className="flex gap-2">
              <input value={v.gemini} onChange={(e) => setV({ ...v, gemini: e.target.value })} className="campo font-mono" placeholder="Nueva clave" />
              <button disabled={ocupado || !v.gemini.trim()} onClick={() => guardar({ gemini_key: v.gemini }, cerrar, 'Clave de Gemini probada y guardada.')} className="btn-primario">{ocupado ? 'Probando…' : 'Guardar'}</button>
            </div>
          </div>
        )}
      </Bloque>

      <Bloque titulo="Correo de envío (Gmail)" actual={correo ?? <span className="text-amber-700">Sin configurar: los correos quedan en cola</span>}>
        {(cerrar) => (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              Cuenta de Gmail con verificación en dos pasos y una{' '}
              <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="font-semibold text-marca-600">contraseña de aplicación ↗</a>. Se envía un correo de prueba antes de guardar.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={v.smtpUsuario} onChange={(e) => setV({ ...v, smtpUsuario: e.target.value })} className="campo" placeholder="avisos@gmail.com" type="email" />
              <input value={v.smtpClave} onChange={(e) => setV({ ...v, smtpClave: e.target.value })} className="campo font-mono" placeholder="abcd efgh ijkl mnop" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={ocupado || !v.smtpUsuario || !v.smtpClave}
                onClick={async () => {
                  setOcupado(true);
                  setNota(null);
                  try {
                    await llamar('probar_correo', { usuario: v.smtpUsuario, clave: v.smtpClave, empresa });
                  } catch (e) {
                    setOcupado(false);
                    return setNota({ ok: false, texto: `La prueba falló: ${(e as Error).message}` });
                  }
                  setOcupado(false);
                  await guardar({ smtp_usuario: v.smtpUsuario, smtp_clave: v.smtpClave }, cerrar, `Correo configurado: te llegó una prueba a ${v.smtpUsuario}.`);
                }}
                className="btn-primario"
              >
                {ocupado ? 'Probando…' : 'Probar y guardar'}
              </button>
              {correo && <button disabled={ocupado} onClick={() => guardar({ smtp_borrar: true }, cerrar, 'Correo desactivado.')} className="btn-claro">Quitar correo</button>}
            </div>
          </div>
        )}
      </Bloque>
    </section>
  );
}
