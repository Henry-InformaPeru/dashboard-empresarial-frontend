'use client';

import { useRef } from 'react';

// Visor del reporte de Power BI: alto cómodo en celular y botón de pantalla completa.
export function VisorReporte({ src, titulo }: { src: string; titulo: string }) {
  const contenedor = useRef<HTMLDivElement>(null);

  const abrirPantallaCompleta = () => {
    const el = contenedor.current;
    // En iPhone el navegador no deja poner un iframe en pantalla completa: entonces se abre el reporte en otra pestaña
    if (el && typeof el.requestFullscreen === 'function') {
      el.requestFullscreen().catch(() => window.open(src, '_blank', 'noopener,noreferrer'));
    } else {
      window.open(src, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-gray-400 sm:hidden">Gira el celular para ver mejor el reporte.</p>
        <button
          type="button"
          onClick={abrirPantallaCompleta}
          className="ml-auto min-h-[44px] sm:min-h-[36px] px-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#1B4589] border border-[#1B4589]/30 rounded-lg hover:bg-blue-50 active:bg-blue-100 transition-colors shrink-0"
        >
          <span aria-hidden="true">⛶</span> Pantalla completa
        </button>
      </div>

      <div
        ref={contenedor}
        className="w-full h-[70dvh] min-h-[420px] md:h-[550px] bg-gray-50 rounded-xl overflow-hidden border border-gray-200 shadow-inner [&:fullscreen]:h-dvh [&:fullscreen]:w-screen [&:fullscreen]:rounded-none [&:fullscreen]:border-0"
      >
        <iframe title={titulo} src={src} className="w-full h-full border-0" allowFullScreen />
      </div>
    </div>
  );
}
