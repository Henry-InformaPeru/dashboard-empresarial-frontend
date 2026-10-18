'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';

// Estructura común de las pantallas con sesión: menú lateral (cajón en celular), cabecera, contenido y pie.
export function AppShell({
  children,
  conFooter = true,
}: {
  children: React.ReactNode;
  conFooter?: boolean;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  // En celular el menú es un cajón: se cierra con Escape y el fondo no se desplaza mientras está abierto
  useEffect(() => {
    if (!menuAbierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuAbierto(false);
    };
    document.addEventListener('keydown', alTeclear);
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = previo;
    };
  }, [menuAbierto]);

  return (
    <div className="flex min-h-dvh bg-[#E8ECF3]">
      <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenu={() => setMenuAbierto(true)} />
        <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
        {conFooter && <Footer />}
      </div>
    </div>
  );
}
