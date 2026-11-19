'use client';

import React from 'react';
import {
  EstrategiasCuadroResponse,
  MatrizCelda,
} from '../services/portfolioService';
import {
  useEstrategiaColores,
} from '../constants/estrategiaColores';

interface CuadroEstrategiasProps {
  data: EstrategiasCuadroResponse | null;
  loading: boolean;
  modo: 'clientes' | 'saldos';
  onCambiarModo?: (modo: 'clientes' | 'saldos') => void;
  estrategiaSeleccionada: number | null;
  onSeleccionarEstrategia: (id: number | null) => void;
  celdaSeleccionada?: MatrizCelda | null;
  origenSeleccion?: 'matriz_celda' | 'estrategias_tabla' | 'estrategias_torta' | null;
  onSeleccionarEstrategiaTabla?: (id: number | null) => void;
  onSeleccionarEstrategiaTorta?: (id: number | null) => void;
  onLimpiarSeleccion?: () => void;
  periodo?: string;
  periodos?: string[];
  onPeriodoChange?: (periodo: string) => void;
  tipoCliente?: string;
  onTipoClienteChange?: (tipo: string) => void;
  entidad?: string;
  hideToolbar?: boolean;
  layout?: 'split' | 'apilado';
}

export function CuadroEstrategias({
  data,
  loading,
  modo,
  estrategiaSeleccionada,
  onSeleccionarEstrategia,
  celdaSeleccionada,
  origenSeleccion,
  onSeleccionarEstrategiaTabla,
  onSeleccionarEstrategiaTorta,
  onLimpiarSeleccion,
  entidad,
  layout = 'split',
}: CuadroEstrategiasProps) {
  const {
    colores: ESTRATEGIA_COLORES,
    pasteles: ESTRATEGIA_PASTEL_COLORES,
    getColor: getEstrategiaColor,
  } = useEstrategiaColores(entidad ? { entidad } : undefined);

  if ((loading && !data) || !data) {
    return (
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200/90 p-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-36 bg-slate-100 rounded-lg"></div>
          <div className="h-36 bg-slate-100 rounded-lg"></div>
          <div className="h-36 bg-slate-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const universoTotalClientes = data.totales.cantidad;

  // Suma total de las 6 estrategias para los ángulos de la torta
  const totalValorEstrategias = data.items.reduce(
    (acc, it) => acc + (modo === 'clientes' ? it.cantidad : it.saldo),
    0
  );

  // Lista básica de estrategias enriquecida con porcentajes dinámicos por entidad
  const strategiesList = data.items.map((it) => {
    const valor = modo === 'clientes' ? it.cantidad : it.saldo;
    const porcentajePieReal =
      totalValorEstrategias > 0 ? (valor / totalValorEstrategias) * 100 : 0;
    const cfg = ESTRATEGIA_COLORES[it.id] || getEstrategiaColor(it.id);

    const pctOficialNum =
      modo === 'clientes'
        ? universoTotalClientes > 0
          ? (it.cantidad / universoTotalClientes) * 100
          : 0
        : it.participacionSaldo;
    const porcentajeOficial = pctOficialNum.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return {
      ...it,
      valor,
      porcentajePie: Math.round(porcentajePieReal),
      porcentajeOficial,
      cfg,
    };
  });

  // =========================================================================
  // DETERMINAR LAS FILAS A RENDERIZAR EN LA TABLA SEGÚN EL ORIGEN DE LA SELECCIÓN
  // =========================================================================
  let filasTabla: Array<{
    id: number;
    nombre: string;
    valor: number;
    pctOficial: string;
    color: string;
    texto: string;
    isSelected: boolean;
  }> = [];

  let totalTablaCantidad = 0;
  let totalTablaPctOficial = '0,00';

  if (origenSeleccion === 'matriz_celda' && celdaSeleccionada) {
    // CASO 1: Clic en celda de la Matriz
    // Se muestra ÚNICAMENTE 1 fila con la cantidad de la celda y su % sobre el universo de la entidad
    const val =
      modo === 'clientes'
        ? celdaSeleccionada.cantidad
        : celdaSeleccionada.saldoTotal;
    const pct =
      modo === 'clientes'
        ? universoTotalClientes > 0
          ? (celdaSeleccionada.cantidad / universoTotalClientes) * 100
          : 0
        : data.totales.saldo > 0
          ? (celdaSeleccionada.saldoTotal / data.totales.saldo) * 100
          : 0;
    const pctStr = pct.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const cfg =
      ESTRATEGIA_COLORES[celdaSeleccionada.estrategia] ||
      getEstrategiaColor(celdaSeleccionada.estrategia);

    filasTabla = [
      {
        id: celdaSeleccionada.estrategia,
        nombre: cfg.nombre,
        valor: val,
        pctOficial: pctStr,
        color: cfg.color,
        texto: cfg.texto,
        isSelected: true,
      },
    ];
    totalTablaCantidad = val;
    totalTablaPctOficial = pctStr;
  } else if (origenSeleccion === 'estrategias_torta' && estrategiaSeleccionada) {
    // CASO 2: Clic en la Torta (Power BI Image 5)
    // Se muestra ÚNICAMENTE la estrategia seleccionada con su valor total
    const itemObj = strategiesList.find((s) => s.id === estrategiaSeleccionada);
    if (itemObj) {
      filasTabla = [
        {
          id: itemObj.id,
          nombre: itemObj.cfg.nombre,
          valor: itemObj.valor,
          pctOficial: itemObj.porcentajeOficial,
          color: itemObj.cfg.color,
          texto: itemObj.cfg.texto,
          isSelected: true,
        },
      ];
      totalTablaCantidad = itemObj.valor;
      totalTablaPctOficial = itemObj.porcentajeOficial;
    }
  } else {
    // CASO 3: Clic en la Tabla de Estrategias o Sin Filtro
    // Se muestran LAS 6 FILAS COMPLETAS con el Total dinámico
    filasTabla = strategiesList.map((s) => ({
      id: s.id,
      nombre: s.cfg.nombre,
      valor: s.valor,
      pctOficial: s.porcentajeOficial,
      color: s.cfg.color,
      texto: s.cfg.texto,
      isSelected: estrategiaSeleccionada === s.id,
    }));
    totalTablaCantidad =
      modo === 'clientes' ? data.totales.cantidad : data.totales.saldo;
    const totalPct =
      modo === 'clientes'
        ? universoTotalClientes > 0
          ? (data.totales.cantidad / universoTotalClientes) * 100
          : 0
        : data.totales.participacionSaldo;
    totalTablaPctOficial = totalPct.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // =========================================================================
  // CONSTRUCCIÓN DINÁMICA DE REBANADAS DE LA TORTA SEGÚN SELECCIÓN (POWER BI CROSS-HIGHLIGHT)
  // Las rebanadas cambian de tamaño físicamente según el valor seleccionado
  // =========================================================================
  interface PieSliceRenderItem {
    id: number;
    subId: string;
    valor: number;
    startAngle: number;
    endAngle: number;
    midAngle: number;
    fillColor: string;
    isHighlighted: boolean;
    isDimmed: boolean;
    calloutLabel?: string;
    cfg: (typeof ESTRATEGIA_COLORES)[number];
  }

  const pieSlices: PieSliceRenderItem[] = [];
  // Inicia en 165.5° para que Fidelización quede arriba a la izquierda y Solución de Conciliación abajo, idéntico a Power BI
  let anguloAcumulado = 165.5;

  strategiesList.forEach((it) => {
    const strategyTotal = it.valor;
    const cfg = it.cfg;
    const pastelColor = ESTRATEGIA_PASTEL_COLORES[it.id] || '#E2E8F0';
    const isStrategySelected = estrategiaSeleccionada === it.id;

    // Caso A: Sin selección alguna -> 6 rebanadas completas vibrantes
    if (!estrategiaSeleccionada && !celdaSeleccionada) {
      const pctReal = totalValorEstrategias > 0 ? (strategyTotal / totalValorEstrategias) * 100 : 0;
      const angulo = (pctReal / 100) * 360;
      const startAngle = anguloAcumulado;
      anguloAcumulado += angulo;
      const endAngle = anguloAcumulado;
      const midAngle = (startAngle + endAngle) / 2;

      pieSlices.push({
        id: it.id,
        subId: `${it.id}`,
        valor: strategyTotal,
        startAngle,
        endAngle,
        midAngle,
        fillColor: cfg.color,
        isHighlighted: true,
        isDimmed: false,
        calloutLabel: `${Math.round(pctReal)}%`,
        cfg,
      });
      return;
    }

    // Caso B: Clic en celda de la matriz (Images 0, 1, 2)
    // El sector seleccionado cambia físicamente de tamaño adaptándose al valor de la celda
    if (origenSeleccion === 'matriz_celda' && celdaSeleccionada) {
      if (isStrategySelected) {
        // 1. Rebanada resaltada con el valor exacto de la celda (en color vibrante)
        const cellVal =
          modo === 'clientes' ? celdaSeleccionada.cantidad : celdaSeleccionada.saldoTotal;
        const cellPct = totalValorEstrategias > 0 ? (cellVal / totalValorEstrategias) * 100 : 0;
        const cellAngle = (cellPct / 100) * 360;
        const start1 = anguloAcumulado;
        anguloAcumulado += cellAngle;
        const end1 = anguloAcumulado;
        const mid1 = (start1 + end1) / 2;

        pieSlices.push({
          id: it.id,
          subId: `${it.id}-highlight`,
          valor: cellVal,
          startAngle: start1,
          endAngle: end1,
          midAngle: mid1,
          fillColor: cfg.color,
          isHighlighted: true,
          isDimmed: false,
          calloutLabel: `${Math.round(cellPct)}%`,
          cfg,
        });

        // 2. Rebanada remanente de la misma estrategia (en color pastel)
        const remVal = Math.max(0, strategyTotal - cellVal);
        if (remVal > 0) {
          const remPct = totalValorEstrategias > 0 ? (remVal / totalValorEstrategias) * 100 : 0;
          const remAngle = (remPct / 100) * 360;
          const start2 = anguloAcumulado;
          anguloAcumulado += remAngle;
          const end2 = anguloAcumulado;
          const mid2 = (start2 + end2) / 2;

          pieSlices.push({
            id: it.id,
            subId: `${it.id}-remainder`,
            valor: remVal,
            startAngle: start2,
            endAngle: end2,
            midAngle: mid2,
            fillColor: pastelColor,
            isHighlighted: false,
            isDimmed: true,
            calloutLabel: undefined,
            cfg,
          });
        }
      } else {
        // Las otras 5 estrategias en pastel con callout "0%"
        const pctReal = totalValorEstrategias > 0 ? (strategyTotal / totalValorEstrategias) * 100 : 0;
        const angulo = (pctReal / 100) * 360;
        const start = anguloAcumulado;
        anguloAcumulado += angulo;
        const end = anguloAcumulado;
        const mid = (start + end) / 2;

        pieSlices.push({
          id: it.id,
          subId: `${it.id}`,
          valor: strategyTotal,
          startAngle: start,
          endAngle: end,
          midAngle: mid,
          fillColor: pastelColor,
          isHighlighted: false,
          isDimmed: true,
          calloutLabel: '0%',
          cfg,
        });
      }
      return;
    }

    // Caso C: Clic en la tabla de estrategias (Images 3, 4)
    if (origenSeleccion === 'estrategias_tabla') {
      const pctReal = totalValorEstrategias > 0 ? (strategyTotal / totalValorEstrategias) * 100 : 0;
      const angulo = (pctReal / 100) * 360;
      const start = anguloAcumulado;
      anguloAcumulado += angulo;
      const end = anguloAcumulado;
      const mid = (start + end) / 2;

      pieSlices.push({
        id: it.id,
        subId: `${it.id}`,
        valor: strategyTotal,
        startAngle: start,
        endAngle: end,
        midAngle: mid,
        fillColor: isStrategySelected ? cfg.color : pastelColor,
        isHighlighted: isStrategySelected,
        isDimmed: !isStrategySelected,
        calloutLabel: isStrategySelected ? `${Math.round(pctReal)}%` : '0%',
        cfg,
      });
      return;
    }

    // Caso D: Clic en la torta (Image 5)
    if (origenSeleccion === 'estrategias_torta') {
      const pctReal = totalValorEstrategias > 0 ? (strategyTotal / totalValorEstrategias) * 100 : 0;
      const angulo = (pctReal / 100) * 360;
      const start = anguloAcumulado;
      anguloAcumulado += angulo;
      const end = anguloAcumulado;
      const mid = (start + end) / 2;

      pieSlices.push({
        id: it.id,
        subId: `${it.id}`,
        valor: strategyTotal,
        startAngle: start,
        endAngle: end,
        midAngle: mid,
        fillColor: isStrategySelected ? cfg.color : pastelColor,
        isHighlighted: isStrategySelected,
        isDimmed: !isStrategySelected,
        calloutLabel: `${Math.round(pctReal)}%`,
        cfg,
      });
      return;
    }
  });

  const handleTableClick = (id: number) => {
    if (onSeleccionarEstrategiaTabla) {
      onSeleccionarEstrategiaTabla(id);
    } else {
      onSeleccionarEstrategia(estrategiaSeleccionada === id ? null : id);
    }
  };

  const handlePieClick = (id: number) => {
    if (onSeleccionarEstrategiaTorta) {
      onSeleccionarEstrategiaTorta(id);
    } else {
      onSeleccionarEstrategia(estrategiaSeleccionada === id ? null : id);
    }
  };

  const hayFiltroActivo = Boolean(estrategiaSeleccionada || celdaSeleccionada);
  const R = 0.96;

  return (
    <div className="bg-white rounded-xl shadow-2xs border border-slate-200/90 overflow-hidden relative flex flex-col h-full">
      {/* =========================================================================
          ENCABEZADO OFICIAL POWER BI: AZUL INSTITUCIONAL (#005B94) CON SUBTÍTULO DORADO
          ========================================================================= */}
      <div className="bg-[#005B94] text-white px-4 sm:px-5 py-2 flex items-center justify-between gap-2 border-b border-blue-900/40">
        <div>
          <h3 className="font-extrabold text-xs sm:text-sm tracking-tight text-white uppercase">
            CUADRO DE ESTRATEGIAS - {modo === 'clientes' ? 'CLIENTES' : 'SALDOS'}
          </h3>
          <p className="text-[10.5px] font-bold text-[#FFD700] tracking-wide mt-0.5">
            Distribución de cartera según cuadrante de estrategia
          </p>
        </div>

        {hayFiltroActivo && (
          <button
            type="button"
            onClick={() => {
              if (onLimpiarSeleccion) onLimpiarSeleccion();
              else onSeleccionarEstrategia(null);
            }}
            className="text-[10px] font-bold bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded cursor-pointer transition-colors"
          >
            ✕ Ver Todos
          </button>
        )}
      </div>

      {/* =========================================================================
          CUERPO: MODO 'SPLIT' (DIVIDIDO) vs MODO 'APILADO' (EXTENDER)
          ========================================================================= */}
      {layout === 'split' ? (
        /* VISTA SPLIT: Cuadro compacto, continuo y sin espacios blancos muertos */
        <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between space-y-2">
          {/* Fila 1: Tabla de Estrategias Dinámica Compacta */}
          <div className="overflow-x-auto rounded-lg border border-slate-200 shrink-0">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#005B94] text-white font-black text-[10px] tracking-wide">
                  <th className="py-1 px-2 border-r border-white/20 text-center">ESTRATEGIA</th>
                  <th className="py-1 px-2 border-r border-white/20 text-center">
                    {modo === 'clientes' ? 'CANTIDAD' : 'SALDO (S/)'}
                  </th>
                  <th className="py-1 px-2 text-center">% PARTICIPACIÓN</th>
                </tr>
              </thead>
              <tbody>
                {filasTabla.map((fila) => (
                  <tr
                    key={fila.id}
                    onClick={() => handleTableClick(fila.id)}
                    className={`cursor-pointer transition-all border-b border-slate-200 select-none ${
                      fila.isSelected
                        ? 'ring-2 ring-inset ring-emerald-500 font-extrabold shadow-xs z-10'
                        : 'hover:brightness-95'
                    }`}
                  >
                    <td
                      style={{
                        backgroundColor: fila.color,
                        color: fila.texto,
                      }}
                      className="py-0.5 px-2 font-black text-[10px] uppercase truncate border-r border-white/20"
                    >
                      {fila.nombre}
                    </td>
                    <td className="py-0.5 px-2 text-center font-mono font-bold text-slate-900 border-r border-slate-200 bg-white text-[10.5px]">
                      {modo === 'clientes'
                        ? fila.valor.toLocaleString('es-PE')
                        : 'S/ ' +
                          fila.valor.toLocaleString('es-PE', {
                            maximumFractionDigits: 0,
                          })}
                    </td>
                    <td className="py-0.5 px-2 text-center font-mono font-bold text-slate-900 bg-white text-[10.5px]">
                      {fila.pctOficial} %
                    </td>
                  </tr>
                ))}

                {/* Fila Total */}
                <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                  <td className="py-0.5 px-2 uppercase text-[10px] border-r border-slate-300">
                    Total
                  </td>
                  <td className="py-0.5 px-2 text-center font-mono text-[10.5px] border-r border-slate-300">
                    {modo === 'clientes'
                      ? totalTablaCantidad.toLocaleString('es-PE')
                      : 'S/ ' +
                        totalTablaCantidad.toLocaleString('es-PE', {
                          maximumFractionDigits: 0,
                        })}
                  </td>
                  <td className="py-0.5 px-2 text-center font-mono text-[10.5px]">
                    {totalTablaPctOficial} %
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Fila 2: Gráfico de Torta Dinámico Compacto + Leyenda Oficial */}
          <div className="pt-2 border-t border-slate-100 flex-1 flex items-center justify-center">
            <div className="w-full grid grid-cols-1 sm:grid-cols-12 gap-1 items-center">
              {/* Torta Circular SVG ampliada con porcentajes dentro de los colores (7 cols) */}
              <div className="sm:col-span-7 flex items-center justify-center">
                <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                  <svg
                    viewBox="-1.04 -1.04 2.08 2.08"
                    className="w-full h-full select-none filter drop-shadow-2xs"
                  >
                  {pieSlices.map((slice) => {
                    if (slice.valor <= 0) return null;
                    const startRad = (slice.startAngle * Math.PI) / 180;
                    const endRad = (slice.endAngle * Math.PI) / 180;
                    const largeArcFlag =
                      slice.endAngle - slice.startAngle > 180 ? 1 : 0;

                    const currentR = R;
                    const ox1 = currentR * Math.cos(startRad);
                    const oy1 = currentR * Math.sin(startRad);
                    const ox2 = currentR * Math.cos(endRad);
                    const oy2 = currentR * Math.sin(endRad);

                    const pathData = `M 0 0 L ${ox1} ${oy1} A ${currentR} ${currentR} 0 ${largeArcFlag} 1 ${ox2} ${oy2} Z`;

                    // Cálculo de etiqueta interna centrada en el sector
                    const showLabel = Boolean(
                      slice.calloutLabel &&
                      (!slice.isDimmed || !hayFiltroActivo) &&
                      slice.calloutLabel !== '0%'
                    );

                    const span = slice.endAngle - slice.startAngle;
                    let labelR = R * 0.60;
                    let fontSize = '0.135';

                    if (span < 9) {
                      labelR = R * 0.72;
                      fontSize = '0.085';
                    } else if (span < 16) {
                      labelR = R * 0.69;
                      fontSize = '0.095';
                    } else if (span < 28) {
                      labelR = R * 0.65;
                      fontSize = '0.115';
                    }

                    const midRad = (((slice.startAngle + slice.endAngle) / 2) * Math.PI) / 180;
                    const tx = labelR * Math.cos(midRad);
                    const ty = labelR * Math.sin(midRad);
                    const textColor = slice.cfg.texto || '#FFFFFF';

                    return (
                      <g key={slice.subId}>
                        <path
                          d={pathData}
                          fill={slice.fillColor}
                          stroke="#ffffff"
                          strokeWidth="0.015"
                          onClick={() => handlePieClick(slice.id)}
                          className={`cursor-pointer transition-all duration-300 ${
                            slice.isDimmed
                              ? 'opacity-85'
                              : 'opacity-100 hover:brightness-105'
                          }`}
                        >
                          <title>{`${slice.cfg.nombre}: ${slice.calloutLabel || ''}`}</title>
                        </path>

                        {showLabel && (
                          <text
                            x={tx}
                            y={ty}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={fontSize}
                            fontWeight="900"
                            fill={textColor}
                            className="select-none font-sans pointer-events-none drop-shadow-xs"
                          >
                            {slice.calloutLabel}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Micro-Leyenda vertical ESTRATEGIA (5 cols) */}
            <div className="sm:col-span-5 flex flex-col gap-0.5 text-[9.5px] font-bold text-slate-700 min-w-0">
              <span className="text-[8.5px] font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">
                ESTRATEGIA
              </span>
              {strategiesList.map((s) => {
                const isSelected = estrategiaSeleccionada === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handlePieClick(s.id)}
                    className={`flex items-center gap-1.5 text-left cursor-pointer transition-colors truncate hover:text-slate-950 py-0.5 ${
                      isSelected
                        ? 'font-black text-slate-950'
                        : estrategiaSeleccionada !== null
                        ? 'opacity-40 hover:opacity-100'
                        : ''
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: s.cfg.color }}
                    />
                    <span className="truncate">{s.cfg.nombre}</span>
                  </button>
                );
              })}
            </div>
          </div>
          </div>
        </div>
      ) : (
        /* VISTA APILADA COMPLETA (3 COLUMNAS POWER BI EXACTAS) */
        <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Col 1: Tabla de Estrategias Oficial (5 cols) */}
          <div className="lg:col-span-5 min-w-0 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-xs text-left">
              <thead>
                <tr className="bg-[#005B94] text-white font-black text-[11px] tracking-wide">
                  <th className="py-2.5 px-3 border-r border-white/20 text-center">ESTRATEGIA</th>
                  <th className="py-2.5 px-3 border-r border-white/20 text-center">
                    {modo === 'clientes' ? 'CANTIDAD' : 'SALDO (S/)'}
                  </th>
                  <th className="py-2.5 px-3 text-center">% PARTICIPACIÓN</th>
                </tr>
              </thead>
              <tbody>
                {filasTabla.map((fila) => (
                  <tr
                    key={fila.id}
                    onClick={() => handleTableClick(fila.id)}
                    className={`cursor-pointer transition-all border-b border-slate-200 ${
                      fila.isSelected
                        ? 'ring-2 ring-inset ring-emerald-500 font-extrabold shadow-sm'
                        : 'hover:brightness-95'
                    }`}
                  >
                    <td
                      style={{
                        backgroundColor: fila.color,
                        color: fila.texto,
                      }}
                      className="py-2 px-3 font-black text-[11px] uppercase truncate border-r border-white/20"
                    >
                      {fila.nombre}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-900 border-r border-slate-200 bg-white">
                      {modo === 'clientes'
                        ? fila.valor.toLocaleString('es-PE')
                        : 'S/ ' +
                          fila.valor.toLocaleString('es-PE', {
                            maximumFractionDigits: 0,
                          })}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-900 bg-white">
                      {fila.pctOficial} %
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                  <td className="py-2.5 px-3 uppercase text-[11px] border-r border-slate-300">
                    Total
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-[11.5px] border-r border-slate-300">
                    {modo === 'clientes'
                      ? totalTablaCantidad.toLocaleString('es-PE')
                      : 'S/ ' +
                        totalTablaCantidad.toLocaleString('es-PE', {
                          maximumFractionDigits: 0,
                        })}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-[11.5px]">
                    {totalTablaPctOficial} %
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Col 2: Gráfico de Torta Power BI ampliado con porcentajes internos + Leyenda (4 cols) */}
          <div className="lg:col-span-4 flex items-center justify-center gap-4">
            <div className="relative w-56 h-56 shrink-0 flex items-center justify-center">
              <svg
                viewBox="-1.04 -1.04 2.08 2.08"
                className="w-full h-full select-none filter drop-shadow-xs"
              >
                {pieSlices.map((slice) => {
                  if (slice.valor <= 0) return null;
                  const startRad = (slice.startAngle * Math.PI) / 180;
                  const endRad = (slice.endAngle * Math.PI) / 180;
                  const largeArcFlag =
                    slice.endAngle - slice.startAngle > 180 ? 1 : 0;

                  const currentR = R;
                  const ox1 = currentR * Math.cos(startRad);
                  const oy1 = currentR * Math.sin(startRad);
                  const ox2 = currentR * Math.cos(endRad);
                  const oy2 = currentR * Math.sin(endRad);

                  const pathData = `M 0 0 L ${ox1} ${oy1} A ${currentR} ${currentR} 0 ${largeArcFlag} 1 ${ox2} ${oy2} Z`;

                  // Cálculo de etiqueta interna centrada en el sector
                  const showLabel = Boolean(
                    slice.calloutLabel &&
                    (!slice.isDimmed || !hayFiltroActivo) &&
                    slice.calloutLabel !== '0%'
                  );

                  const span = slice.endAngle - slice.startAngle;
                  let labelR = R * 0.60;
                  let fontSize = '0.135';

                  if (span < 9) {
                    labelR = R * 0.72;
                    fontSize = '0.085';
                  } else if (span < 16) {
                    labelR = R * 0.69;
                    fontSize = '0.095';
                  } else if (span < 28) {
                    labelR = R * 0.65;
                    fontSize = '0.115';
                  }

                  const midRad = (((slice.startAngle + slice.endAngle) / 2) * Math.PI) / 180;
                  const tx = labelR * Math.cos(midRad);
                  const ty = labelR * Math.sin(midRad);
                  const textColor = slice.cfg.texto || '#FFFFFF';

                  return (
                    <g key={slice.subId}>
                      <path
                        d={pathData}
                        fill={slice.fillColor}
                        stroke="#ffffff"
                        strokeWidth="0.015"
                        onClick={() => handlePieClick(slice.id)}
                        className={`cursor-pointer transition-all duration-300 ${
                          slice.isDimmed
                            ? 'opacity-85'
                            : 'opacity-100 hover:brightness-105'
                        }`}
                      >
                        <title>{`${slice.cfg.nombre}: ${slice.calloutLabel || ''}`}</title>
                      </path>

                      {showLabel && (
                        <text
                          x={tx}
                          y={ty}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={fontSize}
                          fontWeight="900"
                          fill={textColor}
                          className="select-none font-sans pointer-events-none drop-shadow-xs"
                        >
                          {slice.calloutLabel}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Leyenda Oficial ESTRATEGIA */}
            <div className="flex flex-col gap-1.5 text-[11px] font-semibold text-slate-700 min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">
                ESTRATEGIA
              </span>
              {strategiesList.map((s) => {
                const isSelected = estrategiaSeleccionada === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handlePieClick(s.id)}
                    className={`flex items-center gap-1.5 text-left cursor-pointer truncate hover:text-slate-950 ${
                      isSelected
                        ? 'font-black text-slate-950'
                        : estrategiaSeleccionada !== null
                        ? 'opacity-40 hover:opacity-100'
                        : ''
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: s.cfg.color }}
                    />
                    <span className="truncate">{s.cfg.nombre}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Col 3: Lista Oficial de Acciones con Viñetas Power BI (3 cols) */}
          <div className="lg:col-span-3 border-l border-slate-200 pl-4 space-y-2">
            {strategiesList.map((s) => {
              const isSelected = estrategiaSeleccionada === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => handleTableClick(s.id)}
                  className={`cursor-pointer p-1 rounded-md transition-colors ${
                    isSelected
                      ? 'bg-slate-100 ring-1 ring-slate-900 font-extrabold'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div
                    className="font-black text-xs uppercase"
                    style={{
                      color:
                        s.cfg.color === '#FFFF00'
                          ? '#997300'
                          : s.cfg.color,
                    }}
                  >
                    {s.cfg.nombre}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-800 leading-tight mt-0.5">
                    {s.cfg.accion}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
