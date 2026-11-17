'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface SidebarProps {
  abierto?: boolean; // celular y tablet: drawer
  colapsado?: boolean; // escritorio: menú contraído
  onCerrar?: () => void;
}

export function Sidebar({ abierto = false, colapsado = false, onCerrar }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rolId, setRolId] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return null;
      const u = JSON.parse(userStr);
      return typeof u?.rolId === 'number' ? u.rolId : null;
    } catch (e) {
      console.error('Error parsing user', e);
      return null;
    }
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ rolId?: number | null }>;
      if (typeof customEvent.detail?.rolId === 'number') {
        setRolId(customEvent.detail.rolId);
      }
    };
    window.addEventListener('user-profile-updated', handler);
    return () => window.removeEventListener('user-profile-updated', handler);
  }, []);

  const isAdmin = rolId === 1;
  const esVistaAdmin = pathname.startsWith('/admin');

  // Módulo activo en /cliente/portfolio
  const moduloActual = searchParams.get('modulo') || 'matriz';

  const handleModuloClick = (modulo: 'matriz' | 'detalle' | 'mapa') => {
    window.dispatchEvent(new CustomEvent('portfolio-cambiar-modulo', { detail: modulo }));
    if (pathname === '/cliente/portfolio') {
      router.push(`/cliente/portfolio?modulo=${modulo}`, { scroll: false });
    } else {
      router.push(`/cliente/portfolio?modulo=${modulo}`);
    }
    onCerrar?.();
  };

  const modulosCliente: Array<{
    id: 'matriz' | 'detalle' | 'mapa';
    label: string;
    sublabel: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'matriz',
      label: 'Diagnóstico de Cartera',
      sublabel: 'Principal',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
    },
    {
      id: 'detalle',
      label: 'Padrón de Clientes',
      sublabel: 'Clientes',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
        </svg>
      ),
    },
    {
      id: 'mapa',
      label: 'Distribución Geográfica',
      sublabel: 'Mapa',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Fondo oscuro móvil tras el drawer */}
      {abierto && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onCerrar}
          aria-hidden="true"
        />
      )}

      {/* Barra Lateral Delgada con Azul Ejecutivo Medianoche (#0B192C) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 overflow-visible bg-[#0B192C] border-r border-[#152B4D] text-white flex flex-col shadow-2xl transition-[width,transform] duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:z-40 lg:translate-x-0 lg:shadow-xl lg:shrink-0 ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        } ${colapsado ? 'w-16' : 'w-56'}`}
      >
        {/* CABECERA CON LOGOTIPO */}
        <div className="relative border-b border-white/10 flex items-center h-14 px-3">
          {/* Botón de cierre en pantallas móviles */}
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar menú"
            className="absolute right-2 top-2.5 w-7 h-7 flex items-center justify-center rounded-lg text-white hover:bg-white/10 lg:hidden cursor-pointer"
          >
            <span aria-hidden="true" className="text-xs font-bold">✕</span>
          </button>

          {!colapsado ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="bg-white rounded-xl p-1 shadow-sm flex items-center justify-center w-8 h-8 shrink-0">
                <Image
                  src="/logo.png"
                  alt="Informa Perú"
                  width={24}
                  height={24}
                  priority
                  className="w-auto h-auto object-contain"
                />
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black text-white tracking-tight leading-tight truncate">
                  Informa Perú
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">
                  {isAdmin ? 'Panel Administrador' : 'Portal Clientes'}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="bg-white rounded-xl p-1 shadow-sm flex items-center justify-center w-8 h-8">
                <Image
                  src="/logo.png"
                  alt="Informa Perú"
                  width={24}
                  height={24}
                  priority
                  className="w-auto h-auto object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {/* NAVEGACIÓN Y CAMBIO DE MÓDULOS */}
        <nav className="flex-1 px-2.5 py-4 overflow-y-auto space-y-4 [scrollbar-width:none]">
          {/* SECCIÓN MONITOREO: Visible en la vista cliente */}
          {!esVistaAdmin && (
            <div>
              {!colapsado ? (
                <div className="flex items-center gap-1.5 px-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ED1C24]" />
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400">
                    Monitoreo de Cartera
                  </span>
                </div>
              ) : (
                <div className="w-full flex justify-center mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ED1C24]" />
                </div>
              )}

              <div className="space-y-1">
                {modulosCliente.map((mod) => {
                  const esActivo = pathname === '/cliente/portfolio' && moduloActual === mod.id;

                  if (colapsado) {
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => handleModuloClick(mod.id)}
                        title={mod.label}
                        className={`relative w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                          esActivo ? 'bg-white text-[#1B4589] shadow-md font-bold' : 'text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {esActivo && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#ED1C24] rounded-r-full" />
                        )}
                        <span className={esActivo ? 'text-[#1B4589]' : 'text-slate-300'}>
                          {mod.icon}
                        </span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => handleModuloClick(mod.id)}
                      className={`relative w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer text-left ${
                        esActivo
                          ? 'bg-white text-[#1B4589] shadow-md font-extrabold'
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {esActivo && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-4.5 bg-[#ED1C24] rounded-r-full" />
                      )}
                      <span className={esActivo ? 'text-[#1B4589]' : 'text-slate-400'}>
                        {mod.icon}
                      </span>
                      <span className="truncate text-[11.5px]">{mod.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECCIÓN ADMINISTRADOR */}
          {isAdmin && (
            <div className={!esVistaAdmin ? 'pt-3 border-t border-white/10' : ''}>
              {!colapsado ? (
                <div className="flex items-center gap-1.5 px-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-amber-300">
                    Panel Administrador
                  </span>
                </div>
              ) : (
                <div className="w-full flex justify-center mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                </div>
              )}

              <div className="space-y-1">
                {[
                  { href: '/admin', label: 'Dashboard General (KPIs)', icon: '📊' },
                  { href: '/admin/empresas', label: 'Gestión de Empresas', icon: '🏢' },
                  { href: '/admin/usuarios', label: 'Gestión de Usuarios', icon: '👤' },
                  { href: '/admin/configuracion', label: 'Configuración', icon: '⚙️' },
                ].map((item) => {
                  const activo =
                    item.href === '/admin'
                      ? pathname === '/admin'
                      : pathname.startsWith(item.href);

                  if (colapsado) {
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => {
                          router.push(item.href);
                          onCerrar?.();
                        }}
                        title={item.label}
                        className={`relative w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                          activo ? 'bg-white text-[#1B4589] shadow-md font-bold' : 'text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {activo && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#ED1C24] rounded-r-full" />
                        )}
                        <span className="text-base">{item.icon}</span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => {
                        router.push(item.href);
                        onCerrar?.();
                      }}
                      className={`relative w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer text-left ${
                        activo
                          ? 'bg-white text-[#1B4589] shadow-md font-extrabold'
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {activo && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-4.5 bg-[#ED1C24] rounded-r-full" />
                      )}
                      <span className="text-base">{item.icon}</span>
                      <span className="truncate text-[11.5px]">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
