'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BotonReintentar() {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  return (
    <button
      disabled={ocupado}
      className="btn-claro btn-chico"
      onClick={async () => {
        setOcupado(true);
        await fetch('/api/mensajes/reintentar', { method: 'POST' });
        setOcupado(false);
        router.refresh();
      }}
    >
      Reintentar
    </button>
  );
}
