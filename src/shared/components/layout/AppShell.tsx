'use client';

import { useEffect, useState, Suspense } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';

export function AppShell({
  children,
  conFooter = true,
}: {
  children: React.ReactNode;
  conFooter?: boolean;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [colapsado, setColapsado] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const guardado = localStorage.getItem('sidebar-colapsado');
      return guardado === '1';
    } catch {
      return false;
    }
  });

  const alternarMenu = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      setColapsado((prev) => {
        const nuevo = !prev;
        try {
          localStorage.setItem('sidebar-colapsado', nuevo ? '1' : '0');
        } catch {}
        return nuevo;
      });
    } else {
      setMenuAbierto((prev) => !prev);
    }
  };

  // En celular el cajón se cierra con Escape y el fondo no se desplaza mientras está abierto
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
    <div className="flex min-h-dvh bg-[#F1F5F9]">
      <Suspense fallback={<div className="w-14 h-screen sticky top-0 bg-[#0B192C] shrink-0" />}>
        <Sidebar
          abierto={menuAbierto}
          colapsado={colapsado}
          onCerrar={() => setMenuAbierto(false)}
        />
      </Suspense>

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenu={alternarMenu} />
        <main className="flex-1 flex flex-col p-2 sm:p-3 lg:p-3.5 xl:p-4 pb-2 overflow-y-auto max-w-full overflow-x-hidden">
          {children}
        </main>
        {conFooter && <Footer />}
      </div>
    </div>
  );
}
