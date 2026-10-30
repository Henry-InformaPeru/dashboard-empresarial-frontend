'use client';

import { useEffect, useState } from 'react';
import { limpiarSesionYRedirigir } from '@/shared/lib/auth';

export function Header({ onMenu }: { onMenu?: () => void }) {
  const [usuario, setUsuario] = useState<{ username?: string; nombreCompleto?: string } | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUsuario(JSON.parse(userStr));
      } catch (e) {
        console.error('Error parsing user', e);
      }
    }
  }, []);

  const handleLogout = () => {
    limpiarSesionYRedirigir('/');
  };

  return (
    <header className="sticky top-0 z-30 h-14 sm:h-16 bg-white border-b border-gray-200 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 shadow-sm">
      <div className="flex items-center gap-1 min-w-0">
        {/* Botón del menú: abre el cajón en celular y oculta o muestra el menú en escritorio */}
        <button
          type="button"
          onClick={onMenu}
          aria-label="Mostrar u ocultar el menú"
          title="Mostrar u ocultar el menú"
          className="w-11 h-11 -ml-1 flex items-center justify-center rounded-lg text-[#1B4589] hover:bg-blue-50 active:bg-blue-100 shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
          </svg>
        </button>

        <h1 className="text-sm sm:text-lg font-bold text-[#231F20] truncate">
          <span className="hidden sm:inline">Módulo de Dashboards</span>
          <span className="sm:hidden">Informa Perú</span>
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Información del usuario */}
        <div className="text-right min-w-0">
          <p className="text-xs sm:text-sm font-bold text-[#1B4589] truncate max-w-[110px] sm:max-w-[240px]">
            {usuario?.nombreCompleto || usuario?.username || 'Usuario'}
          </p>
          <p className="text-xs text-gray-500 hidden sm:block">Informa Perú</p>
        </div>

        {/* Botón Salir */}
        <button
          onClick={handleLogout}
          className="min-h-[44px] sm:min-h-[36px] px-3 text-xs font-semibold text-[#ED1C24] border border-[#ED1C24]/30 rounded-lg hover:bg-red-50 active:bg-red-100 transition-colors"
        >
          <span className="hidden sm:inline">Cerrar Sesión</span>
          <span className="sm:hidden">Salir</span>
        </button>
      </div>
    </header>
  );
}
