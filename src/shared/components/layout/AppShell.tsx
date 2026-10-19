'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';

// Preferencia «menú oculto» en escritorio: se recuerda en este navegador
const CLAVE_MENU_OCULTO = 'menu-oculto';
const oyentes = new Set<() => void>();
const suscribir = (aviso: () => void) => {
  oyentes.add(aviso);
  return () => {
    oyentes.delete(aviso);
  };
};
const leerMenuOculto = () => {
  try {
    return localStorage.getItem(CLAVE_MENU_OCULTO) === '1';
  } catch {
    return false;
  }
};
const guardarMenuOculto = (oculto: boolean) => {
  try {
    localStorage.setItem(CLAVE_MENU_OCULTO, oculto ? '1' : '0');
  } catch {
    /* sin almacenamiento: queda solo para esta visita */
  }
  oyentes.forEach((aviso) => aviso());
};

// Estructura común de las pantallas con sesión: menú lateral, cabecera, contenido y pie.
// En celular y tablet el menú es un cajón; en escritorio se puede ocultar para dar más espacio al reporte.
export function AppShell({
  children,
  conFooter = true,
}: {
  children: React.ReactNode;
  conFooter?: boolean;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuOculto = useSyncExternalStore(suscribir, leerMenuOculto, () => false);

  // El botón ☰ abre el cajón en celular y oculta o muestra el menú en escritorio
  const alternarMenu = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      guardarMenuOculto(!leerMenuOculto());
    } else {
      setMenuAbierto(true);
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
    <div className="flex min-h-dvh bg-[#E8ECF3]">
      <Sidebar abierto={menuAbierto} oculto={menuOculto} onCerrar={() => setMenuAbierto(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenu={alternarMenu} />
        <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
        {conFooter && <Footer />}
      </div>
    </div>
  );
}
