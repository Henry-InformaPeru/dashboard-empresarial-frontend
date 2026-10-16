'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function Header() {
  const router = useRouter();
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between shadow-sm">
      <h1 className="text-lg font-bold text-[#231F20]">
        Módulo de Dashboards
      </h1>

      <div className="flex items-center gap-4">
        {/* Información del usuario */}
        <div className="text-right">
          <p className="text-sm font-bold text-[#1B4589]">
            {usuario?.nombreCompleto || usuario?.username || 'Usuario'}
          </p>
          <p className="text-xs text-gray-500">Informa Perú</p>
        </div>

        {/* Botón Salir */}
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 text-xs font-semibold text-[#ED1C24] border border-[#ED1C24]/30 rounded-lg hover:bg-red-50 transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
}