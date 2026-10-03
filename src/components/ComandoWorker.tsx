'use client';
import { useState } from 'react';

/** Comando de una línea para instalar el programa de WhatsApp en la PC servidor (Windows). */
export default function ComandoWorker({ comando }: { comando: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="space-y-2 text-sm text-slate-600">
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>
          En la PC que quedará siempre encendida, instala <a href="https://nodejs.org/es/download" target="_blank" rel="noreferrer" className="font-semibold text-marca-600">Node.js ↗</a> (versión LTS) si no lo tiene.
        </li>
        <li>
          Abre <b>PowerShell</b> (menú Inicio → escribe «PowerShell»), pega este comando y pulsa Enter. No necesita permisos de administrador.
        </li>
        <li>Vuelve a la página WhatsApp: en unos segundos aparece el QR para escanear.</li>
      </ol>
      <div className="relative">
        <pre className="overflow-x-auto rounded-xl bg-slate-900 p-3 pr-20 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all text-slate-200">{comando}</pre>
        <button onClick={() => navigator.clipboard.writeText(comando).then(() => setCopiado(true))} className="btn-chico btn absolute top-2 right-2 bg-white text-slate-800">
          {copiado ? '✓ Copiado' : 'Copiar'}
        </button>
      </div>
      <p className="text-xs text-slate-400">Queda instalado en segundo plano: arranca solo al iniciar sesión en Windows y se reinicia si se cae. El comando contiene la clave de tu instalación: no lo compartas.</p>
    </div>
  );
}
