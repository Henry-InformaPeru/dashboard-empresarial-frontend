'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Los reportes de «Publicar en la web» de Power BI son 16:9 y traen abajo una barra con las páginas del reporte.
const RELACION = 16 / 9;
const BARRA_POWERBI = 36;
const ALTO_CABECERA = 64; // cabecera fija de la web
const MARGEN_INFERIOR = 16;

type OrientacionPantalla = { lock?: (o: string) => Promise<void>; unlock?: () => void };

// Visor del reporte de Power BI: se ve entero y centrado, con el tamaño más grande que cabe en pantalla.
export function VisorReporte({ src, titulo }: { src: string; titulo: string }) {
  const area = useRef<HTMLDivElement>(null);
  const [completa, setCompleta] = useState(false);
  const [reservado, setReservado] = useState(0); // alto que deja libre el visor mientras está en pantalla completa
  const [caja, setCaja] = useState<{ ancho: number; alto: number } | null>(null);
  // Tamaño con el que se cargó el reporte: Power BI lo ajusta al tamaño que tiene al cargar y NO se reajusta solo
  const [cargadoCon, setCargadoCon] = useState<{ ancho: number; alto: number } | null>(null);
  const [cargando, setCargando] = useState(true);

  // Mide el espacio disponible y calcula el reporte más grande con su forma (16:9 + barra) que cabe en él
  const calcular = useCallback(() => {
    const el = area.current;
    if (!el) return;
    const disponibleAncho = el.clientWidth;
    const disponibleAlto = completa
      ? el.clientHeight
      : window.innerHeight - ALTO_CABECERA - MARGEN_INFERIOR;

    const anchoQueCabePorAlto = Math.max(disponibleAlto - BARRA_POWERBI, 120) * RELACION;
    let ancho = Math.min(disponibleAncho, anchoQueCabePorAlto);
    // En pantallas bajas de escritorio no se deja diminuto: se prefiere bajar un poco la página
    if (!completa && window.innerWidth >= 768) ancho = Math.max(ancho, disponibleAncho * 0.7);
    ancho = Math.floor(Math.min(ancho, disponibleAncho));
    setCaja({ ancho, alto: Math.round(ancho / RELACION + BARRA_POWERBI) });
  }, [completa]);

  // Recalcula al abrir, al girar el celular, al cambiar el tamaño de la ventana o al ocultar/mostrar el menú
  useEffect(() => {
    calcular();
    const el = area.current;
    const observador = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(calcular) : null;
    if (el && observador) observador.observe(el);
    window.addEventListener('resize', calcular);
    window.addEventListener('orientationchange', calcular);
    return () => {
      observador?.disconnect();
      window.removeEventListener('resize', calcular);
      window.removeEventListener('orientationchange', calcular);
    };
  }, [calcular]);

  // Cuando el tamaño cambia de verdad (pantalla completa, girar el celular, ocultar el menú…), el reporte se vuelve a
  // cargar con el tamaño nuevo para que Power BI lo ajuste: se ve entero y centrado en vez de cortado y pegado arriba.
  const cambioTamano = (a: { ancho: number; alto: number } | null, b: { ancho: number; alto: number } | null) =>
    !!a && !!b && (Math.abs(a.ancho - b.ancho) > 12 || Math.abs(a.alto - b.alto) > 12);
  useEffect(() => {
    if (!caja) return;
    if (cargadoCon && !cambioTamano(caja, cargadoCon)) return;
    const espera = cargadoCon ? 400 : 0; // al cambiar se espera a que el tamaño se estabilice
    const temporizador = setTimeout(() => {
      setCargadoCon(caja);
      setCargando(true);
    }, espera);
    return () => clearTimeout(temporizador);
  }, [caja, cargadoCon]);
  const ajustando = cambioTamano(caja, cargadoCon);

  // Al abrir el reporte desde el inicio de la página, se baja hasta el visor para ver los indicadores enseguida
  useEffect(() => {
    if (window.scrollY < 8) {
      const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      area.current?.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
    }
  }, []);

  // Pantalla completa: cubre toda la pantalla (y usa la pantalla completa del navegador si existe; en iPhone no existe)
  useEffect(() => {
    if (!completa) return;
    const el = area.current;
    const salir = () => setCompleta(false);
    const orientacion = (screen as unknown as { orientation?: OrientacionPantalla }).orientation;

    if (el && typeof el.requestFullscreen === 'function') {
      el.requestFullscreen()
        .then(() => orientacion?.lock?.('landscape').catch(() => undefined))
        .catch(() => undefined);
    }
    const alCambiar = () => {
      if (!document.fullscreenElement) salir();
    };
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') salir();
    };
    document.addEventListener('fullscreenchange', alCambiar);
    document.addEventListener('keydown', alTeclear);
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('fullscreenchange', alCambiar);
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = previo;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
      try {
        orientacion?.unlock?.();
      } catch {
        /* sin bloqueo de orientación */
      }
    };
  }, [completa]);

  const entrarPantallaCompleta = () => {
    setReservado(area.current?.offsetHeight ?? 0);
    setCompleta(true);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-gray-400 sm:hidden">Gira el celular para ver mejor el reporte.</p>
        <button
          type="button"
          onClick={entrarPantallaCompleta}
          className="ml-auto min-h-[44px] sm:min-h-[36px] px-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#1B4589] border border-[#1B4589]/30 rounded-lg hover:bg-blue-50 active:bg-blue-100 transition-colors shrink-0"
        >
          <span aria-hidden="true">⛶</span> Pantalla completa
        </button>
      </div>

      {/* Mientras está en pantalla completa se deja el hueco para que la página no salte */}
      {completa && <div style={{ height: reservado }} aria-hidden="true" />}

      <div
        ref={area}
        className={
          completa
            ? 'fixed inset-0 z-[60] bg-black flex items-center justify-center'
            : 'w-full scroll-mt-20'
        }
      >
        {completa && (
          <>
            <button
              type="button"
              onClick={() => setCompleta(false)}
              aria-label="Salir de pantalla completa"
              className="absolute top-3 right-3 z-10 min-h-[44px] px-4 rounded-lg bg-white/90 text-[#1B4589] text-xs font-bold shadow-lg active:bg-white"
            >
              ✕ Cerrar
            </button>
            <p className="hidden portrait:block absolute bottom-4 inset-x-0 text-center text-xs text-white/70 pointer-events-none">
              Gira el celular para ver el reporte más grande.
            </p>
          </>
        )}

        <div
          className={`relative mx-auto bg-white overflow-hidden ${
            completa ? '' : 'rounded-xl border border-gray-200 shadow-inner'
          }`}
          style={caja ? { width: caja.ancho, height: caja.alto } : { width: '100%', height: '60dvh' }}
        >
          {cargadoCon && (
            <iframe
              key={`${cargadoCon.ancho}x${cargadoCon.alto}`}
              title={titulo}
              src={src}
              className="w-full h-full border-0"
              allow="fullscreen"
              allowFullScreen
              onLoad={() => setCargando(false)}
            />
          )}
          {(cargando || ajustando || !cargadoCon) && (
            <div className="absolute inset-0 bg-white flex items-center justify-center text-xs font-bold text-[#1B4589] animate-pulse">
              Cargando reporte...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
