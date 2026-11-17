'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  portfolioService,
  DetalleClientesPaginadoResponse,
} from '../services/portfolioService';
import {
  ESTRATEGIA_COLORES,
  getEstrategiaColor,
  useEstrategiaColores,
} from '../constants/estrategiaColores';
import { CustomSelect } from './CustomSelect';

interface PadronClientesProps {
  periodo: string;
  periodos?: string[];
  onPeriodoChange?: (periodo: string) => void;
  entidad: string;
  hideToolbar?: boolean;
}

const DEPARTAMENTOS_PERU = [
  'Todas',
  'LIMA',
  'AREQUIPA',
  'CUSCO',
  'LA LIBERTAD',
  'PIURA',
  'JUNIN',
  'LAMBAYEQUE',
  'ANCASH',
  'ICA',
  'CAJAMARCA',
  'SAN MARTIN',
  'PUNO',
  'LORETO',
  'UCAYALI',
  'HUANUCO',
  'AYACUCHO',
  'TACNA',
  'APURIMAC',
  'MOQUEGUA',
  'PASCO',
  'AMAZONAS',
  'HUANCAVELICA',
  'MADRE DE DIOS',
  'TUMBES',
  'CALLAO',
];

/**
 * Limpia y normaliza la Razón Social / Nombre.
 * En bases de datos del sistema financiero / SBS, el carácter '#' reemplaza a la 'Ñ'
 * (ej. #A#A -> ÑAÑA, #A#EZ -> ÑAÑEZ, PE#A -> PEÑA). También limpia espacios dobles y artefactos.
 */
function limpiarRazonSocial(nombre: string | null | undefined): string {
  if (!nombre) return '—';
  let s = String(nombre).trim();
  s = s.replace(/M#NICA/gi, 'MÓNICA');
  s = s.replace(/#/g, 'Ñ');
  s = s.replace(/\s+/g, ' ');
  return s;
}

/**
 * Formatea campos de texto (Ubigeo): si es 'NULL', 'NO DEFINIDO' o vacío,
 * muestra un guión limpio '—' en vez del texto 'NULL'.
 */
function renderTextoUbigeo(texto: string | null | undefined) {
  if (
    !texto ||
    texto.trim() === '' ||
    texto.trim().toUpperCase() === 'NULL' ||
    texto.trim().toUpperCase() === 'NO DEFINIDO'
  ) {
    return <span className="text-slate-300 font-bold select-none">—</span>;
  }
  const limpio = texto.trim();
  return (
    <span className="truncate block" title={limpio}>
      {limpio}
    </span>
  );
}

/**
 * Formatea porcentaje del scoring SBS a 2 decimales exactos (ej. 99.67%, 0.33%, 0.00%).
 * Evita redondeos a enteros que distorsionan el perfil de riesgo crediticio.
 */
function formatPorcentaje(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '0.00%';
  return `${Number(val).toFixed(2)}%`;
}

/**
 * Normaliza el número de entidades financieras con 3 dígitos (ej. 4 -> 004).
 */
function formatEntidades(val: string | number | null | undefined): string {
  if (val == null || val === '') return '000';
  const str = String(val).trim();
  if (/^\d+$/.test(str)) {
    return str.padStart(3, '0');
  }
  return str;
}

export function PadronClientes({
  periodo,
  periodos,
  onPeriodoChange,
  entidad,
  hideToolbar = false,
}: PadronClientesProps) {
  const { colores: configColores } = useEstrategiaColores(
    entidad ? { entidad } : undefined
  );
  const [estrategia, setEstrategia] = useState<number>(0);
  const [departamento, setDepartamento] = useState<string>('Todas');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string>('');
  const [resultado, setResultado] = useState<DetalleClientesPaginadoResponse | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const searchTermRef = useRef<string>('');

  const cargarDatos = async (
    nuevaPagina: number = page,
    estrategiaId: number = estrategia,
    dpto: string = departamento,
    search: string = searchTerm
  ) => {
    setLoading(true);
    try {
      const data = await portfolioService.getDetalle({
        periodo,
        entidad,
        estrategia: estrategiaId > 0 ? estrategiaId : undefined,
        departamento: dpto !== 'Todas' ? dpto : undefined,
        search: search || undefined,
        page: nuevaPagina,
        limit: 15,
      });
      setResultado(data);
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollLeft = 0;
      }
    } catch (e) {
      console.error('Error al cargar detalle de clientes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!periodo) return;
    let active = true;
    const fetchInitialOrFiltered = async () => {
      await Promise.resolve();
      if (!active) return;
      setLoading(true);
      try {
        const data = await portfolioService.getDetalle({
          periodo,
          entidad,
          estrategia: estrategia > 0 ? estrategia : undefined,
          departamento: departamento !== 'Todas' ? departamento : undefined,
          search: searchTermRef.current || undefined,
          page: 1,
          limit: 15,
        });
        if (!active) return;
        setPage(1);
        setResultado(data);
        if (tableContainerRef.current) {
          tableContainerRef.current.scrollLeft = 0;
        }
      } catch (e) {
        console.error('Error al cargar detalle de clientes:', e);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchInitialOrFiltered();
    return () => {
      active = false;
    };
  }, [periodo, entidad, estrategia, departamento]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    cargarDatos(1, estrategia, departamento, searchTerm);
  };

  const handleDescargar = async () => {
    setExporting(true);
    setExportError('');
    try {
      await portfolioService.descargarPadronExcel({
        periodo,
        entidad,
        estrategia: estrategia > 0 ? estrategia : undefined,
        departamento: departamento !== 'Todas' ? departamento : undefined,
        search: searchTerm || undefined,
      });
    } catch (e: unknown) {
      console.error('Error al exportar a Excel:', e);
      setExportError(
        e instanceof Error ? e.message : 'No se pudo exportar el padrón a Excel.'
      );
    } finally {
      setExporting(false);
    }
  };

  const hayFiltrosActivos = estrategia !== 0 || departamento !== 'Todas' || searchTerm.trim() !== '';

  return (
    <div className="bg-white rounded-xl shadow-2xs border border-slate-200/90 overflow-hidden">
      {/* =========================================================================
          ENCABEZADO INSTITUCIONAL OFICIAL POWER BI (#005B94 CON SUBTÍTULO DORADO)
          ========================================================================= */}
      {!hideToolbar && (
        <div className="bg-[#005B94] text-white px-4 sm:px-6 py-2.5 border-b border-blue-900/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="min-w-0 shrink">
            <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white uppercase truncate">
              PADRÓN NOMINAL DE CLIENTES - REGISTRO GRANULAR
            </h3>
            <p className="text-xs font-bold text-[#FFD700] tracking-wide mt-0.5 truncate">
              Consulta individual de deudores, estratificación de riesgo y scoring crediticio
            </p>
          </div>

          {/* Selector de Periodo + Botón Oficial Verde Excel */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5 shrink-0 justify-between sm:justify-end">
            {periodos && periodos.length > 0 && (
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
              />
            )}

            <button
              type="button"
              onClick={handleDescargar}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-md bg-[#107C41] hover:bg-[#0E6C38] text-white transition-all disabled:opacity-50 cursor-pointer shrink-0 shadow-xs active:scale-[0.99] whitespace-nowrap"
              title="Exportar archivo Excel oficial (.xlsx)"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5m0 0l5-5m-5 5V3" />
              </svg>
              <span>{exporting ? 'Exportando...' : 'Exportar Padrón'}</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          CUERPO DEL PADRÓN: FILTROS ESTRATÉGICOS + BÚSQUEDA + TABLA INSTITUCIONAL
          ========================================================================= */}
      <div className="p-3.5 sm:p-5 space-y-3.5">
        {exportError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3.5 py-2.5 rounded-lg flex items-center justify-between gap-2">
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

        {/* Selector de Pestañas de Estrategia con Colores Oficiales Power BI */}
        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-slate-200 pb-3 -mx-1 px-1 touch-pan-x">
          {[
            { id: 0, label: 'Todas las Estrategias', color: '#005B94', texto: '#FFFFFF' },
            { id: 1, label: '1. Fidelización', color: configColores[1]?.color || ESTRATEGIA_COLORES[1].color, texto: configColores[1]?.texto || '#FFFFFF' },
            { id: 2, label: '2. Prevención', color: configColores[2]?.color || ESTRATEGIA_COLORES[2].color, texto: configColores[2]?.texto || '#FFFFFF' },
            { id: 3, label: '3. Mitigación', color: configColores[3]?.color || ESTRATEGIA_COLORES[3].color, texto: configColores[3]?.texto || '#000000' },
            { id: 4, label: '4. Blindaje', color: configColores[4]?.color || ESTRATEGIA_COLORES[4].color, texto: configColores[4]?.texto || '#FFFFFF' },
            { id: 5, label: '5. Cobranza Direccionada', color: configColores[5]?.color || ESTRATEGIA_COLORES[5].color, texto: configColores[5]?.texto || '#FFFFFF' },
            { id: 6, label: '6. Solución de Conciliación', color: configColores[6]?.color || ESTRATEGIA_COLORES[6].color, texto: configColores[6]?.texto || '#FFFFFF' },
          ].map((tab) => {
            const isActive = estrategia === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setEstrategia(tab.id)}
                style={
                  isActive
                    ? {
                        backgroundColor: tab.color,
                        color: tab.texto,
                      }
                    : undefined
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap select-none ${
                  isActive
                    ? 'shadow-xs ring-2 ring-slate-900/20 brightness-105'
                    : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 border border-slate-200/90 shadow-2xs'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                  style={{
                    backgroundColor: isActive ? tab.texto : tab.color,
                  }}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Barra Integrada de Filtros y Búsqueda Ejecutiva */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-lg p-2 sm:p-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Formulario de Búsqueda con Icono */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Buscar por DNI, RUC o Razón Social / Nombre..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  searchTermRef.current = e.target.value;
                }}
                className="w-full text-xs pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-md focus:outline-hidden focus:border-[#005B94] focus:ring-1 focus:ring-[#005B94] font-medium shadow-2xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    searchTermRef.current = '';
                    setPage(1);
                    cargarDatos(1, estrategia, departamento, '');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-[#005B94] hover:bg-[#004775] text-white text-xs font-extrabold rounded-md transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Buscar</span>
            </button>
          </form>

          {/* Filtro por Departamento y Botón de Limpiar */}
          <div className="flex items-center gap-2 shrink-0">
            <CustomSelect
              value={departamento}
              onChange={setDepartamento}
              options={[
                { value: 'Todas', label: 'Todos los Departamentos', sublabel: 'Nivel Nacional' },
                ...DEPARTAMENTOS_PERU.filter((d) => d !== 'Todas').map((d) => ({
                  value: d,
                  label: d,
                })),
              ]}
              ariaLabel="Filtrar por Departamento"
              size="md"
            />

            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={() => {
                  setEstrategia(0);
                  setDepartamento('Todas');
                  setSearchTerm('');
                  searchTermRef.current = '';
                  setPage(1);
                  cargarDatos(1, 0, 'Todas', '');
                }}
                className="text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-2 rounded-md border border-amber-300/80 cursor-pointer transition-colors whitespace-nowrap shadow-2xs"
                title="Quitar todos los filtros aplicados"
              >
                ✕ Limpiar Filtros
              </button>
            )}
          </div>
        </div>

        {/* Tabla Institucional del Padrón de Clientes */}
        <div
          ref={tableContainerRef}
          className="overflow-x-auto border border-slate-200 rounded-lg bg-white relative touch-pan-x [scrollbar-width:thin] shadow-2xs"
        >
          {loading && resultado && resultado.data.length > 0 && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-amber-400 to-[#005B94] animate-pulse z-30" />
          )}

          <table className="w-full min-w-[1315px] table-fixed border-separate border-spacing-0 text-[11px]">
            <colgroup>
              <col style={{ width: '70px', minWidth: '70px' }} />
              <col style={{ width: '95px', minWidth: '95px' }} />
              <col style={{ width: '220px', minWidth: '220px' }} />
              <col style={{ width: '130px', minWidth: '130px' }} />
              <col style={{ width: '110px', minWidth: '110px' }} />
              <col style={{ width: '105px', minWidth: '105px' }} />
              <col style={{ width: '115px', minWidth: '115px' }} />
              <col style={{ width: '115px', minWidth: '115px' }} />
              <col style={{ width: '125px', minWidth: '125px' }} />
              <col style={{ width: '48px', minWidth: '48px' }} />
              <col style={{ width: '52px', minWidth: '52px' }} />
              <col style={{ width: '58px', minWidth: '58px' }} />
              <col style={{ width: '58px', minWidth: '58px' }} />
              <col style={{ width: '58px', minWidth: '58px' }} />
              <col style={{ width: '58px', minWidth: '58px' }} />
              <col style={{ width: '58px', minWidth: '58px' }} />
            </colgroup>

            <thead>
              <tr className="bg-[#005B94] text-white font-black text-[10px] uppercase tracking-wide">
                <th
                  style={{ left: 0, width: '70px', minWidth: '70px', maxWidth: '70px' }}
                  className="sticky left-0 bg-[#005B94] z-30 py-2.5 px-2 text-center border-b border-blue-900/40 border-r border-white/20 whitespace-nowrap"
                >
                  PERIODO
                </th>
                <th
                  style={{ left: '70px', width: '95px', minWidth: '95px', maxWidth: '95px' }}
                  className="sticky bg-[#005B94] z-30 py-2.5 px-2 text-center border-b border-blue-900/40 border-r border-white/20 whitespace-nowrap"
                >
                  DOCUMENTO
                </th>
                <th
                  style={{ left: '165px', width: '220px', minWidth: '220px', maxWidth: '220px' }}
                  className="sticky bg-[#005B94] z-30 py-2.5 px-2.5 text-left border-b border-blue-900/40 border-r border-white/30 whitespace-nowrap shadow-[4px_0_8px_-2px_rgba(0,0,0,0.25)]"
                >
                  RAZÓN SOCIAL / CLIENTE
                </th>
                <th className="py-2.5 px-2 text-center border-b border-blue-900/40 border-r border-white/20 whitespace-nowrap">
                  ESTRATEGIA
                </th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap border-b border-blue-900/40 border-r border-white/20">
                  SALDO VIG.
                </th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap border-b border-blue-900/40 border-r border-white/20">
                  SALDO CAST.
                </th>
                <th className="py-2.5 px-2.5 text-center border-b border-blue-900/40 border-r border-white/20 whitespace-nowrap">
                  DEPARTAMENTO
                </th>
                <th className="py-2.5 px-2.5 text-center border-b border-blue-900/40 border-r border-white/20 whitespace-nowrap">
                  PROVINCIA
                </th>
                <th className="py-2.5 px-2.5 text-center border-b border-blue-900/40 border-r border-white/20 whitespace-nowrap">
                  DISTRITO
                </th>
                <th className="py-2.5 px-1 text-center border-b border-blue-900/40 border-r border-white/20 whitespace-nowrap" title="Número de Entidades">
                  ENT.
                </th>
                <th className="py-2.5 px-1 text-center bg-[#004775] border-b border-blue-900/40 border-r border-white/20 whitespace-nowrap" title="Calificación en el Sistema Financiero SBS">
                  CALIF.
                </th>
                <th className="py-2.5 px-1 text-center border-b border-blue-900/40 border-r border-white/20 whitespace-nowrap" title="Normal (% con 2 decimales)">
                  NOR
                </th>
                <th className="py-2.5 px-1 text-center border-b border-blue-900/40 border-r border-white/20 whitespace-nowrap" title="Con Problemas Potenciales (% con 2 decimales)">
                  CPP
                </th>
                <th className="py-2.5 px-1 text-center border-b border-blue-900/40 border-r border-white/20 whitespace-nowrap" title="Deficiente (% con 2 decimales)">
                  DEF
                </th>
                <th className="py-2.5 px-1 text-center border-b border-blue-900/40 border-r border-white/20 whitespace-nowrap" title="Dudoso (% con 2 decimales)">
                  DUD
                </th>
                <th className="py-2.5 px-1 text-center border-b border-blue-900/40 whitespace-nowrap" title="Pérdida (% con 2 decimales)">
                  PER
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-slate-500">
                    <div className="w-8 h-8 border-3 border-slate-200 border-t-[#005B94] rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">Consultando registros del padrón en SQL Server...</p>
                  </td>
                </tr>
              ) : resultado && resultado.data.length > 0 ? (
                resultado.data.map((c, idx) => {
                  const nombreLimpio = limpiarRazonSocial(c.razonSocial);
                  const cfgEstrategia = getEstrategiaColor(c.estrategia);

                  return (
                    <tr
                      key={idx}
                      className="group hover:bg-[#F4F9FD] transition-colors text-slate-700 font-medium select-text"
                    >
                      {/* Periodo (Sticky 100% sólido opaco) */}
                      <td
                        style={{ left: 0, width: '70px', minWidth: '70px', maxWidth: '70px' }}
                        className="sticky left-0 bg-white group-hover:bg-[#EBF3FB] z-20 py-2 px-2 text-center font-mono font-semibold text-slate-500 text-[10px] border-b border-slate-200 border-r border-slate-200 whitespace-nowrap"
                      >
                        {c.periodo}
                      </td>

                      {/* Documento (Sticky 100% sólido opaco) */}
                      <td
                        style={{ left: '70px', width: '95px', minWidth: '95px', maxWidth: '95px' }}
                        className="sticky bg-white group-hover:bg-[#EBF3FB] z-20 py-2 px-2 font-mono font-bold text-slate-900 border-b border-slate-200 border-r border-slate-200 whitespace-nowrap"
                      >
                        <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 text-[10px] tracking-tight">
                          {c.documento}
                        </span>
                      </td>

                      {/* Razón Social / Nombre (Sticky 100% sólido opaco con elevación de sombra) */}
                      <td
                        style={{ left: '165px', width: '220px', minWidth: '220px', maxWidth: '220px' }}
                        className="sticky bg-white group-hover:bg-[#EBF3FB] z-20 py-2 px-2.5 font-extrabold text-slate-900 truncate border-b border-slate-200 border-r border-slate-300 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.12)]"
                        title={nombreLimpio}
                      >
                        {nombreLimpio}
                      </td>

                      {/* Chip de Estrategia Oficial */}
                      <td className="py-2 px-1.5 text-center border-b border-slate-100 border-r border-slate-100">
                        <span
                          className="inline-block px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase tracking-tight shadow-2xs truncate max-w-full"
                          style={{
                            backgroundColor: cfgEstrategia.color,
                            color: cfgEstrategia.texto,
                          }}
                          title={c.estrategiaDescripcion || cfgEstrategia.nombre}
                        >
                          {c.estrategiaDescripcion || cfgEstrategia.nombre}
                        </span>
                      </td>

                      {/* Saldo Vigente */}
                      <td className="py-2 px-2 text-right font-mono font-bold text-emerald-700 whitespace-nowrap tabular-nums border-b border-slate-100 border-r border-slate-100">
                        {c.saldoVigente > 0 ? (
                          `S/ ${c.saldoVigente.toLocaleString('es-PE', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        ) : (
                          <span className="text-slate-400 font-normal">S/ 0.00</span>
                        )}
                      </td>

                      {/* Saldo Castigado */}
                      <td className="py-2 px-2 text-right font-mono font-bold whitespace-nowrap tabular-nums border-b border-slate-100 border-r border-slate-100">
                        {c.saldoCastigado > 0 ? (
                          <span className="text-rose-700">
                            {`S/ ${c.saldoCastigado.toLocaleString('es-PE', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">S/ 0.00</span>
                        )}
                      </td>

                      {/* Ubigeo: Departamento / Provincia / Distrito */}
                      <td className="py-2 px-2.5 text-slate-700 truncate border-b border-slate-100 border-r border-slate-100">
                        {renderTextoUbigeo(c.departamento)}
                      </td>
                      <td className="py-2 px-2.5 text-slate-700 truncate border-b border-slate-100 border-r border-slate-100">
                        {renderTextoUbigeo(c.provincia)}
                      </td>
                      <td className="py-2 px-2.5 text-slate-700 truncate border-b border-slate-100 border-r border-slate-100">
                        {renderTextoUbigeo(c.distrito)}
                      </td>

                      {/* Número de Entidades */}
                      <td className="py-2 px-1 text-center font-mono font-bold text-slate-800 text-[10px] border-b border-slate-100 border-r border-slate-100">
                        {formatEntidades(c.numeroEntidades)}
                      </td>

                      {/* Calificación SBS */}
                      <td className="py-2 px-1 text-center bg-slate-50/70 border-b border-slate-100 border-r border-slate-100">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[9.5px] font-black tracking-tight shadow-2xs ${
                            c.calificacionCliente === 'NOR'
                              ? 'bg-emerald-600 text-white'
                              : c.calificacionCliente === 'CPP'
                              ? 'bg-amber-400 text-slate-950'
                              : c.calificacionCliente === 'DEF'
                              ? 'bg-orange-500 text-white'
                              : c.calificacionCliente === 'DUD'
                              ? 'bg-purple-600 text-white'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {c.calificacionCliente || 'S/C'}
                        </span>
                      </td>

                      {/* Scoring SBS porcentual con 2 decimales exactos */}
                      <td className="py-2 px-1 text-right font-mono text-[10px] border-b border-slate-100 border-r border-slate-100 tabular-nums">
                        <span className={c.nor > 0 ? 'font-bold text-slate-900' : 'text-slate-300'}>
                          {formatPorcentaje(c.nor)}
                        </span>
                      </td>
                      <td className="py-2 px-1 text-right font-mono text-[10px] border-b border-slate-100 border-r border-slate-100 tabular-nums">
                        <span className={c.cpp > 0 ? 'font-bold text-slate-900' : 'text-slate-300'}>
                          {formatPorcentaje(c.cpp)}
                        </span>
                      </td>
                      <td className="py-2 px-1 text-right font-mono text-[10px] border-b border-slate-100 border-r border-slate-100 tabular-nums">
                        <span className={c.def > 0 ? 'font-bold text-slate-900' : 'text-slate-300'}>
                          {formatPorcentaje(c.def)}
                        </span>
                      </td>
                      <td className="py-2 px-1 text-right font-mono text-[10px] border-b border-slate-100 border-r border-slate-100 tabular-nums">
                        <span className={c.dud > 0 ? 'font-bold text-slate-900' : 'text-slate-300'}>
                          {formatPorcentaje(c.dud)}
                        </span>
                      </td>
                      <td className="py-2 px-1 text-right font-mono text-[10px] border-b border-slate-100 tabular-nums">
                        <span className={c.per > 0 ? 'font-bold text-slate-900' : 'text-slate-300'}>
                          {formatPorcentaje(c.per)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={16} className="py-10 text-center text-slate-500">
                    <p className="font-bold text-xs text-slate-700">No se encontraron clientes con los filtros aplicados.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Intenta buscar por otro documento, limpiar el filtro de estrategia o departamento.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación y Resumen de Registros */}
        {resultado && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 pt-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#005B94]" />
              <span>
                Página <strong>{resultado.page}</strong> de{' '}
                <strong>{resultado.totalPages}</strong> &mdash; Total:{' '}
                <strong className="text-slate-900">{resultado.total.toLocaleString('es-PE')}</strong> clientes evaluados
              </span>
            </div>

            {resultado.totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => {
                    const p = Math.max(1, page - 1);
                    setPage(p);
                    cargarDatos(p, estrategia, departamento, searchTerm);
                  }}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-md font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors text-xs cursor-pointer shadow-2xs"
                >
                  ◀ Anterior
                </button>
                <span className="font-extrabold text-slate-900 px-2 py-1 bg-slate-100 rounded-md text-xs border border-slate-200">
                  {page} / {resultado.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= resultado.totalPages || loading}
                  onClick={() => {
                    const p = Math.min(resultado.totalPages, page + 1);
                    setPage(p);
                    cargarDatos(p, estrategia, departamento, searchTerm);
                  }}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-md font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors text-xs cursor-pointer shadow-2xs"
                >
                  Siguiente ▶
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
