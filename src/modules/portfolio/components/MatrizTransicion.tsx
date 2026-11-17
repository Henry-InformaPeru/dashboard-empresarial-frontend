'use client';

import React, { useState } from 'react';
import { MatrizResponse, MatrizCelda, portfolioService } from '../services/portfolioService';
import { useEstrategiaColores } from '../constants/estrategiaColores';
import { CustomSelect } from './CustomSelect';

interface MatrizTransicionProps {
  data: MatrizResponse | null;
  /** Matriz sin filtro de segmento; se envía solo cuando hay un segmento activo */
  dataBase?: MatrizResponse | null;
  loading: boolean;
  modo: 'clientes' | 'saldos';
  onCambiarModo: (modo: 'clientes' | 'saldos') => void;
  estrategiaSeleccionada: number | null;
  onSeleccionarEstrategia: (id: number | null) => void;
  celdaSeleccionada?: MatrizCelda | null;
  onSeleccionarCelda?: (celda: MatrizCelda | null) => void;
  origenSeleccion?: 'matriz_celda' | 'estrategias_tabla' | 'estrategias_torta' | null;
  onLimpiarSeleccion?: () => void;
  periodo?: string;
  periodos?: string[];
  onPeriodoChange?: (periodo: string) => void;
  tipoCliente?: string;
  onTipoClienteChange?: (tipo: string) => void;
  entidad?: string;
  hideToolbar?: boolean;
  compact?: boolean;
}

function formatearNumero(valor: number, modo: 'clientes' | 'saldos'): string {
  if (modo === 'clientes') {
    return valor.toLocaleString('es-PE', { maximumFractionDigits: 0 });
  }
  return valor.toLocaleString('es-PE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function MatrizTransicion({
  data,
  dataBase,
  loading,
  modo,
  onCambiarModo,
  estrategiaSeleccionada,
  onSeleccionarEstrategia,
  celdaSeleccionada,
  onSeleccionarCelda,
  origenSeleccion,
  onLimpiarSeleccion,
  periodo,
  periodos,
  onPeriodoChange,
  tipoCliente,
  onTipoClienteChange,
  entidad,
  hideToolbar = false,
  compact = false,
}: MatrizTransicionProps) {
  const { colores: CONFIG_ESTRATEGIA } = useEstrategiaColores(
    entidad ? { entidad } : undefined
  );
  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState('');

  const handleDescargarArchivoCompleto = async () => {
    setExportando(true);
    setExportError('');
    try {
      await portfolioService.descargarArchivoCompleto({
        periodo,
        entidad,
      });
    } catch (e: unknown) {
      console.error('Error al exportar archivo completo:', e);
      setExportError(
        e instanceof Error ? e.message : 'No se pudo exportar el archivo Excel.'
      );
    } finally {
      setExportando(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-10 h-10 border-3 border-slate-100 border-t-[#1B4589] rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-bold text-slate-700">Calculando Matriz de Cartera...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 text-center text-slate-500 text-xs">
        No hay registros disponibles para los filtros seleccionados.
      </div>
    );
  }

  const celdasMap = new Map<string, MatrizCelda>();
  for (const c of data.celdas) {
    celdasMap.set(`${c.fila}-${c.columna}`, c);
  }

  // Matriz completa (sin segmento): solo llega cuando hay un segmento activo.
  // Las celdas que no pertenecen al segmento se muestran opacadas con su valor total.
  const celdasBaseMap = new Map<string, MatrizCelda>();
  if (dataBase) {
    for (const c of dataBase.celdas) {
      celdasBaseMap.set(`${c.fila}-${c.columna}`, c);
    }
  }
  const segmentoActivo = dataBase !== null && dataBase !== undefined;

  // Filtrado de filas y columnas cuando la selección proviene de la tabla de estrategias o de la torta (Power BI cross-filter)
  const filtrarPorEstrategia =
    estrategiaSeleccionada !== null && origenSeleccion !== 'matriz_celda';

  const filasVisibles = filtrarPorEstrategia
    ? data.filasHeaders.filter((fila) =>
        data.columnasHeaders.some((col) => {
          const c = celdasMap.get(`${fila.id}-${col.id}`);
          return c && c.estrategia === estrategiaSeleccionada && c.cantidad > 0;
        })
      )
    : data.filasHeaders;

  const columnasVisibles = filtrarPorEstrategia
    ? data.columnasHeaders.filter((col) =>
        data.filasHeaders.some((fila) => {
          const c = celdasMap.get(`${fila.id}-${col.id}`);
          return c && c.estrategia === estrategiaSeleccionada && c.cantidad > 0;
        })
      )
    : data.columnasHeaders;

  // Totales dinámicos (calculados a partir de las celdas visibles)
  const totalesFilaCalculados: Record<number, number> = {};
  const totalesColumnaCalculados: Record<number, number> = {};
  let granTotalCalculado = 0;

  filasVisibles.forEach((fila) => {
    totalesFilaCalculados[fila.id] = 0;
  });
  columnasVisibles.forEach((col) => {
    totalesColumnaCalculados[col.id] = 0;
  });

  filasVisibles.forEach((fila) => {
    columnasVisibles.forEach((col) => {
      const celda = celdasMap.get(`${fila.id}-${col.id}`);
      if (celda) {
        if (!filtrarPorEstrategia || celda.estrategia === estrategiaSeleccionada) {
          const val = modo === 'clientes' ? celda.cantidad : celda.saldoTotal;
          totalesFilaCalculados[fila.id] = (totalesFilaCalculados[fila.id] || 0) + val;
          totalesColumnaCalculados[col.id] = (totalesColumnaCalculados[col.id] || 0) + val;
          granTotalCalculado += val;
        }
      }
    });
  });

  return (
    <div className="bg-white rounded-xl shadow-2xs border border-slate-200/90 overflow-hidden relative flex flex-col h-full">
      {/* Indicador sutil de actualización en segundo plano */}
      {loading && data && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#1B4589] animate-pulse z-30" />
      )}

      {/* Bloque Superior: Cabecera + Banner + Matriz */}
      <div className="flex flex-col">
        {/* Barra de Título Oficial Power BI (Monitor Registro Diagnóstico de Cartera) */}
        <div className="bg-[#005B94] text-white px-4 sm:px-6 py-2.5 border-b border-blue-900/40 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="min-w-0 shrink">
          <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white uppercase truncate">
            MONITOR REGISTRO DIAGNOSTICO DE CARTERA - {modo === 'clientes' ? 'CLIENTES' : 'SALDOS'}
          </h3>
          <p className="text-xs font-bold text-[#FFD700] tracking-wide mt-0.5 truncate">
            Análisis estratégico para mantenimiento de cartera
          </p>
        </div>

        {/* Controles en Fila Bancaria: SIEMPRE en una sola fila en laptops y desktop */}
        {!hideToolbar && (
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 sm:gap-2.5 shrink-0">
            {/* 1. Periodo */}
            {periodos && periodos.length > 0 && (
              <div className="flex-1 sm:flex-none">
                <CustomSelect
                  value={periodo}
                  options={periodos.map((p) => ({
                    value: p,
                    label: p,
                    sublabel: `Corte mensual ${p}`,
                  }))}
                  onChange={(val) => onPeriodoChange?.(val)}
                  prefix="PERIODO:"
                  ariaLabel="Periodo Mensual"
                  variant="dark"
                  size="sm"
                />
              </div>
            )}

            {/* 2. Segmento / Exclusividad */}
            <div className="flex-1 sm:flex-none">
              <CustomSelect
                value={tipoCliente || 'Todas'}
                options={[
                  { value: 'Todas', label: 'Todos', sublabel: 'Todos los Segmentos' },
                  { value: '1. EXCLUSIVO', label: 'Exclusivo', sublabel: '1. Exclusivo (Deuda única)' },
                  { value: '2. NO EXCLUSIVO', label: 'No Exclusivo', sublabel: '2. No Exclusivo (Compartida)' },
                ]}
                onChange={(val) => onTipoClienteChange?.(val)}
                prefix="SEGMENTO:"
                ariaLabel="Segmento / Exclusividad"
                variant="dark"
                size="sm"
              />
            </div>

            {/* 3 & 4. Toggle Switch Clientes / Saldos (Segmented Control) */}
            <div className="inline-flex items-center bg-slate-800 p-0.5 rounded-md border border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => onCambiarModo('clientes')}
                className={`px-3 py-1 text-xs font-bold rounded transition-all cursor-pointer whitespace-nowrap ${
                  modo === 'clientes'
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Clientes (#)
              </button>
              <button
                type="button"
                onClick={() => onCambiarModo('saldos')}
                className={`px-3 py-1 text-xs font-bold rounded transition-all cursor-pointer whitespace-nowrap ${
                  modo === 'saldos'
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Saldos (S/)
              </button>
            </div>

            {/* Botón Descarga Excel Verde Oficial */}
            <button
              type="button"
              onClick={handleDescargarArchivoCompleto}
              disabled={exportando}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-md bg-[#107C41] hover:bg-[#0E6C38] text-white transition-all disabled:opacity-50 cursor-pointer shrink-0 whitespace-nowrap shadow-xs"
              title="Descargar archivo Excel oficial (.xlsx)"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5m0 0l5-5m-5 5V3" />
              </svg>
              <span>{exportando ? 'Exportando...' : 'Exportar'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Banner de error de exportación */}
      {exportError && (
        <div className="bg-red-50 px-4 sm:px-6 py-2 border-b border-red-200 flex items-center justify-between text-xs text-red-700 font-semibold">
          <span>⚠️ {exportError}</span>
          <button
            type="button"
            onClick={() => setExportError('')}
            className="text-red-500 hover:text-red-800 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Banner de filtro activo de Estrategia o Celda */}
      {(celdaSeleccionada || estrategiaSeleccionada) && (
        <div className="bg-amber-50 px-4 sm:px-6 py-2 border-b border-amber-200 flex items-center justify-between text-xs text-amber-950">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>
              {celdaSeleccionada ? (
                <>
                  Filtro de Celda Matriz:{' '}
                  <strong>
                    {celdaSeleccionada.filaDescripcion} × {celdaSeleccionada.columnaDescripcion}
                  </strong>{' '}
                  (
                  <span
                    className="inline-block px-1.5 py-0.5 rounded font-black text-[10px]"
                    style={{
                      backgroundColor: CONFIG_ESTRATEGIA[celdaSeleccionada.estrategia]?.color,
                      color: CONFIG_ESTRATEGIA[celdaSeleccionada.estrategia]?.texto,
                    }}
                  >
                    {CONFIG_ESTRATEGIA[celdaSeleccionada.estrategia]?.nombre}
                  </span>
                  ) &mdash;{' '}
                  <strong>
                    {modo === 'clientes'
                      ? `${celdaSeleccionada.cantidad.toLocaleString('es-PE')} clientes`
                      : `S/ ${celdaSeleccionada.saldoTotal.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`}
                  </strong>
                </>
              ) : (
                <>
                  Resaltando cuadrantes de:{' '}
                  <strong>
                    {CONFIG_ESTRATEGIA[estrategiaSeleccionada!]?.nombre}
                  </strong>
                </>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onLimpiarSeleccion) {
                onLimpiarSeleccion();
              } else {
                if (onSeleccionarCelda) onSeleccionarCelda(null);
                onSeleccionarEstrategia(null);
              }
            }}
            className="text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-2.5 py-0.5 rounded cursor-pointer transition-colors"
          >
            ✕ Quitar filtro (Ver todos)
          </button>
        </div>
      )}

      {/* Tabla Matriz con Scroll Táctil Responsivo y Primera Columna Fija */}
      <div className="overflow-x-auto touch-pan-x py-2 px-0 [scrollbar-width:thin]">
        <table
          className={`w-full border-separate border-spacing-y-0.5 border-spacing-x-0 text-center text-[10px] sm:text-[11px] ${
            filtrarPorEstrategia ? 'min-w-full' : 'min-w-[860px]'
          }`}
        >
          <thead>
            <tr>
              <th className="py-2 px-2.5 bg-[#0A2540] text-white font-black text-center rounded-none border-y border-l border-slate-700/80 border-r-2 border-r-slate-500 min-w-[125px] sm:min-w-[135px] w-[135px] sticky left-0 z-30 [box-shadow:-50px_0_0_#0A2540,0_-3px_0_#0A2540,0_3px_0_#0A2540,4px_0_12px_rgba(0,0,0,0.5)]">
                <div className="text-[9px] text-amber-300 font-bold uppercase tracking-wider">MORA ENTIDAD ▼</div>
                <div>CLIENTES</div>
              </th>
              {columnasVisibles.map((col) => (
                <th
                  key={col.id}
                  className="py-2 px-1 bg-[#14356B] text-slate-100 font-bold rounded-sm min-w-[78px] sm:min-w-[88px] border border-slate-700/60 text-center"
                  title={col.descripcion}
                >
                  <div className="text-[9px] text-blue-200 font-semibold">MERCADO</div>
                  <div className="truncate">{col.descripcion}</div>
                </th>
              ))}
              <th className="py-2 px-2 bg-[#0A2540] text-amber-300 font-black rounded-sm min-w-[90px] sm:min-w-[98px] border border-slate-700 text-center">
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody>
            {filasVisibles.map((fila) => {
              const valorTotalFila = totalesFilaCalculados[fila.id] ?? 0;

              return (
                <tr key={fila.id}>
                  {/* Encabezado Fila Dinámico Fijo a la Izquierda al Desplazar */}
                  <td className="py-1.5 px-2.5 bg-[#0A2540] text-slate-100 font-bold text-left rounded-none border-y border-l border-slate-700 border-r-2 border-r-slate-500 min-w-[125px] sm:min-w-[135px] w-[135px] sticky left-0 z-20 [box-shadow:-50px_0_0_#0A2540,0_-3px_0_#0A2540,0_3px_0_#0A2540,4px_0_12px_rgba(0,0,0,0.5)]">
                    <span className="truncate block font-mono text-[11px]">{fila.descripcion}</span>
                  </td>

                  {/* Celdas cruzadas */}
                  {columnasVisibles.map((col) => {
                    const celdaSegmento = celdasMap.get(`${fila.id}-${col.id}`);
                    const fueraDeSegmento =
                      segmentoActivo &&
                      (!celdaSegmento || celdaSegmento.cantidad === 0);
                    // Fuera del segmento se muestra el valor de la matriz completa (opacado)
                    const celda = fueraDeSegmento
                      ? celdasBaseMap.get(`${fila.id}-${col.id}`)
                      : celdaSegmento;
                    const valor = celda
                      ? modo === 'clientes'
                        ? celda.cantidad
                        : celda.saldoTotal
                      : 0;

                    const cfg = celda?.estrategia
                      ? CONFIG_ESTRATEGIA[celda.estrategia]
                      : null;

                    // Si se está filtrando por estrategia (ej. Fidelización), las celdas que no pertenecen a esa estrategia (ej. Mitigación 449)
                    // se renderizan completamente en blanco y vacías, tal como se muestra en Power BI
                    if (filtrarPorEstrategia && celda?.estrategia !== estrategiaSeleccionada) {
                      return (
                        <td
                          key={col.id}
                          className="py-1.5 px-1 bg-white border border-slate-200/50 rounded-xs select-none"
                        />
                      );
                    }

                    const esCeldaFoco =
                      celdaSeleccionada &&
                      celda &&
                      celdaSeleccionada.fila === fila.id &&
                      celdaSeleccionada.columna === col.id;

                    const estaAtenuada =
                      fueraDeSegmento ||
                      (estrategiaSeleccionada !== null &&
                        !filtrarPorEstrategia &&
                        celda?.estrategia !== estrategiaSeleccionada);

                    const esSeleccionada =
                      !fueraDeSegmento &&
                      estrategiaSeleccionada !== null &&
                      celda?.estrategia === estrategiaSeleccionada;

                    return (
                      <td
                        key={col.id}
                        onClick={() => {
                          if (celda?.estrategia) {
                            if (onSeleccionarCelda) {
                              onSeleccionarCelda(
                                celdaSeleccionada?.fila === fila.id &&
                                  celdaSeleccionada?.columna === col.id
                                  ? null
                                  : celda
                              );
                            } else {
                              onSeleccionarEstrategia(
                                estrategiaSeleccionada === celda.estrategia
                                  ? null
                                  : celda.estrategia
                              );
                            }
                          }
                        }}
                        style={
                          cfg
                            ? {
                                backgroundColor: cfg.color,
                                color: cfg.texto,
                                borderColor: 'rgba(0,0,0,0.14)',
                              }
                            : undefined
                        }
                        className={`py-1.5 px-1 rounded-xs font-mono font-black text-[11px] sm:text-xs cursor-pointer transition-colors border select-none hover:brightness-110 ${
                          cfg ? '' : 'bg-slate-100 text-slate-400 border-slate-200'
                        } ${
                          esCeldaFoco
                            ? 'ring-2 ring-inset ring-slate-900 shadow-[inset_0_0_0_2px_#ffffff] z-10'
                            : estaAtenuada
                            ? 'opacity-30 saturate-[0.5]'
                            : esSeleccionada
                            ? 'ring-1 ring-inset ring-white/70 brightness-105'
                            : ''
                        }`}
                        title={
                          celda
                            ? `${fila.descripcion} (Entidad) x ${col.descripcion} (Mercado)\nEstrategia: ${celda.estrategiaDescripcion}\nClientes: ${celda.cantidad.toLocaleString('es-PE')}\nSaldo Total: S/ ${celda.saldoTotal.toLocaleString('es-PE')}${fueraDeSegmento ? `\n(Fuera del segmento ${tipoCliente})` : ''}`
                            : ''
                        }
                      >
                        {valor > 0 ? formatearNumero(valor, modo) : '—'}
                      </td>
                    );
                  })}

                  {/* Total Fila */}
                  <td className="py-1.5 px-2 bg-slate-100 text-slate-900 font-mono font-black rounded-xs border border-slate-300 text-right">
                    {formatearNumero(valorTotalFila, modo)}
                  </td>
                </tr>
              );
            })}

            {/* Total Columna */}
            <tr className="border-t-2 border-slate-400">
              <td className="py-2 px-2.5 bg-[#0A2540] text-amber-300 font-mono font-black text-left rounded-none border-y border-l border-slate-700 border-r-2 border-r-slate-500 min-w-[125px] sm:min-w-[135px] w-[135px] sticky left-0 z-20 [box-shadow:-50px_0_0_#0A2540,0_-3px_0_#0A2540,0_3px_0_#0A2540,4px_0_12px_rgba(0,0,0,0.5)]">
                TOTAL
              </td>
              {columnasVisibles.map((col) => {
                const valorTotalCol = totalesColumnaCalculados[col.id] ?? 0;
                return (
                  <td
                    key={col.id}
                    className="py-2 px-1 bg-slate-100 text-slate-900 font-mono font-black rounded-xs border border-slate-300"
                  >
                    {formatearNumero(valorTotalCol, modo)}
                  </td>
                );
              })}
              {/* Gran Total */}
              <td className="py-2 px-2 bg-[#D97706] text-white font-mono font-black rounded-sm border border-amber-600 text-right text-[12px]">
                {formatearNumero(granTotalCalculado, modo)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>

      {/* Cuadrantes de Riesgo: en modo Extender se muestra la barra inferior en UNA SOLA FILA limpia */}
      {!compact && (
        <div className="bg-slate-50/90 px-3 sm:px-4 py-2 border-t border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#005B94]" />
            <span className="text-slate-800 font-black uppercase tracking-wider text-[10.5px]">
              Cuadrantes de Riesgo
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 flex-1 w-full">
            {Object.entries(CONFIG_ESTRATEGIA).map(([idStr, cfg]) => {
              const id = Number(idStr);
              const isSelected = estrategiaSeleccionada === id;
              const isDimmed = estrategiaSeleccionada !== null && !isSelected;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSeleccionarEstrategia(isSelected ? null : id)}
                  style={{ backgroundColor: cfg.color, color: cfg.texto }}
                  className={`group relative flex items-center justify-center gap-1 px-2 py-1.5 rounded-md font-black text-[10.5px] cursor-pointer transition-colors duration-150 shadow-2xs border border-black/10 hover:brightness-105 ${
                    isSelected
                      ? 'ring-2 ring-slate-900 shadow-sm z-10'
                      : isDimmed
                      ? 'opacity-35 hover:opacity-80'
                      : ''
                  }`}
                  title={
                    isSelected
                      ? `Quitar filtro: ${cfg.nombre}`
                      : `Filtrar matriz por ${cfg.nombre}`
                  }
                >
                  {isSelected && <span className="text-[11px] font-black leading-none">✓</span>}
                  <span className="truncate">{cfg.nombre}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
