import Link from 'next/link';
import { sesion } from '@/lib/auth';
import Logo from './Logo';
import Navegacion from './Navegacion';
import BotonSalir from './BotonSalir';

export default async function Encabezado() {
  const { admin, persona } = await sesion();
  const enlaces = admin
    ? [
        { href: '/', texto: 'Tablero' },
        { href: '/reuniones', texto: 'Reuniones' },
        { href: '/equipo', texto: 'Equipo' },
        { href: '/whatsapp', texto: 'WhatsApp' },
        { href: '/reportes', texto: 'Reportes' },
      ]
    : persona
      ? [
          { href: '/mis-compromisos', texto: 'Mis compromisos' },
          { href: '/', texto: 'Tablero del equipo' },
          { href: '/reportes', texto: 'Reportes' },
        ]
      : [];
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href={persona && !admin ? '/mis-compromisos' : '/'}>
          <Logo />
        </Link>
        {enlaces.length > 0 && <Navegacion enlaces={enlaces} />}
        <div className="ml-auto flex items-center gap-2">
          {admin && (
            <Link href="/reunion" className="btn-primario whitespace-nowrap">
              <span className="size-2 rounded-full bg-red-400" />
              <span className="hidden sm:inline">Grabar reunión</span>
              <span className="sm:hidden">Grabar</span>
            </Link>
          )}
          {persona && !admin && <span className="hidden text-sm text-slate-500 md:inline">{persona.nombre}</span>}
          {(admin || persona) && <BotonSalir />}
        </div>
      </div>
    </header>
  );
}
