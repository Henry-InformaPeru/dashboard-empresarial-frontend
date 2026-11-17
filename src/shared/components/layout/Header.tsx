'use client';

import { useEffect, useState } from 'react';
import { limpiarSesionYRedirigir } from '@/shared/lib/auth';
import { authService } from '@/modules/auth/services/authService';

export function Header({ onMenu }: { onMenu?: () => void }) {
  const [usuario, setUsuario] = useState<{
    id?: number;
    username?: string;
    nombreCompleto?: string;
    empresaId?: number | null;
    empresaNombre?: string | null;
    empresaEsquema?: string | null;
    empresaLogo?: string | null;
    rolId?: number;
  } | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  });

  const isAdmin = usuario?.rolId === 1;
  const [entidad, setEntidad] = useState<string>(() => usuario?.empresaNombre || '');
  const [entidadLogo, setEntidadLogo] = useState<string | null>(() => usuario?.empresaLogo || null);

  useEffect(() => {
    let active = true;
    authService
      .getMe()
      .then((perfil) => {
        if (!active || !perfil) return;
        setUsuario((prev) => {
          const merged = {
            ...prev,
            ...perfil,
            empresaNombre:
              perfil.empresaNombre !== undefined
                ? perfil.empresaNombre
                : (prev?.empresaNombre ?? null),
            empresaEsquema:
              perfil.empresaEsquema !== undefined
                ? perfil.empresaEsquema
                : (prev?.empresaEsquema ?? null),
            empresaLogo:
              perfil.empresaLogo !== undefined
                ? perfil.empresaLogo
                : (prev?.empresaLogo ?? null),
          };
          try {
            localStorage.setItem('user', JSON.stringify(merged));
            window.dispatchEvent(
              new CustomEvent('user-profile-updated', { detail: merged })
            );
          } catch {}
          return merged;
        });
        if (perfil.empresaNombre) {
          setEntidad(perfil.empresaNombre);
        }
        if (perfil.empresaLogo !== undefined) {
          setEntidadLogo((prev) => perfil.empresaLogo ?? prev ?? null);
        }
      })
      .catch(() => {
        // Silencioso si está offline; el interceptor maneja 401
      });

    const entidadHandler = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail && typeof customEvent.detail === 'string') {
        setEntidad(customEvent.detail);
      }
    };
    const logoHandler = (e: Event) => {
      const customEvent = e as CustomEvent<string | null>;
      if (customEvent.detail !== undefined) {
        setEntidadLogo(customEvent.detail);
      }
    };

    window.addEventListener('portfolio-entidad-changed', entidadHandler);
    window.addEventListener('portfolio-logo-changed', logoHandler);

    return () => {
      active = false;
      window.removeEventListener('portfolio-entidad-changed', entidadHandler);
      window.removeEventListener('portfolio-logo-changed', logoHandler);
    };
  }, []);

  const handleLogout = () => {
    limpiarSesionYRedirigir('/');
  };

  const logoMostrar = entidadLogo ?? usuario?.empresaLogo ?? null;

  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200/90 px-3 sm:px-5 flex items-center justify-between gap-3 shadow-2xs">
      {/* Título: PORTFOLIO CONTROLLER + Entidad Supervisada */}
      <div className="flex items-center gap-3 min-w-0">
        {onMenu && (
          <button
            type="button"
            onClick={onMenu}
            aria-label="Mostrar u ocultar el menú"
            title="Mostrar u ocultar el menú lateral"
            className="w-10 h-10 -ml-1 flex items-center justify-center rounded-lg text-[#1B4589] hover:bg-blue-50 active:bg-blue-100 shrink-0 cursor-pointer transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          </button>
        )}

        <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5 shrink-0">
          <span className="text-[#1B4589]">PORTFOLIO</span>
          <span className="text-[#F58220]">CONTROLLER</span>
        </h1>

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        {/* Badge Entidad Financiera o Modo Administrador */}
        {isAdmin ? (
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
            <span>Panel Administrador Sulotec</span>
          </div>
        ) : (
          logoMostrar ? (
            <div className="flex items-center px-3 py-1 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoMostrar}
                alt={usuario?.empresaNombre || entidad || 'Empresa Cliente'}
                className="h-8 sm:h-9 w-auto max-w-[180px] sm:max-w-[220px] object-contain shrink-0"
              />
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200/90 rounded-lg text-xs font-bold text-slate-800 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate max-w-[240px]">
                {usuario?.empresaNombre || entidad || 'Empresa Cliente'}
              </span>
            </div>
          )
        )}
      </div>

      {/* Derecha: Información de Usuario + Cerrar Sesión */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Información del usuario */}
        <div className="text-right min-w-0 hidden sm:block">
          <p className="text-xs font-bold text-[#1B4589] truncate max-w-[140px] md:max-w-[200px]">
            {usuario?.nombreCompleto || usuario?.username || 'Usuario'}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            {isAdmin ? 'Administrador Sulotec' : (usuario?.empresaNombre || 'Cliente')}
          </p>
        </div>

        {/* Botón Cerrar Sesión */}
        <button
          type="button"
          onClick={handleLogout}
          className="h-8 px-3 text-xs font-bold text-[#ED1C24] border border-[#ED1C24]/30 rounded-lg hover:bg-red-50 active:bg-red-100 transition-colors cursor-pointer flex items-center gap-1.5"
          title="Cerrar Sesión"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          <span className="hidden sm:inline">Cerrar Sesión</span>
          <span className="sm:hidden">Salir</span>
        </button>
      </div>
    </header>
  );
}
