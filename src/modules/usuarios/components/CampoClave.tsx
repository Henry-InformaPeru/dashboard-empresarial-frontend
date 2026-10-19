'use client';

import { useState } from 'react';
import { generarClave, requisitosClave } from '../lib/clave';

interface CampoClaveProps {
  valor: string;
  onCambiar: (clave: string) => void;
  etiqueta?: string;
  id?: string;
}

// Campo de contraseña para el administrador: ver/ocultar, generar una clave segura, copiarla y ver qué reglas cumple.
export function CampoClave({ valor, onCambiar, etiqueta = 'Contraseña', id = 'campo-clave' }: CampoClaveProps) {
  const [ver, setVer] = useState(false);
  const [copiada, setCopiada] = useState(false);

  const generar = () => {
    onCambiar(generarClave());
    setVer(true); // se muestra para que se pueda leer y entregar
    setCopiada(false);
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiada(true);
      setTimeout(() => setCopiada(false), 2000);
    } catch {
      /* el navegador no dejó copiar: se puede seleccionar a mano */
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <label htmlFor={id} className="block text-xs font-medium text-[#231F20] mb-1">
          {etiqueta}
        </label>
        <div className="relative">
          <input
            id={id}
            type={ver ? 'text' : 'password'}
            value={valor}
            onChange={(e) => onCambiar(e.target.value)}
            required
            minLength={12}
            maxLength={72}
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Mínimo 12 caracteres"
            className="w-full px-3 py-2.5 sm:py-2 pr-12 border border-gray-300 rounded-lg text-base sm:text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-gray-50/50 font-mono"
          />
          <button
            type="button"
            onClick={() => setVer(!ver)}
            aria-label={ver ? 'Ocultar contraseña' : 'Ver contraseña'}
            title={ver ? 'Ocultar contraseña' : 'Ver contraseña'}
            className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            {ver ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={generar}
          className="min-h-[44px] sm:min-h-[34px] px-3 text-xs font-bold text-[#1B4589] border border-[#1B4589]/30 rounded-lg hover:bg-blue-50 active:bg-blue-100 transition-colors"
        >
          🔑 Generar clave segura
        </button>
        <button
          type="button"
          onClick={copiar}
          disabled={!valor}
          className="min-h-[44px] sm:min-h-[34px] px-3 text-xs font-bold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-40"
        >
          {copiada ? '✓ Copiada' : '📋 Copiar'}
        </button>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
        {requisitosClave(valor).map((r) => (
          <li key={r.texto} className={`text-[11px] ${r.ok ? 'text-green-700' : 'text-gray-400'}`}>
            <span aria-hidden="true">{r.ok ? '✓' : '○'}</span> {r.texto}
          </li>
        ))}
      </ul>
    </div>
  );
}
