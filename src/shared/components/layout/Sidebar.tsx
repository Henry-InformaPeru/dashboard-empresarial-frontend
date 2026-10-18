'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  abierto?: boolean; // solo cuenta en celular y tablet: ahí el menú es un cajón
  onCerrar?: () => void;
}

const enlaceBase =
  'flex items-center gap-3 px-4 min-h-[48px] lg:min-h-[44px] rounded-xl font-semibold text-sm lg:text-xs transition-all';
const enlaceActivo = 'bg-[#ED1C24] text-white shadow-md';
const enlaceInactivo = 'text-blue-100 hover:bg-white/10 active:bg-white/15';

export function Sidebar({ abierto = false, onCerrar }: SidebarProps) {
  const pathname = usePathname();
  const [rolId, setRolId] = useState<number | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setRolId(user.rolId);
      } catch (e) {
        console.error('Error parsing user', e);
      }
    }
  }, []);

  const isAdmin = rolId === 1;

  return (
    <>
      {/* Fondo oscuro detrás del cajón (solo celular y tablet) */}
      {abierto && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onCerrar}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] overflow-y-auto bg-[#1B4589] text-white flex flex-col shadow-xl transition-transform duration-200 motion-reduce:transition-none lg:static lg:z-auto lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-lg lg:shrink-0 ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logotipo Corporativo Oficial */}
        <div className="relative p-6 border-b border-blue-900/50 flex flex-col items-center justify-center bg-white/5">
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar menú"
            className="absolute right-2 top-2 w-11 h-11 flex items-center justify-center rounded-lg text-blue-100 hover:bg-white/10 active:bg-white/15 lg:hidden"
          >
            <span aria-hidden="true" className="text-lg">✕</span>
          </button>
          <Image
            src="/logo-informa-peru.png"
            alt="Informa Perú"
            width={150}
            height={48}
            priority
            className="h-auto w-auto object-contain bg-white px-3 py-2 rounded-lg shadow-sm"
          />
          <span className="text-[10px] uppercase tracking-widest text-blue-200 mt-2 font-semibold">
            {isAdmin ? 'Panel Administrador' : 'Portal Clientes'}
          </span>
        </div>

        {/* Menú de Navegación Dinámico según el rol */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {isAdmin ? (
            <>
              <Link
                href="/admin/empresas"
                onClick={onCerrar}
                className={`${enlaceBase} ${
                  pathname.startsWith('/admin/empresas') ? enlaceActivo : enlaceInactivo
                }`}
              >
                <span aria-hidden="true">🏢</span> Gestión de Empresas
              </Link>
              <Link
                href="/admin/reportes"
                onClick={onCerrar}
                className={`${enlaceBase} ${
                  pathname.startsWith('/admin/reportes') ? enlaceActivo : enlaceInactivo
                }`}
              >
                <span aria-hidden="true">📊</span> Reportes y Periodos
              </Link>
              <Link
                href="/admin/usuarios"
                onClick={onCerrar}
                className={`${enlaceBase} ${
                  pathname.startsWith('/admin/usuarios') ? enlaceActivo : enlaceInactivo
                }`}
              >
                <span aria-hidden="true">👤</span> Gestión de Usuarios
              </Link>
            </>
          ) : (
            <Link
              href="/cliente/periodos"
              onClick={onCerrar}
              className={`${enlaceBase} ${
                pathname.startsWith('/cliente/periodos') ? enlaceActivo : enlaceInactivo
              }`}
            >
              <span aria-hidden="true">📋</span> Reportes y Periodos
            </Link>
          )}
        </nav>
      </aside>
    </>
  );
}
