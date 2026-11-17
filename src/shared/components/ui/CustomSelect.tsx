'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

export interface CustomSelectProps {
  value: string | number | null | undefined;
  options: (SelectOption | string)[];
  onChange: (value: string) => void;
  prefix?: string;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  ariaLabel?: string;
  align?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
  disabled?: boolean;
}

export function CustomSelect({
  value,
  options,
  onChange,
  prefix,
  placeholder = 'Seleccionar...',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  ariaLabel,
  align = 'left',
  size = 'sm',
  variant = 'light',
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalizar opciones
  const normalizedOptions: SelectOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : { ...opt, value: String(opt.value) }
  );

  const strValue = value !== null && value !== undefined ? String(value) : '';
  const selectedOption = normalizedOptions.find((opt) => opt.value === strValue);

  // Cerrar al hacer clic fuera o presionar Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const heightClass =
    size === 'sm' ? 'h-7 px-2.5 gap-1.5 text-xs' : size === 'lg' ? 'h-10 px-3.5 gap-2.5 text-xs' : 'h-8.5 px-3 gap-2 text-xs';

  const variantClass =
    variant === 'dark'
      ? isOpen
        ? 'bg-slate-900 text-white border-amber-400 ring-2 ring-amber-400/30'
        : 'bg-slate-900 text-white border-slate-700 hover:border-slate-500 hover:bg-slate-800'
      : isOpen
      ? 'bg-white text-slate-800 border-[#1B4589] ring-2 ring-blue-100 shadow-sm'
      : 'bg-white text-slate-800 border-slate-300 hover:border-slate-400 hover:bg-slate-50/70 shadow-2xs';

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${isOpen ? 'z-50' : 'z-20'} ${className}`}
    >
      {/* Botón Disparador Estilizado */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || prefix || 'Selector'}
        className={`w-full flex items-center justify-between font-bold rounded-lg border transition-all cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${heightClass} ${variantClass} ${buttonClassName}`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {prefix && (
            <span
              className={`${
                size === 'sm' ? 'text-[9.5px]' : 'text-[10px]'
              } font-extrabold uppercase tracking-tight shrink-0 ${
                variant === 'dark' ? 'text-amber-300' : 'text-slate-400'
              }`}
            >
              {prefix}
            </span>
          )}
          <span className={`truncate font-extrabold ${selectedOption ? (variant === 'dark' ? 'text-white' : 'text-slate-900') : 'text-slate-400'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        {/* Chevron Animado con Rotación Suave */}
        <svg
          className={`${
            size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'
          } transition-transform duration-200 shrink-0 ${
            variant === 'dark' ? 'text-slate-400' : 'text-slate-400'
          } ${isOpen ? 'rotate-180 ' + (variant === 'dark' ? 'text-amber-300' : 'text-[#1B4589]') : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Menú Desplegable Moderno Flotante */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } top-full mt-1.5 min-w-[190px] w-max max-w-[320px] bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-150 ${menuClassName}`}
        >
          <div className="max-h-64 overflow-y-auto py-0.5 [scrollbar-width:thin]">
            {normalizedOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 text-center font-medium">
                Sin opciones disponibles
              </div>
            ) : (
              normalizedOptions.map((opt) => {
                const isSelected = opt.value === strValue;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50/90 text-[#1B4589] font-black'
                        : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-950 font-bold'
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-[10px] text-slate-400 font-medium truncate">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <span className="text-[#1B4589] font-black text-xs shrink-0">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
