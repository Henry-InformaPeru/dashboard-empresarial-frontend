'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  portfolioService,
  EstrategiasCuadroResponse,
  GeografiaResponse,
} from '../services/portfolioService';
import { CustomSelect } from './CustomSelect';
import { useEstrategiaColores } from '../constants/estrategiaColores';

interface KpisEmpresaViewProps {
  periodo: string;
  periodos: string[];
  onPeriodoChange: (periodo: string) => void;
  entidad: string;
  onIrAModulo?: (modulo: 'matriz' | 'detalle' | 'mapa') => void;
}

export function KpisEmpresaView({
  periodo,
  periodos,
  onPeriodoChange,
  entidad,
  onIrAModulo,
}: KpisEmpresaViewProps) {
  const [estrategiasData, setEstrategiasData] = useState<EstrategiasCuadroResponse | null>(null);
  const [geografiaData, setGeografiaData] = useState<GeografiaResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const { getColor: getEstrategiaColor } = useEstrategiaColores(
    entidad ? { entidad } : undefined
  );

  useEffect(() => {
    if (!periodo) return;
    let active = true;

    const cargarKpis = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {
          periodo,
          entidad: entidad || undefined,
        };
        const [estRes, geoRes] = await Promise.all([
          portfolioService.getEstrategias(params),
          portfolioService.getGeografia(params),
        ]);
        if (!active) return;
        setEstrategiasData(estRes);
        setGeografiaData(geoRes);
      } catch (err) {
        if (!active) return;
        console.error('Error al cargar KPIs de la empresa:', err);
        setError('No se pudieron cargar los indicadores de cartera para esta empresa.');
      } finally {
        if (active) setLoading(false);
      }
    };

    cargarKpis();
    return () => {
      active = false;
    };
  }, [periodo, entidad]);

  const estrategias = useMemo(() => estrategiasData?.items || [], [estrategiasData]);

  const totalDeudores =
    estrategiasData?.totales?.cantidad ?? geografiaData?.totales?.clientes ?? 0;
  const totalCartera =
    estrategiasData?.totales?.saldo ?? geografiaData?.totales?.saldo ?? 0;

  const saldoSano = useMemo(
    () =>
      estrategias
        .filter((e) => e.id === 1 || e.id === 2)
        .reduce((acc, e) => acc + e.saldo, 0),
    [estrategias]
  );

  const saldoAlerta = useMemo(
    () =>
      estrategias
        .filter((e) => e.id === 3 || e.id === 4)
        .reduce((acc, e) => acc + e.saldo, 0),
    [estrategias]
  );

  const saldoCritico = useMemo(
    () =>
      estrategias
        .filter((e) => e.id === 6)
        .reduce((acc, e) => acc + e.saldo, 0),
    [estrategias]
  );

  const saldoSevero = useMemo(
    () =>
      estrategias
        .filter((e) => e.id === 5 || e.id === 6)
        .reduce((acc, e) => acc + e.saldo, 0),
    [estrategias]
  );

  const pctSana = totalCartera > 0 ? (saldoSano / totalCartera) * 100 : 0;
  const pctCritica = totalCartera > 0 ? (saldoCritico / totalCartera) * 100 : 0;

  const pctTierBajo = totalCartera > 0 ? Math.round((saldoSano / totalCartera) * 100) : 0;
  const pctTierAlerta = totalCartera > 0 ? Math.round((saldoAlerta / totalCartera) * 100) : 0;
  const pctTierCritico = totalCartera > 0 ? Math.round((saldoSevero / totalCartera) * 100) : 0;

  const clientesExclusivos = geografiaData?.totales?.exclusivo ?? 0;
  const clientesCompartidos = Math.max(0, totalDeudores - clientesExclusivos);
  const pctExclusivos =
    totalDeudores > 0 ? ((clientesExclusivos / totalDeudores) * 100).toFixed(1) : '0.0';
  const pctCompartidos =
    totalDeudores > 0 ? ((clientesCompartidos / totalDeudores) * 100).toFixed(1) : '0.0';

  const deudasVigentes = geografiaData?.totales?.deudasVigentes ?? 0;
  const deudasCastigadas = geografiaData?.totales?.deudasCastigadas ?? 0;
  const totalVigMasCast = deudasVigentes + deudasCastigadas;
  const pctVigente = totalVigMasCast > 0 ? (deudasVigentes / totalVigMasCast) * 100 : 0;
  const pctCastigada = totalVigMasCast > 0 ? (deudasCastigadas / totalVigMasCast) * 100 : 0;

  const topRegiones = useMemo(() => {
    const items = geografiaData?.items || [];
    const maxSaldo = Math.max(...items.map((g) => g.saldo), 1);
    return items
      .slice()
      .sort((a, b) => b.saldo - a.saldo)
      .slice(0, 7)
      .map((g) => ({
        departamento: g.departamento,
        saldo: g.saldo,
        clientes: g.clientes,
        porcentaje: Math.round((g.saldo / maxSaldo) * 100),
      }));
  }, [geografiaData]);

  const totalRegiones = geografiaData?.items?.length ?? 0;
  const promedioPorDepartamento =
    totalRegiones > 0
      ? (geografiaData?.items || []).reduce((acc, g) => acc + g.saldo, 0) / totalRegiones
      : 0;

  const maxPctEstrategia = useMemo(() => {
    const maxVal = Math.max(
      ...estrategias.flatMap((e) => [e.participacionClientes, e.participacionSaldo]),
      10
    );
    return maxVal;
  }, [estrategias]);

  return (
    <div className="space-y-4">
      {/* Barra superior del módulo de KPIs */}
      <section className="bg-white border border-slate-200/90 rounded-xl px-4 py-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1B4589] shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight truncate">
              Resumen Ejecutivo de KPIs
            </h1>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              Indicadores clave de cartera para{' '}
              <strong className="text-[#1B4589]">{entidad || 'tu empresa'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {periodos.length > 0 && (
            <CustomSelect
              value={periodo}
              options={periodos.map((p) => ({
                value: p,
                label: p,
                sublabel: `Corte mensual ${p}`,
              }))}
              onChange={onPeriodoChange}
              prefix="PERIODO:"
              ariaLabel="Periodo de KPIs"
              align="right"
              size="sm"
            />
          )}
        </div>
      </section>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 py-16 flex flex-col items-center justify-center shadow-xs">
          <div className="w-8 h-8 border-3 border-slate-200 border-t-[#005B94] rounded-full animate-spin mb-2" />
          <p className="text-xs font-bold text-slate-700">Cargando datos...</p>
        </div>
      ) : (
        <>
          {/* NIVEL 1: 3 TARJETAS SUPERIORES DE KPI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Card 1: Total Deudores */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1B4589] flex items-center justify-center text-2xl shrink-0 border border-blue-100">
                  👥
                </div>
                <div>
                  <span className="font-mono text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none block">
                    {totalDeudores.toLocaleString('es-PE')}
                  </span>
                  <span className="text-xs font-bold text-slate-500 mt-1 block">
                    Deudores Totales en Gestión
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                    Corte {periodo} · Estrategias E1–E6
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 hidden xl:inline">
                100% Cartera
              </span>
            </div>

            {/* Card 2: Tasa de Cartera Sana */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center justify-between gap-3">
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
                    strokeDasharray={`${pctSana.toFixed(1)}, 100`}
                    strokeWidth="4"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute font-mono font-black text-xs text-slate-900">
                  {Math.round(pctSana)}%
                </span>
              </div>

              <div className="min-w-0 flex-1 text-right sm:text-left">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight block">
                  Tasa de Cartera Sana
                </span>
                <span className="text-[11px] text-slate-500 font-medium block">
                  Fidelización &amp; Prevención (E1 &amp; E2)
                </span>
                <span className="font-mono text-base font-black text-[#0D9488] block mt-0.5">
                  S/ {(saldoSano / 1e6).toFixed(2)} M
                </span>
              </div>
            </div>

            {/* Card 3: Tasa de Mora Crítica */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-center justify-between gap-3">
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
                    strokeDasharray={`${pctCritica.toFixed(1)}, 100`}
                    strokeWidth="4"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute font-mono font-black text-xs text-slate-900">
                  {Math.round(pctCritica)}%
                </span>
              </div>

              <div className="min-w-0 flex-1 text-right sm:text-left">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight block">
                  Tasa de Mora Crítica
                </span>
                <span className="text-[11px] text-slate-500 font-medium block">
                  Solución de Conciliación (E6)
                </span>
                <span className="font-mono text-base font-black text-[#E11D48] block mt-0.5">
                  S/ {(saldoCritico / 1e6).toFixed(2)} M
                </span>
              </div>
            </div>
          </div>

          {/* NIVEL 2: CUADRÍCULA PRINCIPAL */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
            {/* COLUMNA IZQUIERDA */}
            <div className="lg:col-span-3 space-y-3">
              {/* Deudores Exclusivos */}
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
                    {pctExclusivos}% de la cartera
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl shrink-0">
                  👥
                </div>
              </div>

              {/* Deudores Multibanca */}
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
                    {pctCompartidos}% de la cartera
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl shrink-0">
                  🏢
                </div>
              </div>

              {/* Desglose por Estrategias */}
              <div className="bg-[#E11D48] text-white rounded-2xl p-4 shadow-sm space-y-2.5">
                <div className="border-b border-white/20 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider">
                      Estrategias de Cartera
                    </span>
                    <span className="text-sm">⭐</span>
                  </div>
                  <span className="text-[9.5px] text-pink-100/90 font-medium block mt-0.5">
                    Clientes por estrategia (E1–E6)
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-bold">
                  {estrategias.map((est) => (
                    <div
                      key={est.id}
                      className="flex items-center justify-between py-0.5 text-white/95"
                    >
                      <span className="truncate pr-2 font-medium">{est.descripcion}</span>
                      <span className="font-mono font-black bg-black/20 px-2 py-0.5 rounded text-[11px] shrink-0">
                        {est.cantidad.toLocaleString('es-PE')}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/20 pt-2 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-pink-100 font-bold">
                    Promedio x Estrategia
                  </span>
                  <span className="font-mono font-black text-sm">
                    {estrategias.length > 0
                      ? Math.round(totalDeudores / estrategias.length).toLocaleString('es-PE')
                      : '0'}
                  </span>
                </div>
              </div>
            </div>

            {/* PANEL CENTRAL Y DERECHO */}
            <div className="lg:col-span-9 space-y-3.5">
              {/* FILA SUPERIOR */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                {/* Concentración Territorial */}
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
                      {topRegiones.length > 0 ? (
                        topRegiones.map((reg, idx) => (
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
                                S/ {(reg.saldo / 1e6).toFixed(2)} M
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
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 py-4 text-center">
                          Sin datos geográficos para este periodo.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-2.5 mt-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-extrabold block">
                        Promedio Regional
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-700">
                        S/ {(promedioPorDepartamento / 1e6).toFixed(2)} M
                      </span>
                    </div>
                    <span className="font-mono text-xl font-black text-[#0D9488]">
                      {totalRegiones}{' '}
                      <span className="text-xs font-bold text-slate-400">Regiones</span>
                    </span>
                  </div>
                </div>

                {/* Composición de Deuda */}
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
                        S/ {(deudasVigentes / 1e6).toFixed(2)} M
                      </span>
                    </div>

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
                        S/ {(deudasCastigadas / 1e6).toFixed(2)} M
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-2 mt-4 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight block">
                      Exposición Total
                    </span>
                    <span className="font-mono text-sm font-black text-slate-900 block">
                      S/ {totalCartera.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[9.5px] text-slate-400 font-medium">
                      S/ {(totalCartera / 1e6).toFixed(2)} Millones
                    </span>
                  </div>
                </div>

                {/* Distribución por Estrategia */}
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
                      Comparativa de Deudores vs Saldos en E1..E6
                    </p>

                    <div className="h-36 flex items-end justify-between gap-1.5 pt-4 border-b border-slate-100 pb-1">
                      {estrategias.map((est) => {
                        const hClientes = Math.min(
                          Math.max((est.participacionClientes / maxPctEstrategia) * 100, 8),
                          100
                        );
                        const hSaldo = Math.min(
                          Math.max((est.participacionSaldo / maxPctEstrategia) * 100, 8),
                          100
                        );

                        return (
                          <div
                            key={est.id}
                            className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
                          >
                            <div className="w-full flex items-end justify-center gap-0.5 h-full">
                              <div
                                className="w-1/2 bg-[#0D9488] rounded-t transition-all duration-500"
                                style={{ height: `${hClientes}%` }}
                                title={`Clientes: ${est.cantidad.toLocaleString('es-PE')} (${est.participacionClientes.toFixed(1)}%)`}
                              />
                              <div
                                className="w-1/2 bg-[#E11D48] rounded-t transition-all duration-500"
                                style={{ height: `${hSaldo}%` }}
                                title={`Saldo: S/ ${(est.saldo / 1e6).toFixed(2)}M (${est.participacionSaldo.toFixed(1)}%)`}
                              />
                            </div>
                            <span className="text-[9px] font-extrabold text-slate-500 font-mono">
                              E{est.id}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 font-medium">
                    <span>E1: Fidelización</span>
                    <span>E6: Conciliación</span>
                  </div>
                </div>
              </div>

              {/* FILA INFERIOR */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                {/* Nivel de Concentración (Anillos Concéntricos) */}
                <div className="md:col-span-5 bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="font-bold text-xs text-slate-800">
                        Nivel de Concentración
                      </h3>
                      <span className="text-xs text-teal-600">✓</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mb-3">
                      Tiers por Saldo: E1–E2, E3–E4 y E5–E6
                    </p>

                    <div className="flex items-center justify-center my-1 relative">
                      <svg viewBox="0 0 100 100" className="w-28 h-28 transform -rotate-90">
                        <circle cx="50" cy="50" r="40" stroke="#F1F5F9" strokeWidth="6" fill="none" />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#0D9488"
                          strokeWidth="6"
                          strokeDasharray={`${((Math.min(100, pctTierBajo) / 100) * 251.3).toFixed(1)}, 251.3`}
                          strokeLinecap="round"
                          fill="none"
                        />

                        <circle cx="50" cy="50" r="28" stroke="#F1F5F9" strokeWidth="6" fill="none" />
                        <circle
                          cx="50"
                          cy="50"
                          r="28"
                          stroke="#F59E0B"
                          strokeWidth="6"
                          strokeDasharray={`${((Math.min(100, Math.max(pctTierAlerta, 2)) / 100) * 175.9).toFixed(1)}, 175.9`}
                          strokeLinecap="round"
                          fill="none"
                        />

                        <circle cx="50" cy="50" r="16" stroke="#F1F5F9" strokeWidth="6" fill="none" />
                        <circle
                          cx="50"
                          cy="50"
                          r="16"
                          stroke="#E11D48"
                          strokeWidth="6"
                          strokeDasharray={`${((Math.min(100, pctTierCritico) / 100) * 100.5).toFixed(1)}, 100.5`}
                          strokeLinecap="round"
                          fill="none"
                        />
                      </svg>
                    </div>

                    <div className="space-y-1.5 text-[11px] font-bold mt-2">
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#0D9488]" />
                          <span>Bajo Riesgo (E1 &amp; E2)</span>
                        </span>
                        <span className="font-mono text-[#0D9488]">{pctTierBajo}%</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                          <span>Alerta Temprana (E3 &amp; E4)</span>
                        </span>
                        <span className="font-mono text-[#F59E0B]">{pctTierAlerta}%</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48]" />
                          <span>Mora Crítica (E5 &amp; E6)</span>
                        </span>
                        <span className="font-mono text-[#E11D48]">{pctTierCritico}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detalle por Estrategia + Accesos Directos */}
                <div className="md:col-span-7 bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="font-bold text-xs text-slate-800">
                        Participación de Saldo por Estrategia
                      </h3>
                      <span className="text-[10px] font-bold text-slate-400">
                        Corte {periodo}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mb-3">
                      Distribución de clientes y exposición monetaria de la empresa
                    </p>

                    <div className="space-y-2">
                      {estrategias.map((est) => {
                        const cfg = getEstrategiaColor(est.id);
                        return (
                          <div key={est.id} className="space-y-0.5">
                            <div className="flex items-center justify-between text-[11px] gap-2">
                              <span className="font-bold text-slate-700 flex items-center gap-1.5 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                                  style={{ backgroundColor: cfg.color }}
                                />
                                <span className="truncate">{est.descripcion}</span>
                              </span>
                              <div className="flex items-center gap-2.5 shrink-0 font-mono text-[10.5px]">
                                <span className="text-slate-500">
                                  {est.cantidad.toLocaleString('es-PE')} cli.
                                </span>
                                <span className="font-black text-slate-900">
                                  S/ {(est.saldo / 1e6).toFixed(2)}M
                                </span>
                                <span className="font-bold text-[#1B4589] w-12 text-right">
                                  {est.participacionSaldo.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(est.participacionSaldo, 100)}%`,
                                  backgroundColor: cfg.color,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {onIrAModulo && (
                    <div className="border-t border-slate-100 pt-3 mt-4 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                        Explorar detalle:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onIrAModulo('matriz')}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1B4589] text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Diagnóstico (Matriz) →
                        </button>
                        <button
                          type="button"
                          onClick={() => onIrAModulo('detalle')}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Padrón de Clientes →
                        </button>
                        <button
                          type="button"
                          onClick={() => onIrAModulo('mapa')}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Mapa Geográfico →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
