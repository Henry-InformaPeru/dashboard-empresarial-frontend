'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export function Sidebar() {
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
    <aside className="w-64 bg-[#1B4589] text-white flex flex-col shadow-lg shrink-0">
      {/* Logotipo Corporativo Oficial */}
      <div className="p-6 border-b border-blue-900/50 flex flex-col items-center justify-center bg-white/5">
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
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${
                pathname.startsWith('/admin/empresas')
                  ? 'bg-[#ED1C24] text-white shadow-md'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <span>🏢</span> Gestión de Empresas
            </Link>

            {
            /*se oculpra para fiuturo desarrollo de gestion de periodos
             <Link
              href="/admin/dashboards"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${
                pathname.startsWith('/admin/dashboards')
                  ? 'bg-[#ED1C24] text-white shadow-md'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <span>📊</span> Gestion de Periodos
            </Link> */}
            <Link
              href="/admin/usuarios"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${
                pathname.startsWith('/admin/usuarios')
                  ? 'bg-[#ED1C24] text-white shadow-md'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <span>👤</span> Gestión de Usuarios
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/cliente/periodos"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all ${
                pathname.startsWith('/cliente/periodos')
                  ? 'bg-[#ED1C24] text-white shadow-md'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <span>📋</span> Reportes y Periodos
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}