'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { portfolioService } from '../services/portfolioService';

/**
 * Paleta oficial de estrategias tomada del reporte Power BI "Portfolio Controller".
 * Única fuente de verdad para matriz, tablas, dona, padrón y mapa.
 */
export interface EstrategiaColor {
  /** Color de fondo oficial (hex) */
  color: string;
  /** Color de texto legible sobre el fondo */
  texto: string;
  /** Nombre oficial para chips / leyendas / tablas */
  nombre: string;
  /** Color para bordes/acentos sobre fondo blanco */
  acento: string;
  /** Acción recomendada oficial del reporte Power BI */
  accion: string;
}

export const DEFAULT_ESTRATEGIA_COLORES: Record<number, EstrategiaColor> = {
  1: {
    color: '#008000',
    texto: '#FFFFFF',
    nombre: '1. FIDELIZACION',
    acento: '#008000',
    accion: '• Mantener y fortalecer la relación con el cliente.',
  },
  2: {
    color: '#008080',
    texto: '#FFFFFF',
    nombre: '2. PREVENCION',
    acento: '#008080',
    accion: '• Anticipar riesgos y evitar el deterioro',
  },
  3: {
    color: '#FFFF00',
    texto: '#000000',
    nombre: '3. MITIGACION',
    acento: '#D4C800',
    accion: '• Reducir impactos y controlar riesgos',
  },
  4: {
    color: '#800080',
    texto: '#FFFFFF',
    nombre: '4. BLINDAJE',
    acento: '#800080',
    accion: '• Proteger la cartera con acciones preventivas',
  },
  5: {
    color: '#EB5559',
    texto: '#FFFFFF',
    nombre: '5. COBRANZA DIRECCIONADA',
    acento: '#EB5559',
    accion: '• Gestionar cobranzas especializadas',
  },
  6: {
    color: '#FF0000',
    texto: '#FFFFFF',
    nombre: '6. SOLUCION DE CONCILIACION',
    acento: '#FF0000',
    accion: '• Negociación y solución efectiva',
  },
};

export const DEFAULT_ESTRATEGIA_PASTEL_COLORES: Record<number, string> = {
  1: '#B2E2B2',
  2: '#B4DCDC',
  3: '#FFF6BA',
  4: '#DEBFDE',
  5: '#F9C6C8',
  6: '#FFB8B8',
};

export const ESTRATEGIA_COLOR_DEFAULT: EstrategiaColor = {
  color: '#94A3B8',
  texto: '#FFFFFF',
  nombre: 'Sin estrategia',
  acento: '#94A3B8',
  accion: 'Sin acción asignada',
};

export const STORAGE_KEY_ESTRATEGIA_COLORES = 'custom_estrategia_colores';

/**
 * Calcula el color de texto con máximo contraste (#000000 o #FFFFFF)
 * a partir de la luminancia percibida del color de fondo hexadecimal.
 */
export function calcularColorTexto(hexColor: string): '#000000' | '#FFFFFF' {
  if (!hexColor) return '#FFFFFF';
  let hex = hexColor.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  if (hex.length !== 6) return '#FFFFFF';

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return '#FFFFFF';

  // Luminancia percibida W3C
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 155 ? '#000000' : '#FFFFFF';
}

/**
 * Genera un tono pastel atenuado para el cross-highlighting de la torta
 */
export function generarColorPastel(hexColor: string): string {
  if (!hexColor) return '#CBD5E1';
  let hex = hexColor.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  if (hex.length !== 6) return '#CBD5E1';

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return '#CBD5E1';

  // Mezclar al 65% con blanco (255)
  const pr = Math.min(255, Math.round(r + (255 - r) * 0.65));
  const pg = Math.min(255, Math.round(g + (255 - g) * 0.65));
  const pb = Math.min(255, Math.round(b + (255 - b) * 0.65));

  return `#${pr.toString(16).padStart(2, '0')}${pg.toString(16).padStart(2, '0')}${pb.toString(16).padStart(2, '0')}`.toUpperCase();
}

/**
 * Obtiene los colores configurados desde localStorage (o los predeterminados)
 */
export function getStoredEstrategiaColores(): Record<number, EstrategiaColor> {
  if (typeof window === 'undefined') {
    return DEFAULT_ESTRATEGIA_COLORES;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ESTRATEGIA_COLORES);
    if (!raw) return DEFAULT_ESTRATEGIA_COLORES;
    const parsed = JSON.parse(raw);
    const resultado: Record<number, EstrategiaColor> = { ...DEFAULT_ESTRATEGIA_COLORES };

    for (const key of [1, 2, 3, 4, 5, 6]) {
      if (parsed[key] && parsed[key].color) {
        const hex = parsed[key].color;
        resultado[key] = {
          ...DEFAULT_ESTRATEGIA_COLORES[key],
          color: hex,
          texto: calcularColorTexto(hex),
          acento: hex,
        };
      }
    }
    return resultado;
  } catch (e) {
    console.error('Error al leer colores de localStorage:', e);
    return DEFAULT_ESTRATEGIA_COLORES;
  }
}

/**
 * Guarda los colores personalizados en localStorage y notifica en tiempo real a toda la aplicación
 */
export function saveStoredEstrategiaColores(
  colores: Record<number, { color: string }>,
  dispatch = true,
): Record<number, EstrategiaColor> {
  const toStore: Record<number, EstrategiaColor> = {};
  for (const key of [1, 2, 3, 4, 5, 6]) {
    const hex = colores[key]?.color || DEFAULT_ESTRATEGIA_COLORES[key].color;
    toStore[key] = {
      ...DEFAULT_ESTRATEGIA_COLORES[key],
      color: hex,
      texto: calcularColorTexto(hex),
      acento: hex,
    };
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_ESTRATEGIA_COLORES, JSON.stringify(toStore));
      localStorage.setItem('estrategia_colores_ts', Date.now().toString());
      if (dispatch) {
        window.dispatchEvent(new CustomEvent('estrategia-colores-changed', { detail: toStore }));
      }
    } catch (e) {
      console.error('Error al guardar colores en localStorage:', e);
    }
  }

  return toStore;
}

/**
 * Restaura la paleta predeterminada original de Power BI
 */
export function resetStoredEstrategiaColores(): Record<number, EstrategiaColor> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY_ESTRATEGIA_COLORES);
      localStorage.setItem('estrategia_colores_ts', Date.now().toString());
      window.dispatchEvent(
        new CustomEvent('estrategia-colores-changed', { detail: DEFAULT_ESTRATEGIA_COLORES })
      );
    } catch (e) {
      console.error('Error al resetear colores:', e);
    }
  }
  return DEFAULT_ESTRATEGIA_COLORES;
}

/**
 * Proxy dinámico para compatibilidad total con código existente que lee ESTRATEGIA_COLORES
 */
export const ESTRATEGIA_COLORES: Record<number, EstrategiaColor> = new Proxy(
  DEFAULT_ESTRATEGIA_COLORES,
  {
    get(target, prop) {
      const id = Number(prop);
      if (!isNaN(id) && id >= 1 && id <= 6) {
        const stored = getStoredEstrategiaColores();
        return stored[id] || target[id];
      }
      return Reflect.get(target, prop);
    },
  }
);

/**
 * Proxy dinámico para compatibilidad con código existente que lee ESTRATEGIA_PASTEL_COLORES
 */
export const ESTRATEGIA_PASTEL_COLORES: Record<number, string> = new Proxy(
  DEFAULT_ESTRATEGIA_PASTEL_COLORES,
  {
    get(target, prop) {
      const id = Number(prop);
      if (!isNaN(id) && id >= 1 && id <= 6) {
        const stored = getStoredEstrategiaColores();
        if (stored[id]?.color) {
          return generarColorPastel(stored[id].color);
        }
        return target[id];
      }
      return Reflect.get(target, prop);
    },
  }
);

export function getEstrategiaColor(id: number | null | undefined): EstrategiaColor {
  if (id && id >= 1 && id <= 6) {
    const stored = getStoredEstrategiaColores();
    return stored[id] || DEFAULT_ESTRATEGIA_COLORES[id] || ESTRATEGIA_COLOR_DEFAULT;
  }
  return ESTRATEGIA_COLOR_DEFAULT;
}

const inFlightColoresMap = new Map<
  string,
  Promise<Record<number, EstrategiaColor> | null>
>();

/**
 * Hook Reactivo para componentes de cartera (Matriz, Cuadro, Torta, etc.)
 * Se actualiza automáticamente cuando el administrador cambia los colores en Configuración
 */
export function useEstrategiaColores(params?: { empresaId?: number; entidad?: string }) {
  const [colores, setColores] = useState<Record<number, EstrategiaColor>>(getStoredEstrategiaColores);
  const empresaId = params?.empresaId;
  const entidad = params?.entidad;

  useEffect(() => {
    let cancel = false;

    const cargarColoresDelServidor = async () => {
      const cacheKey = `${empresaId ?? ''}_${entidad ?? ''}`;
      let reqPromise = inFlightColoresMap.get(cacheKey);

      if (!reqPromise) {
        reqPromise = (async () => {
          try {
            const queryParams =
              empresaId !== undefined || entidad !== undefined
                ? { empresaId, entidad }
                : undefined;
            const res = await portfolioService.getColores(queryParams);
            if (res?.colores) {
              const formateados: Record<number, EstrategiaColor> = {
                ...DEFAULT_ESTRATEGIA_COLORES,
              };
              for (const id of [1, 2, 3, 4, 5, 6]) {
                const hex = res.colores[id]?.color || DEFAULT_ESTRATEGIA_COLORES[id].color;
                formateados[id] = {
                  ...DEFAULT_ESTRATEGIA_COLORES[id],
                  color: hex,
                  texto: calcularColorTexto(hex),
                  acento: hex,
                };
              }
              return formateados;
            }
            return null;
          } catch {
            return null;
          } finally {
            inFlightColoresMap.delete(cacheKey);
          }
        })();
        inFlightColoresMap.set(cacheKey, reqPromise);
      }

      const formateados = await reqPromise;
      if (!cancel && formateados) {
        setColores(formateados);
        saveStoredEstrategiaColores(formateados, false);
      }
    };

    cargarColoresDelServidor();

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<Record<number, EstrategiaColor>>;
      if (customEvent.detail) {
        setColores(customEvent.detail);
      } else {
        cargarColoresDelServidor();
      }
    };

    const storageHandler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_ESTRATEGIA_COLORES || e.key === 'estrategia_colores_ts') {
        cargarColoresDelServidor();
      }
    };

    window.addEventListener('estrategia-colores-changed', handler);
    window.addEventListener('storage', storageHandler);

    return () => {
      cancel = true;
      window.removeEventListener('estrategia-colores-changed', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }, [empresaId, entidad]);

  const pasteles = useMemo(() => {
    const res: Record<number, string> = {};
    for (const id of [1, 2, 3, 4, 5, 6]) {
      res[id] = generarColorPastel(colores[id]?.color || DEFAULT_ESTRATEGIA_COLORES[id].color);
    }
    return res;
  }, [colores]);

  const getColor = useCallback(
    (id: number | null | undefined): EstrategiaColor => {
      if (id && colores[id]) return colores[id];
      return ESTRATEGIA_COLOR_DEFAULT;
    },
    [colores]
  );

  return { colores, pasteles, getColor };
}
