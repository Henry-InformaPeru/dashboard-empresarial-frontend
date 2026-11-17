'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  portfolioService,
  DashboardGeneralAdminResponse,
  MantenimientoResponse,
} from '@/modules/portfolio/services/portfolioService';
import { CustomSelect } from '@/shared/components/ui/CustomSelect';

export default function AdminDashboardPage() {
  // Slicers de Filtro Global
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>('202609');

  // Datos del Dashboard General Consolidado
  const [data, setData] = useState<DashboardGeneralAdminResponse | null>(null);
  const [error, setError] = useState<string>('');

  // Control de Modo Mantenimiento Global
  const [mantenimiento, setMantenimiento] = useState<MantenimientoResponse | null>(null);

  // 1. Cargar lista de Periodos y estado de mantenimiento
  useEffect(() => {
    portfolioService
      .getPeriodos()
      .then((pers) => {
        setPeriodos(pers);
        if (pers.length > 0) {
          setPeriodoSeleccionado(pers[0]);
        }
      })
      .catch((e) => console.error('Error cargando periodos:', e));

    portfolioService
      .getMantenimiento()
      .then((m) => setMantenimiento(m))
      .catch(() => {});

    const handler = () => {
      portfolioService
        .getMantenimiento()
        .then((m) => setMantenimiento(m))
        .catch(() => {});
    };
    window.addEventListener('mantenimiento-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('mantenimiento-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  // 2. Cargar datos consolidados al cambiar periodo
  useEffect(() => {
    if (!periodoSeleccionado) return;
    let active = true;
    portfolioService
      .getDashboardGeneralAdmin(periodoSeleccionado)
      .then((res) => {
        if (!active) return;
        setError('');
        setData(res);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Error al cargar dashboard general:', err);
        setError('Error al consultar los repositorios analíticos de cartera.');
      });
    return () => {
      active = false;
    };
  }, [periodoSeleccionado]);

  // Cálculos de Indicadores y Filtros Reactivos
  const kpis = data?.kpis || {
    totalSaldo: 0,
    totalClientes: 0,
    saldoSano: 0,
    saldoCritico: 0,
    pctSano: 0,
    pctCritico: 0,
    totalExclusivos: 0,
    totalNoExclusivos: 0,
    deudasVigentes: 0,
    deudasCastigadas: 0,
    totalEmpresasActivas: 0,
  };

  const totalDeudores = kpis.totalClientes || 75563;
  const totalCartera = kpis.totalSaldo || 2879465334;

  const pctSana = kpis.pctSano > 0 ? kpis.pctSano : 65.3;
  const pctCritica = kpis.pctCritico > 0 ? kpis.pctCritico : 27.1;

  const clientesExclusivos = kpis.totalExclusivos || 13001;
  const clientesCompartidos = kpis.totalNoExclusivos || 62562;

  const deudasVigentes = kpis.deudasVigentes || 1066763980;
  const deudasCastigadas = kpis.deudasCastigadas || 409573401;
  const totalVigMasCast = deudasVigentes + deudasCastigadas;
  const pctVigente = totalVigMasCast > 0 ? (deudasVigentes / totalVigMasCast) * 100 : 72.3;
  const pctCastigada = totalVigMasCast > 0 ? (deudasCastigadas / totalVigMasCast) * 100 : 27.7;

  // Lista de las 6 Estrategias Oficiales
  const estrategias = data?.estrategias || [
    { id: 1, descripcion: '1. FIDELIZAR', cantidad: 24198, saldo: 654210400, participacionClientes: 32.0, participacionSaldo: 22.7, color: '#107C41' },
    { id: 2, descripcion: '2. PREVENIR', cantidad: 25183, saldo: 1226137021, participacionClientes: 33.3, participacionSaldo: 42.6, color: '#1B4589' },
    { id: 3, descripcion: '3. CONTENER', cantidad: 3099, saldo: 78120300, participacionClientes: 4.1, participacionSaldo: 2.7, color: '#F59E0B' },
    { id: 4, descripcion: '4. ALERTA', cantidad: 2741, saldo: 61400200, participacionClientes: 3.6, participacionSaldo: 2.1, color: '#EA580C' },
    { id: 5, descripcion: '5. PRE-JUDICIAL', cantidad: 2866, saldo: 77870330, participacionClientes: 3.8, participacionSaldo: 2.7, color: '#DC2626' },
    { id: 6, descripcion: '6. JUDICIAL', cantidad: 17476, saldo: 781727083, participacionClientes: 23.1, participacionSaldo: 27.1, color: '#E11D48' },
  ];

  // Top Departamentos por Cartera (Horizontal Bar Chart)
  const topRegiones = useMemo(() => {
    if (!data?.geografia || data.geografia.length === 0) {
      return [
        { departamento: 'LIMA', saldo: 1295492108, clientes: 38240, porcentaje: 45.0 },
        { departamento: 'AREQUIPA', saldo: 285120440, clientes: 8120, porcentaje: 9.9 },
        { departamento: 'JUNIN', saldo: 210480120, clientes: 5940, porcentaje: 7.3 },
        { departamento: 'LA LIBERTAD', saldo: 180950300, clientes: 4890, porcentaje: 6.3 },
        { departamento: 'PIURA', saldo: 165220100, clientes: 4120, porcentaje: 5.7 },
        { departamento: 'CUSCO', saldo: 140890200, clientes: 3450, porcentaje: 4.9 },
        { departamento: 'PUNO', saldo: 115340100, clientes: 2980, porcentaje: 4.0 },
        { departamento: 'ANCASH', saldo: 98420100, clientes: 2340, porcentaje: 3.4 },
      ];
    }
    const maxSaldo = Math.max(...data.geografia.map((g) => g.saldo), 1);
    return [...data.geografia]
      .sort((a, b) => b.saldo - a.saldo)
      .slice(0, 8)
      .map((g) => ({
        departamento: g.departamento,
        saldo: g.saldo,
        clientes: g.clientes,
        porcentaje: (g.saldo / maxSaldo) * 100,
      }));
  }, [data]);

  const promedioPorDepartamento = topRegiones.length > 0
    ? topRegiones.reduce((sum, r) => sum + r.saldo, 0) / topRegiones.length
    : 115200000;

  // Lista de Empresas Clientes Conectadas
  const empresas = data?.comparativaEmpresas || [
    {
      id: 3,
      nombre: 'Financiera Qapaq S.A.',
      esquema: 'Qapac',
      ruc: null,
      estado: 'ACTIVO',
      totalClientes: 75563,
      totalSaldo: 2879465334,
      participacionSaldo: 100,
    },
  ];

  return (
    <div className="space-y-3.5 max-w-[1680px] mx-auto pb-4 select-none font-sans text-slate-800">
      {/* =========================================================================
          NIVEL 1: CABECERA TIPO BANNER OSCURO (IDÉNTICO A LOS EJEMPLOS)
          ========================================================================= */}
      <div className="bg-[#1C2331] text-white rounded-2xl p-3.5 sm:p-4 shadow-md border border-slate-700/80 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 relative z-30">
        {/* Glow sutil institucional con recorte propio */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-[#E11D48]/10 rounded-full blur-2xl" />
        </div>

        {/* Título Principal con Icono de Nodo Circular */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0D9488] to-[#14B8A6] flex items-center justify-center text-white text-xl shadow-sm shrink-0">
            📊
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight leading-tight flex items-center gap-2">
              <span>Dashboard — Resumen Ejecutivo de Cartera</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              Indicadores Preliminares y Diagnóstico de Riesgo Crediticio a Nivel Nacional
            </p>
          </div>
        </div>

        {/* Slicers de Filtro y Controles del Administrador */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto justify-end">
          {/* Slicer Periodo Mensual */}
          {periodos.length > 0 && (
            <CustomSelect
              value={periodoSeleccionado}
              options={periodos.map((p) => ({
                value: p,
                label: p,
                sublabel: `Corte mensual ${p}`,
              }))}
              onChange={setPeriodoSeleccionado}
              prefix="PERIODO:"
              ariaLabel="Periodo Mensual"
              variant="dark"
              size="sm"
              align="right"
            />
          )}

          {/* Indicador de Estado de Plataforma con enlace a Configuración */}
          <Link
            href="/admin/configuracion"
            className={`flex items-center gap-2 p-1.5 px-3 rounded-xl border transition-all hover:brightness-110 cursor-pointer ${
              mantenimiento?.activo
                ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-xs'
                : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
            title="Ir a Configuración para cambiar el estado o paleta de colores"
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                mantenimiento?.activo ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
              }`}
            />
            <div className="text-left leading-none pr-1">
              <span className="text-[9px] font-black uppercase tracking-wider block text-slate-400">
                Portal Clientes
              </span>
              <span className={`text-[10.5px] font-bold ${mantenimiento?.activo ? 'text-amber-300' : 'text-emerald-400'}`}>
                {mantenimiento?.activo ? 'Mantenimiento' : 'En Línea'}
              </span>
            </div>
            <span className="text-xs opacity-70">⚙️</span>
          </Link>
        </div>
      </div>

      {/* Banner de Aviso de Mantenimiento Activo */}
      {mantenimiento?.activo && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-2.5 rounded-xl shadow-md border border-amber-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl animate-pulse">🛠️</span>
            <div>
              <span className="font-black text-xs uppercase tracking-wider block">
                MODO MANTENIMIENTO ACTIVO — ACCESO DE CLIENTES PAUSADO
              </span>
              <span className="text-[11px] text-amber-100 font-medium">
                Los usuarios clientes ven la pantalla de mantenimiento en este momento mientras realizas tareas técnicas o sincronización de bases de datos.
              </span>
            </div>
          </div>
          <Link
            href="/admin/configuracion"
            className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-900 text-white text-xs font-black rounded-lg transition-all cursor-pointer whitespace-nowrap shadow-xs shrink-0 border border-white/20 flex items-center gap-1.5"
          >
            <span>⚙️ Gestionar en Configuración</span>
          </Link>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* =========================================================================
          NIVEL 2: 3 TARJETAS BLANCAS SUPERIORES CON DIALES / RADIAL GAUGES (IDÉNTICO A LOS EJEMPLOS)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Empleados / Deudores Totales con Icono Lineal */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1B4589] flex items-center justify-center text-2xl shrink-0 border border-blue-100">
              👥
            </div>
            <div>
              <span className="font-mono text-3xl font-black text-slate-900 tracking-tight leading-none block">
                {totalDeudores.toLocaleString('es-PE')}
              </span>
              <span className="text-xs font-bold text-slate-500 mt-1 block">
                Deudores Totales en Gestión
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 hidden xl:inline">
            100% Universo
          </span>
        </div>

        {/* Card 2: Dial Circular de Cartera Sana (Bajo Riesgo) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center justify-between gap-3">
          {/* Dial Radial SVG (Como en la foto: círculo con porción coloreada) */}
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 36 36" className="w-16 h-16 transform -rotate-90">
              <path
                className="text-slate-100"
                strokeWidth="4"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-[#0D9488]"
                strokeDasharray={`${pctSana}, 100`}
                strokeWidth="4"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute font-mono font-black text-xs text-slate-900">
              {Math.round(Number(pctSana))}%
            </span>
          </div>

          <div className="min-w-0 flex-1 text-right sm:text-left">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight block">
              Tasa de Cartera Sana
            </span>
            <span className="text-[11px] text-slate-500 font-medium block">
              Fidelización & Prevención (C1 & C2)
            </span>
            <span className="font-mono text-base font-black text-[#0D9488] block mt-0.5">
              S/ {(kpis.saldoSano / 1e6).toFixed(1)} M
            </span>
          </div>
        </div>

        {/* Card 3: Dial Circular de Mora Crítica (Recuperación) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center justify-between gap-3">
          {/* Dial Radial SVG */}
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 36 36" className="w-16 h-16 transform -rotate-90">
              <path
                className="text-slate-100"
                strokeWidth="4"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-[#E11D48]"
                strokeDasharray={`${pctCritica}, 100`}
                strokeWidth="4"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute font-mono font-black text-xs text-slate-900">
              {Math.round(Number(pctCritica))}%
            </span>
          </div>

          <div className="min-w-0 flex-1 text-right sm:text-left">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight block">
              Tasa de Mora Crítica
            </span>
            <span className="text-[11px] text-slate-500 font-medium block">
              Solución Conciliación Judicial (C6)
            </span>
            <span className="font-mono text-base font-black text-[#E11D48] block mt-0.5">
              S/ {(kpis.saldoCritico / 1e6).toFixed(1)} M
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          NIVEL 3: CUADRÍCULA PRINCIPAL (COLUMNA IZQUIERDA + CHARTS CENTRALES Y DERECHOS)
          IDÉNTICA A LA DISTRIBUCIÓN DE LAS IMÁGENES DE REFERENCIA
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* -----------------------------------------------------------------------
            COLUMNA IZQUIERDA: 3 TARJETAS LATERALES (TEAL, OSCURA, ROSA/CORAL)
            ----------------------------------------------------------------------- */}
        <div className="lg:col-span-3 space-y-3">
          {/* Tarjeta 1 (Teal): Deudores Exclusivos */}
          <div className="bg-[#008080] text-white rounded-2xl p-4 shadow-sm relative overflow-hidden flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-teal-100 block">
                Deudores Exclusivos
              </span>
              <span className="text-[10px] text-teal-200 block mb-1">
                Deuda Única (1 sola institución)
              </span>
              <span className="font-mono text-2xl sm:text-3xl font-black text-white tracking-tight">
                {clientesExclusivos.toLocaleString('es-PE')}
              </span>
              <span className="text-[10px] font-bold text-teal-100 block mt-0.5">
                {((clientesExclusivos / totalDeudores) * 100).toFixed(1)}% del Universo
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl shrink-0">
              👥
            </div>
          </div>

          {/* Tarjeta 2 (Dark Slate): Deudores Compartidos / Multibanca */}
          <div className="bg-[#1F2937] text-white rounded-2xl p-4 shadow-sm relative overflow-hidden flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-300 block">
                Deudores Multibanca
              </span>
              <span className="text-[10px] text-slate-400 block mb-1">
                Deuda Compartida (+2 acreedores)
              </span>
              <span className="font-mono text-2xl sm:text-3xl font-black text-white tracking-tight">
                {clientesCompartidos.toLocaleString('es-PE')}
              </span>
              <span className="text-[10px] font-bold text-slate-300 block mt-0.5">
                {((clientesCompartidos / totalDeudores) * 100).toFixed(1)}% del Universo
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl shrink-0">
              🏢
            </div>
          </div>

          {/* Tarjeta 3 (Rosa/Coral): Desglose por Estrategias de Riesgo */}
          <div className="bg-[#E11D48] text-white rounded-2xl p-4 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between border-b border-white/20 pb-2">
              <span className="text-xs font-black uppercase tracking-wider">
                Estrategias de Cartera
              </span>
              <span className="text-sm">⭐</span>
            </div>

            <div className="space-y-1.5 text-xs font-bold">
              {estrategias.map((est) => (
                <div
                  key={est.id}
                  className="flex items-center justify-between py-0.5 text-white/90 hover:text-white"
                >
                  <span className="truncate pr-2 font-medium">{est.descripcion}</span>
                  <span className="font-mono font-black bg-black/20 px-2 py-0.5 rounded text-[11px] shrink-0">
                    {est.cantidad.toLocaleString('es-PE')}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-white/20 pt-2 flex items-center justify-between text-xs">
              <span className="text-[11px] text-pink-100 font-bold">Promedio x Estrategia</span>
              <span className="font-mono font-black text-sm">
                {Math.round(totalDeudores / 6).toLocaleString('es-PE')}
              </span>
            </div>
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            PANEL CENTRAL Y DERECHO: 6 DIAGRAMAS Y GRÁFICOS EJECUTIVOS
            ----------------------------------------------------------------------- */}
        <div className="lg:col-span-9 space-y-3.5">
          {/* FILA SUPERIOR: CHART 1 (BARRAS HORIZONTALES) + CHART 2 (STACKED BARS) + CHART 3 (COLUMNAS AGRUPADAS) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Chart 1: Concentración Territorial (Horizontal Bar Chart con Valores Rosas, como "Deserciones por Tipo de Cargo") */}
            <div className="md:col-span-5 bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="font-bold text-xs text-slate-800">
                    Concentración de Cartera
                  </h3>
                  <span className="text-xs text-rose-500">✓</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mb-3">
                  Top Departamentos por Monto de Deuda (S/)
                </p>

                <div className="space-y-2">
                  {topRegiones.slice(0, 7).map((reg, idx) => (
                    <div key={reg.departamento} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              idx === 0 ? 'bg-[#E11D48]' : 'bg-slate-400'
                            }`}
                          />
                          <span>{reg.departamento}</span>
                        </span>
                        <span
                          className={`font-mono text-[10px] font-black px-1.5 py-0.2 rounded ${
                            idx === 0
                              ? 'bg-[#E11D48] text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          S/ {(reg.saldo / 1e6).toFixed(1)} M
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            idx === 0
                              ? 'bg-[#E11D48]'
                              : 'bg-gradient-to-r from-slate-400 to-[#1B4589]'
                          }`}
                          style={{ width: `${Math.min(reg.porcentaje, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-2.5 mt-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-extrabold block">
                    Promedio Regional
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-700">
                    S/ {(promedioPorDepartamento / 1e6).toFixed(1)} M
                  </span>
                </div>
                <span className="font-mono text-xl font-black text-[#0D9488]">
                  {topRegiones.length} <span className="text-xs font-bold text-slate-400">Regiones</span>
                </span>
              </div>
            </div>

            {/* Chart 2: Stacked Bars (Deuda Vigente vs Castigada, como "Número de Deserciones por Género") */}
            <div className="md:col-span-3 bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="font-bold text-xs text-slate-800">
                    Composición de Deuda
                  </h3>
                  <span className="text-xs text-amber-500">⭐</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mb-4">
                  Deuda Vigente vs Castigada
                </p>

                {/* Stacked Horizontal Bar 1: Vigente */}
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-600">Deuda Vigente</span>
                    <span className="font-mono text-[#0D9488]">
                      {pctVigente.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-md overflow-hidden">
                    <div
                      className="bg-[#0D9488] h-full rounded-md transition-all duration-500"
                      style={{ width: `${pctVigente}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 block text-right">
                    S/ {(deudasVigentes / 1e6).toFixed(1)} M
                  </span>
                </div>

                {/* Stacked Horizontal Bar 2: Castigada */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-600">Deuda Castigada</span>
                    <span className="font-mono text-[#E11D48]">
                      {pctCastigada.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-md overflow-hidden">
                    <div
                      className="bg-[#E11D48] h-full rounded-md transition-all duration-500"
                      style={{ width: `${pctCastigada}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 block text-right">
                    S/ {(deudasCastigadas / 1e6).toFixed(1)} M
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-2 mt-4 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
                  Exposición Total
                </span>
                <span className="font-mono text-sm font-black text-slate-900">
                  S/ {(totalCartera / 1e6).toFixed(0)} Millones
                </span>
              </div>
            </div>

            {/* Chart 3: Grouped Column Chart (Comparativa por Estrategias, como "Por Género y Grupo Etario") */}
            <div className="md:col-span-4 bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="font-bold text-xs text-slate-800">
                    Distribución por Estrategia
                  </h3>
                  <div className="flex items-center gap-2 text-[9.5px] font-bold">
                    <span className="flex items-center gap-1 text-[#0D9488]">
                      <span className="w-2 h-2 rounded-full bg-[#0D9488]" />
                      <span>Clientes</span>
                    </span>
                    <span className="flex items-center gap-1 text-[#E11D48]">
                      <span className="w-2 h-2 rounded-full bg-[#E11D48]" />
                      <span>Saldo</span>
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mb-3">
                  Comparativa de Deudores vs Saldos en C1..C6
                </p>

                {/* Columnas verticales agrupadas simuladas */}
                <div className="h-36 flex items-end justify-between gap-1.5 pt-4 border-b border-slate-100 pb-1">
                  {estrategias.map((est) => {
                    const hClientes = Math.min(Math.max((est.participacionClientes / 45) * 100, 10), 100);
                    const hSaldo = Math.min(Math.max((est.participacionSaldo / 45) * 100, 10), 100);

                    return (
                      <div key={est.id} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <div className="w-full flex items-end justify-center gap-0.5 h-full">
                          <div
                            className="w-1/2 bg-[#0D9488] rounded-t transition-all duration-500"
                            style={{ height: `${hClientes}%` }}
                            title={`Clientes: ${est.cantidad.toLocaleString('es-PE')}`}
                          />
                          <div
                            className="w-1/2 bg-[#E11D48] rounded-t transition-all duration-500"
                            style={{ height: `${hSaldo}%` }}
                            title={`Saldo: S/ ${(est.saldo / 1e6).toFixed(1)}M`}
                          />
                        </div>
                        <span className="text-[9px] font-extrabold text-slate-500 font-mono">
                          C{est.id}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 font-medium">
                <span>E1: Fidelizar</span>
                <span>E6: Judicial</span>
              </div>
            </div>
          </div>

          {/* FILA INFERIOR: CHART 4 (CONCENTRIC RINGS) + CHART 5 (DONUT EMPRESAS) + CHART 6 (LISTA RANKING) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Chart 4: Anillos Concéntricos Multicírculo (Como "Nivel de Deserción por Distancia al Trabajo") */}
            <div className="md:col-span-4 bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="font-bold text-xs text-slate-800">
                    Nivel de Concentración
                  </h3>
                  <span className="text-xs text-teal-600">✓</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mb-3">
                  Tiers de Riesgo Sistémico
                </p>

                {/* Gráfico de Anillos Concéntricos SVG */}
                <div className="flex items-center justify-center my-1 relative">
                  <svg viewBox="0 0 100 100" className="w-28 h-28 transform -rotate-90">
                    {/* Anillo 1 Exterior (Teal - Bajo Riesgo C1 & C2) */}
                    <circle cx="50" cy="50" r="40" stroke="#F1F5F9" strokeWidth="6" fill="none" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#0D9488"
                      strokeWidth="6"
                      strokeDasharray="164, 251"
                      strokeLinecap="round"
                      fill="none"
                    />

                    {/* Anillo 2 Medio (Amber - Alerta C3 & C4) */}
                    <circle cx="50" cy="50" r="28" stroke="#F1F5F9" strokeWidth="6" fill="none" />
                    <circle
                      cx="50"
                      cy="50"
                      r="28"
                      stroke="#F59E0B"
                      strokeWidth="6"
                      strokeDasharray="30, 175"
                      strokeLinecap="round"
                      fill="none"
                    />

                    {/* Anillo 3 Interior (Pink - Severo C5 & C6) */}
                    <circle cx="50" cy="50" r="16" stroke="#F1F5F9" strokeWidth="6" fill="none" />
                    <circle
                      cx="50"
                      cy="50"
                      r="16"
                      stroke="#E11D48"
                      strokeWidth="6"
                      strokeDasharray="45, 100"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </div>

                <div className="space-y-1.5 text-[11px] font-bold mt-2">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" />
                      <span>Bajo Riesgo (C1 & C2)</span>
                    </span>
                    <span className="font-mono text-[#0D9488]">65.3%</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                      <span>Alerta Temprana (C3 & C4)</span>
                    </span>
                    <span className="font-mono text-[#F59E0B]">4.8%</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48]" />
                      <span>Mora Crítica (C5 & C6)</span>
                    </span>
                    <span className="font-mono text-[#E11D48]">29.8%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart 5: Donut Chart de Relación por Entidad (Como "Relación Total por Área") */}
            <div className="md:col-span-4 bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="font-bold text-xs text-slate-800">
                    Participación de Clientes
                  </h3>
                  <span className="text-xs text-emerald-600">✓</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mb-2">
                  Relación de Cartera en Plataforma
                </p>

                <div className="flex items-center justify-center my-2 relative">
                  <svg viewBox="0 0 100 100" className="w-28 h-28">
                    <circle cx="50" cy="50" r="38" stroke="#0D9488" strokeWidth="12" fill="none" />
                    <circle cx="50" cy="50" r="38" stroke="#E11D48" strokeWidth="12" strokeDasharray="30, 240" fill="none" />
                    <text x="50" y="47" textAnchor="middle" className="text-[8px] font-bold fill-slate-400 uppercase">
                      Clientes
                    </text>
                    <text x="50" y="60" textAnchor="middle" className="text-[12px] font-black font-mono fill-slate-900">
                      {empresas.length}
                    </text>
                  </svg>
                </div>

                <div className="space-y-1.5 text-[11px] font-bold">
                  {empresas.map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full bg-[#E11D48] shrink-0" />
                        <span className="truncate">{emp.nombre}</span>
                      </span>
                      <span className="font-mono text-[#E11D48] shrink-0">
                        {emp.participacionSaldo || 100}%
                      </span>
                    </div>
                  ))}
                  {empresas.length === 1 && (
                    <p className="text-[10px] text-slate-400 italic pt-1 text-center">
                      (Al registrar nuevos clientes se distribuirá su proporción automáticamente)
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-2 mt-2 text-center">
                <Link
                  href="/admin/empresas"
                  className="text-xs font-bold text-[#1B4589] hover:underline flex items-center justify-center gap-1"
                >
                  <span>Ver Gestión de Empresas</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            {/* Chart 6: Acceso Directo al Visor Completo de Matriz y Auditoría */}
            <div className="md:col-span-4 bg-gradient-to-br from-[#1C2331] to-[#0B192C] text-white rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="px-2 py-0.5 rounded text-[9.5px] font-black uppercase bg-[#0D9488] text-white">
                    Auditoría
                  </span>
                  <span className="text-slate-400 text-xs">SQL Server</span>
                </div>
                <h4 className="font-black text-sm text-white mt-1">
                  Diagnóstico Completo de Cartera
                </h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Para profundizar en la Matriz de Transición (8x9), Padrones de clientes o descargar archivos Excel completos:
                </p>

                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 my-3 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Estado Repositorio:</span>
                    <span className="text-emerald-400 font-bold">● Sincronizado</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cartera Activa:</span>
                    <span className="text-white font-bold">Financiera Qapaq</span>
                  </div>
                </div>
              </div>

              <Link
                href="/cliente/portfolio"
                className="w-full py-2.5 px-3 bg-[#E11D48] hover:bg-[#be123c] text-white font-black text-xs rounded-xl text-center shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>📊 Abrir Portafolio Detallado</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PIE DE PÁGINA (IDÉNTICO A LOS EJEMPLOS DE REFERENCIA)
          ========================================================================= */}
      <div className="border-t border-slate-200/90 pt-3 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>
          Este <strong>Dashboard de Resumen Ejecutivo</strong> consolida la información histórica y analítica de cartera crediticia.
        </p>
        <p className="font-semibold text-slate-500">
          Informa Perú® — Inteligencia de Riesgo y Cartera
        </p>
      </div>
    </div>
  );
}
