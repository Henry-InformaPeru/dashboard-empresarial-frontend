'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  portfolioService,
  MantenimientoResponse,
} from '@/modules/portfolio/services/portfolioService';
import {
  DEFAULT_ESTRATEGIA_COLORES,
  saveStoredEstrategiaColores,
  calcularColorTexto,
} from '@/modules/portfolio/constants/estrategiaColores';
import { empresaService, EmpresaDto } from '@/modules/empresas/services/empresaService';
import { CustomSelect } from '@/shared/components/ui/CustomSelect';

function ConfiguracionContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as 'colores' | 'mantenimiento' | null;

  // Selector de Pestaña Principal: 'colores' (Modo Dividido Lado a Lado) | 'mantenimiento'
  const [tabActiva, setTabActiva] = useState<'colores' | 'mantenimiento'>(
    tabParam === 'mantenimiento' ? 'mantenimiento' : 'colores'
  );

  // ---------------------------------------------------------------------------
  // ESTADO 1: MODO MANTENIMIENTO GLOBAL
  // ---------------------------------------------------------------------------
  const [mantenimiento, setMantenimiento] = useState<MantenimientoResponse | null>(null);
  const [cargandoMantenimiento, setCargandoMantenimiento] = useState<boolean>(true);
  const [guardandoMantenimiento, setGuardandoMantenimiento] = useState<boolean>(false);
  const [mensajeMantenimiento, setMensajeMantenimiento] = useState<string>('');
  const [notificacionMantenimiento, setNotificacionMantenimiento] = useState<string>('');

  useEffect(() => {
    portfolioService
      .getMantenimiento()
      .then((m) => {
        setMantenimiento(m);
        setMensajeMantenimiento(
          m.mensaje ||
            'Estamos actualizando la información de la cartera crediticia para brindarle datos actualizados y precisos. El servicio se restablecerá a la brevedad.'
        );
        setCargandoMantenimiento(false);
      })
      .catch((e) => {
        console.error('Error al cargar estado de mantenimiento:', e);
        setCargandoMantenimiento(false);
      });
  }, []);

  const handleToggleMantenimiento = async (nuevoEstado: boolean) => {
    setGuardandoMantenimiento(true);
    setNotificacionMantenimiento('');
    try {
      const res = await portfolioService.setMantenimiento(nuevoEstado, mensajeMantenimiento);
      setMantenimiento(res);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('mantenimiento-changed'));
        localStorage.setItem('mantenimiento_ts', Date.now().toString());
      }
      setNotificacionMantenimiento(
        nuevoEstado
          ? 'El sistema ha sido puesto en Modo Mantenimiento. Los clientes verán la pantalla de aviso.'
          : 'El acceso al portal de clientes ha sido reanudado exitosamente.'
      );
      setTimeout(() => setNotificacionMantenimiento(''), 5000);
    } catch (e) {
      console.error('Error al actualizar mantenimiento:', e);
      setNotificacionMantenimiento('Ocurrió un error al actualizar el modo mantenimiento.');
      setTimeout(() => setNotificacionMantenimiento(''), 5000);
    } finally {
      setGuardandoMantenimiento(false);
    }
  };

  const handleActualizarMensajeMantenimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mantenimiento) return;
    setGuardandoMantenimiento(true);
    try {
      const res = await portfolioService.setMantenimiento(mantenimiento.activo, mensajeMantenimiento);
      setMantenimiento(res);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('mantenimiento-changed'));
        localStorage.setItem('mantenimiento_ts', Date.now().toString());
      }
      setNotificacionMantenimiento('Mensaje de mantenimiento actualizado correctamente.');
      setTimeout(() => setNotificacionMantenimiento(''), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setGuardandoMantenimiento(false);
    }
  };

  // ---------------------------------------------------------------------------
  // ESTADO 2: PALETA DE COLORES DE ESTRATEGIAS (POR EMPRESA CLIENTE)
  // ---------------------------------------------------------------------------
  const [empresas, setEmpresas] = useState<EmpresaDto[]>([]);
  const [empresaSeleccionadaId, setEmpresaSeleccionadaId] = useState<number | null>(null);
  const [cargandoColores, setCargandoColores] = useState<boolean>(false);

  const [coloresEditables, setColoresEditables] = useState<Record<number, { color: string }>>(() => {
    const init: Record<number, { color: string }> = {};
    for (const id of [1, 2, 3, 4, 5, 6]) {
      init[id] = { color: DEFAULT_ESTRATEGIA_COLORES[id].color };
    }
    return init;
  });

  const [notificacionColores, setNotificacionColores] = useState<string>('');
  const [guardandoColores, setGuardandoColores] = useState<boolean>(false);
  const [showModalRestaurarColores, setShowModalRestaurarColores] = useState<boolean>(false);

  // 1. Cargar lista de empresas activas
  useEffect(() => {
    empresaService
      .listarEmpresas()
      .then((lista) => {
        const activas = lista.filter((e) => e.estado?.toUpperCase() === 'ACTIVO');
        setEmpresas(activas);
        if (activas.length > 0) {
          setEmpresaSeleccionadaId(activas[0].id);
        }
      })
      .catch((err) => console.error('Error al listar empresas:', err));
  }, []);

  // 2. Cargar paleta del servidor cuando cambia la empresa seleccionada
  useEffect(() => {
    if (!empresaSeleccionadaId) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) setCargandoColores(true);
    });
    portfolioService
      .getColores({ empresaId: empresaSeleccionadaId })
      .then((res) => {
        if (!active) return;
        const init: Record<number, { color: string }> = {};
        for (const id of [1, 2, 3, 4, 5, 6]) {
          init[id] = { color: res.colores?.[id]?.color || DEFAULT_ESTRATEGIA_COLORES[id].color };
        }
        setColoresEditables(init);
      })
      .catch((err) => {
        console.error('Error al cargar colores de empresa:', err);
      })
      .finally(() => {
        if (active) setCargandoColores(false);
      });
    return () => {
      active = false;
    };
  }, [empresaSeleccionadaId]);

  // Validar y cambiar color de una estrategia individual
  const handleChangeColorHex = (id: number, nuevoHex: string) => {
    let formatted = nuevoHex.trim();
    if (!formatted.startsWith('#') && formatted.length > 0) {
      formatted = '#' + formatted;
    }
    setColoresEditables((prev) => ({
      ...prev,
      [id]: { color: formatted.toUpperCase() },
    }));
  };

  const handleGuardarColores = async () => {
    if (!empresaSeleccionadaId) return;
    setGuardandoColores(true);
    try {
      await portfolioService.setColores(empresaSeleccionadaId, coloresEditables);
      saveStoredEstrategiaColores(coloresEditables);
      const emp = empresas.find((e) => e.id === empresaSeleccionadaId);
      setNotificacionColores(
        `¡Paleta guardada en el servidor para «${emp?.nombre || 'la empresa'}»! Disponible de inmediato en todos los navegadores.`
      );
      setTimeout(() => setNotificacionColores(''), 4500);
    } catch (e) {
      console.error(e);
      setNotificacionColores('Error al guardar la paleta de colores en el servidor.');
      setTimeout(() => setNotificacionColores(''), 4000);
    } finally {
      setGuardandoColores(false);
    }
  };

  const handleRestaurarColores = () => {
    setShowModalRestaurarColores(true);
  };

  const handleConfirmarRestaurarColores = async () => {
    if (!empresaSeleccionadaId) return;
    try {
      await portfolioService.setColores(empresaSeleccionadaId, null);
      const init: Record<number, { color: string }> = {};
      for (const id of [1, 2, 3, 4, 5, 6]) {
        init[id] = { color: DEFAULT_ESTRATEGIA_COLORES[id].color };
      }
      setColoresEditables(init);
      saveStoredEstrategiaColores(init);
      setShowModalRestaurarColores(false);
      const emp = empresas.find((e) => e.id === empresaSeleccionadaId);
      setNotificacionColores(
        `Paleta de «${emp?.nombre || 'la empresa'}» restaurada a los valores oficiales (Power BI).`
      );
      setTimeout(() => setNotificacionColores(''), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  // ---------------------------------------------------------------------------
  // MODELO DE SIMULACIÓN NEUTRAL (Muestra Estándar y Coherente de Cartera)
  // Datos proporcionales, limpios y 100% neutrales (no vinculados a ningún cliente en particular)
  // ---------------------------------------------------------------------------
  const estrategiasInfo = [
    {
      id: 1,
      nombre: '1. Fidelización',
      descripcion: 'Clientes con excelente score crediticio y sin ningún atraso.',
      pct: '35.0%',
      pctNumero: 35.0,
      monto: 'S/ 45.0M',
      clientes: '28,000',
    },
    {
      id: 2,
      nombre: '2. Prevención',
      descripcion: 'Clientes con comportamiento estable pero con signos leves de exposición.',
      pct: '25.0%',
      pctNumero: 25.0,
      monto: 'S/ 32.0M',
      clientes: '20,000',
    },
    {
      id: 3,
      nombre: '3. Mitigación',
      descripcion: 'Clientes con retrasos moderados o incremento en deuda multibanca.',
      pct: '10.0%',
      pctNumero: 10.0,
      monto: 'S/ 12.5M',
      clientes: '8,000',
    },
    {
      id: 4,
      nombre: '4. Blindaje',
      descripcion: 'Clientes con riesgo de sobreendeudamiento o deterioro en otras entidades.',
      pct: '8.0%',
      pctNumero: 8.0,
      monto: 'S/ 9.8M',
      clientes: '6,400',
    },
    {
      id: 5,
      nombre: '5. Cobranza Direccionada',
      descripcion: 'Clientes en mora vencida de 30 a 90 días con gestión especializada.',
      pct: '5.0%',
      pctNumero: 5.0,
      monto: 'S/ 6.2M',
      clientes: '4,000',
    },
    {
      id: 6,
      nombre: '6. Solución de Conciliación',
      descripcion: 'Mora crítica severa (>180 días) o en cobranza judicial y cartera castigada.',
      pct: '17.0%',
      pctNumero: 17.0,
      monto: 'S/ 18.5M',
      clientes: '13,600',
    },
  ];

  // Cálculo de sectores proporcionales para la Torta Circular SVG (inicio en 165.5°)
  let anguloAcumulado = 165.5;
  const sectoresTorta = estrategiasInfo.map((est) => {
    const sliceAngle = (est.pctNumero / 100) * 360;
    const startAngle = anguloAcumulado;
    const endAngle = anguloAcumulado + sliceAngle;
    anguloAcumulado = endAngle;

    const rad1 = (startAngle * Math.PI) / 180;
    const rad2 = (endAngle * Math.PI) / 180;
    const x1 = 50 + 46 * Math.cos(rad1);
    const y1 = 50 + 46 * Math.sin(rad1);
    const x2 = 50 + 46 * Math.cos(rad2);
    const y2 = 50 + 46 * Math.sin(rad2);
    const largeArc = sliceAngle > 180 ? 1 : 0;
    const path = `M 50 50 L ${x1.toFixed(3)} ${y1.toFixed(3)} A 46 46 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`;

    return {
      id: est.id,
      path,
      color: coloresEditables[est.id]?.color || DEFAULT_ESTRATEGIA_COLORES[est.id].color,
    };
  });

  const empresaActual = empresas.find((e) => e.id === empresaSeleccionadaId);

  return (
    <div className="flex-1 flex flex-col space-y-2.5 max-w-[1600px] w-full mx-auto">
      {/* =========================================================================
          CABECERA COMPACTA CON CONTROL DE ACCESO Y BOTÓN VOLVER
          ========================================================================= */}
      <div className="bg-gradient-to-r from-[#0B192C] via-[#1B4589] to-[#0B192C] text-white p-2.5 sm:p-3 rounded-xl shadow-xs border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-base shrink-0">
            ⚙️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                Panel Administrador
              </span>
              <span className="text-[11px] text-slate-300 font-bold">• Módulo de Configuración</span>
            </div>
            <h1 className="text-sm sm:text-base font-black text-white tracking-tight leading-tight mt-0.5">
              Personalización de Cartera y Plataforma
            </h1>
          </div>
        </div>

        {/* Derecha: Indicador de Mantenimiento + Volver al Dashboard */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            onClick={() => setTabActiva('mantenimiento')}
            className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
              mantenimiento?.activo
                ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
            title="Ver estado de mantenimiento"
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                mantenimiento?.activo ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
              }`}
            />
            <span className="text-[11px]">
              {mantenimiento?.activo ? 'Mantenimiento Activo' : 'Portal En Línea'}
            </span>
          </div>

          <Link
            href="/admin"
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-lg transition-all border border-white/20 flex items-center gap-1.5 shadow-2xs"
          >
            <span>←</span>
            <span className="hidden sm:inline">Volver a KPIs</span>
          </Link>
        </div>
      </div>

      {/* =========================================================================
          SELECTOR DE PESTAÑAS (SEGMENTED CONTROL MODERNO)
          ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-1 shadow-2xs flex items-center justify-between gap-2 shrink-0">
        <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setTabActiva('colores')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              tabActiva === 'colores'
                ? 'bg-[#1B4589] text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🎨</span>
            <span>Paleta de Colores (Modo Dividido)</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('mantenimiento')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              tabActiva === 'mantenimiento'
                ? 'bg-[#1B4589] text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🛠️</span>
            <span>Modo Mantenimiento del Portal</span>
            {mantenimiento?.activo && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* =========================================================================
          VISTA 1: PALETA DE COLORES EN MODO DIVIDIDO (LADO A LADO - MISMO TAMAÑO)
          Izquierda (7 cols): Edición de Colores | Derecha (5 cols): Simulador en Vivo
          ========================================================================= */}
      {tabActiva === 'colores' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch flex-1">
          {/* -------------------------------------------------------------------
              COLUMNA IZQUIERDA (7 cols): CONTROLES DE EDICIÓN HEXADECIMAL
              ------------------------------------------------------------------- */}
          <div className="lg:col-span-7 bg-white rounded-xl shadow-xs border border-slate-200/90 p-3.5 sm:p-4 flex flex-col justify-between h-full">
            {/* Cabecera del Panel de Edición */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1B4589]" />
                  <span>Estrategias Crediticias (E1 a E6)</span>
                </h2>
                <p className="text-[10.5px] text-slate-500 mt-0.5">
                  Modifica el color con el selector interactivo o escribe el código hexadecimal (#RRGGBB).
                </p>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleRestaurarColores}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 transition-all cursor-pointer"
                  title="Restaurar a los 6 colores originales de Power BI"
                >
                  🔄 Restaurar
                </button>
                <button
                  type="button"
                  onClick={handleGuardarColores}
                  disabled={guardandoColores}
                  className="px-3 py-1 bg-[#1B4589] hover:bg-[#15376d] text-white font-black text-xs rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {guardandoColores ? 'Guardando...' : '💾 Guardar Paleta'}
                </button>
              </div>
            </div>

            {notificacionColores && (
              <div className="my-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-2xs shrink-0">
                <span>✅</span>
                <span>{notificacionColores}</span>
              </div>
            )}

            {/* Barra de Selección de Empresa Cliente a Personalizar */}
            <div className="bg-slate-50/90 p-2.5 rounded-xl border border-slate-200 mt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-[#1B4589] flex items-center justify-center text-sm font-bold shrink-0">
                  🏢
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <label className="block text-[11px] font-black text-slate-800 uppercase tracking-wide">
                      Empresa Cliente a Configurar
                    </label>
                    {cargandoColores && (
                      <span className="text-[10px] text-blue-600 font-bold animate-pulse">
                        Cargando...
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Selecciona a qué empresa deseas configurar y aplicar estos colores exclusivos.
                  </p>
                </div>
              </div>

              <div className="w-full sm:w-64 shrink-0">
                <CustomSelect
                  value={String(empresaSeleccionadaId || '')}
                  onChange={(val) => setEmpresaSeleccionadaId(Number(val))}
                  options={empresas.map((emp) => ({
                    value: String(emp.id),
                    label: emp.nombre,
                    sublabel: emp.estado,
                  }))}
                  placeholder="Selecciona una empresa..."
                />
              </div>
            </div>

            {/* Grid 2 Columnas x 3 Filas perfectamente simétrico */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 mt-2.5 content-stretch">
              {estrategiasInfo.map((est) => {
                const hexActual = coloresEditables[est.id]?.color || DEFAULT_ESTRATEGIA_COLORES[est.id].color;
                const textColor = calcularColorTexto(hexActual);

                return (
                  <div
                    key={est.id}
                    className="bg-slate-50/70 border border-slate-200 rounded-xl p-2.5 sm:p-3 hover:border-slate-300 transition-all flex flex-col justify-between h-full shadow-2xs"
                  >
                    {/* Título y Chip de Muestra */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1.5 min-h-[22px]">
                        <span className="text-xs font-black text-slate-900 truncate">
                          {est.nombre}
                        </span>
                        <span
                          style={{ backgroundColor: hexActual, color: textColor }}
                          className="px-2 py-0.5 rounded font-mono font-black text-[10px] shadow-2xs transition-colors border border-black/10 shrink-0"
                        >
                          E{est.id} Demo
                        </span>
                      </div>

                      <p className="text-[10.5px] text-slate-500 font-medium leading-tight">
                        {est.descripcion}
                      </p>
                    </div>

                    {/* Fila de Controles: Selector + Input Hex + Reset */}
                    <div className="pt-2 border-t border-slate-200/80 flex items-center gap-1.5 mt-auto">
                      {/* Selector visual */}
                      <div className="relative w-8 h-8 rounded-lg border border-slate-300 overflow-hidden shadow-2xs shrink-0 cursor-pointer bg-white">
                        <input
                          type="color"
                          value={hexActual.startsWith('#') && hexActual.length === 7 ? hexActual : '#005B94'}
                          onChange={(e) => handleChangeColorHex(est.id, e.target.value)}
                          className="absolute inset-0 w-[160%] h-[160%] -top-[30%] -left-[30%] cursor-pointer border-0 p-0"
                          title="Elegir con paleta o cuentagotas"
                        />
                      </div>

                      {/* Input Hexadecimal */}
                      <div className="flex-1 min-w-0">
                        <div className="relative flex items-center">
                          <span className="absolute left-2 text-[11px] font-mono font-black text-slate-400 select-none">
                            #
                          </span>
                          <input
                            type="text"
                            maxLength={7}
                            value={hexActual.startsWith('#') ? hexActual.substring(1) : hexActual}
                            onChange={(e) => handleChangeColorHex(est.id, '#' + e.target.value)}
                            placeholder="000000"
                            className="w-full h-8 pl-5 pr-2 border border-slate-300 rounded-lg text-xs font-mono font-black text-slate-900 focus:ring-2 focus:ring-[#1B4589] focus:outline-hidden bg-white uppercase shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* Botón reset individual */}
                      <button
                        type="button"
                        onClick={() => handleChangeColorHex(est.id, DEFAULT_ESTRATEGIA_COLORES[est.id].color)}
                        className="w-8 h-8 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-400 hover:text-slate-800 transition-all flex items-center justify-center text-xs shadow-2xs cursor-pointer shrink-0"
                        title="Restablecer color oficial de esta estrategia"
                      >
                        ↺
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* -------------------------------------------------------------------
              COLUMNA DERECHA (5 cols): PREVISUALIZADOR EN VIVO (MISMO TAMAÑO)
              ------------------------------------------------------------------- */}
          <div className="lg:col-span-5 bg-white rounded-xl shadow-xs border border-slate-200/90 p-3.5 sm:p-4 flex flex-col justify-between h-full space-y-2">
            {/* Cabecera del Simulador */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Previsualización en Tiempo Real
                </h3>
              </div>

              <span
                className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-[#1B4589] border border-blue-200/80 truncate max-w-[200px]"
                title={empresaActual?.nombre || 'Muestra de Simulación'}
              >
                ● {empresaActual ? empresaActual.nombre : 'Muestra de Simulación'}
              </span>
            </div>

            {/* Bloque 1: Gráfico de Torta SVG Proporcional de Muestra */}
            <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/80 flex items-center justify-center sm:justify-start gap-4 shrink-0">
              {/* Torta Circular SVG Ampliada */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 relative shrink-0 drop-shadow-xs">
                <svg viewBox="0 0 100 100" className="w-full h-full select-none">
                  {sectoresTorta.map((sec) => (
                    <path
                      key={sec.id}
                      d={sec.path}
                      fill={sec.color}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                      className="transition-colors duration-300"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-black text-slate-800 bg-white/95 shadow-xs border border-slate-200 px-1.5 py-0.5 rounded">
                    Torta
                  </span>
                </div>
              </div>

              {/* Leyenda con Porcentajes de Muestra */}
              <div className="grid grid-cols-2 gap-x-2.5 gap-y-1.5 flex-1 text-[10px]">
                {estrategiasInfo.map((est) => {
                  const c = coloresEditables[est.id]?.color || DEFAULT_ESTRATEGIA_COLORES[est.id].color;
                  return (
                    <div key={est.id} className="flex items-center gap-1.5 truncate bg-white/70 px-1.5 py-0.5 rounded border border-slate-200/60 shadow-2xs">
                      <span
                        style={{ backgroundColor: c }}
                        className="w-3 h-3 rounded-xs shrink-0 border border-black/10 shadow-2xs"
                      />
                      <span className="text-slate-700 font-semibold truncate text-[10px]">
                        E{est.id}: <strong className="text-slate-900 font-bold">{est.pct}</strong>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bloque 2: Muestra Celdas de la Matriz (Simulación de Contraste) */}
            <div className="bg-slate-50/90 rounded-xl p-2.5 border border-slate-200/80 space-y-1.5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight block">
                  Simulador de Celdas de Matriz (8×9)
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  Muestra Cosechas
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {estrategiasInfo.map((est) => {
                  const c = coloresEditables[est.id]?.color || DEFAULT_ESTRATEGIA_COLORES[est.id].color;
                  const txt = calcularColorTexto(c);
                  return (
                    <div
                      key={est.id}
                      style={{ backgroundColor: c, color: txt }}
                      className="p-1 rounded-md font-mono font-black text-center shadow-2xs border border-black/10 transition-colors"
                    >
                      <span className="text-[10.5px] block leading-tight">{est.clientes}</span>
                      <span className="text-[8px] opacity-80 block">{est.monto}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bloque 3: Cuadro de Estrategias Oficial (Simulador Idéntico al Dashboard) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex-1 flex flex-col justify-between shrink-0">
              <div className="bg-[#005B94] px-3 py-1 flex items-center justify-between text-white shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Cuadro de Estrategias</span>
                </span>
                <span className="text-[9px] font-bold text-blue-200 font-mono">
                  Simulación Cartera
                </span>
              </div>

              <div className="overflow-x-auto flex-1 flex flex-col justify-between">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-black text-[9.5px] tracking-wide border-b border-slate-200 uppercase">
                      <th className="py-1 px-2.5">Estrategia</th>
                      <th className="py-1 px-2 text-right">Clientes</th>
                      <th className="py-1 px-2.5 text-right">% Part.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {estrategiasInfo.map((est) => {
                      const c = coloresEditables[est.id]?.color || DEFAULT_ESTRATEGIA_COLORES[est.id].color;
                      const txt = calcularColorTexto(c);
                      return (
                        <tr key={est.id} className="hover:brightness-95 transition-all">
                          <td
                            style={{ backgroundColor: c, color: txt }}
                            className="py-1 px-2.5 font-black text-[10px] uppercase truncate border-r border-white/20"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[9px] opacity-90">E{est.id}</span>
                              <span className="truncate">{est.nombre.replace(/^\d+\.\s*/, '')}</span>
                            </div>
                          </td>
                          <td className="py-1 px-2 text-right font-mono font-bold text-slate-800 bg-white text-[10px] border-r border-slate-100">
                            {est.clientes}
                          </td>
                          <td className="py-1 px-2.5 text-right font-mono font-black text-slate-900 bg-white text-[10px]">
                            {est.pct}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-slate-900 border-t border-slate-300 text-[10px]">
                      <td className="py-0.5 px-2.5 uppercase font-black text-[9.5px]">Total Muestra</td>
                      <td className="py-0.5 px-2 text-right font-mono font-black text-[10px]">80,000</td>
                      <td className="py-0.5 px-2.5 text-right font-mono font-black text-[10px]">100.0%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VISTA 2: GESTIÓN DE MODO MANTENIMIENTO DEL PORTAL (MISMA DISTANCIA AL FOOTER)
          ========================================================================= */}
      {tabActiva === 'mantenimiento' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 overflow-hidden flex-1 flex flex-col justify-between">
          <div>
            {/* Cabecera del panel de mantenimiento */}
            <div className="p-4 sm:p-4.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base">🛠️</span>
                  <h2 className="text-sm sm:text-base font-black text-[#1B4589] tracking-tight">
                    Control de Disponibilidad del Portal de Clientes
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pausa o reanuda el acceso a los dashboards para clientes mientras realizas labores técnicas o sincronización de bases de datos.
                </p>
              </div>

              {/* Badge de estado actual */}
              <div className="shrink-0">
                {cargandoMantenimiento ? (
                  <span className="text-xs text-slate-400 font-bold">Consultando estado...</span>
                ) : mantenimiento?.activo ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                    MANTENIMIENTO ACTIVO
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    PLATAFORMA EN LÍNEA
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {notificacionMantenimiento && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[#1B4589] text-xs font-bold flex items-center gap-2 animate-fade-in shadow-2xs">
                  <span>ℹ️</span>
                  <span>{notificacionMantenimiento}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* Columna Izquierda: Botón de acción e interruptor */}
                <div className="lg:col-span-5 bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200/80 flex flex-col justify-between h-full space-y-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                      Acción Inmediata
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Al activar el modo mantenimiento, todos los usuarios con rol <strong>Cliente</strong> verán una pantalla elegante informando sobre las labores de actualización. Tu sesión como Administrador seguirá activa para validar los datos.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2 mt-auto">
                    {mantenimiento?.activo ? (
                      <button
                        type="button"
                        onClick={() => handleToggleMantenimiento(false)}
                        disabled={guardandoMantenimiento}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        <span>🟢</span>
                        <span>{guardandoMantenimiento ? 'Procesando...' : 'Reanudar Acceso al Portal (Abrir a Clientes)'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleMantenimiento(true)}
                        disabled={guardandoMantenimiento}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        <span>🛠️</span>
                        <span>{guardandoMantenimiento ? 'Procesando...' : 'Poner Plataforma en Mantenimiento'}</span>
                      </button>
                    )}

                    {mantenimiento?.fechaActualizacion && (
                      <div className="text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-200">
                        <span>🕒 Última modificación: </span>
                        <strong className="text-slate-600">
                          {new Date(mantenimiento.fechaActualizacion).toLocaleString('es-PE')}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Columna Derecha: Mensaje de aviso editable */}
                <div className="lg:col-span-7 bg-slate-50/50 rounded-xl p-4 sm:p-5 border border-slate-200/80 flex flex-col justify-between h-full">
                  <form onSubmit={handleActualizarMensajeMantenimiento} className="flex flex-col justify-between h-full space-y-3">
                    <div className="space-y-2 flex-1 flex flex-col">
                      <label className="block text-xs font-black text-slate-800 uppercase tracking-tight">
                        Mensaje personalizado para la pantalla de mantenimiento
                      </label>
                      <textarea
                        rows={5}
                        value={mensajeMantenimiento}
                        onChange={(e) => setMensajeMantenimiento(e.target.value)}
                        placeholder="Escribe el mensaje que leerán los usuarios clientes..."
                        className="w-full flex-1 min-h-[120px] px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-[#1B4589] focus:outline-hidden bg-white font-medium resize-none shadow-2xs leading-relaxed"
                      />
                      <span className="text-[10.5px] text-slate-400 font-medium">
                        Este texto se presenta de forma destacada en la ventana de espera de los clientes cuando intenten ingresar al portal.
                      </span>
                    </div>

                    <div className="flex justify-end pt-2 mt-auto">
                      <button
                        type="submit"
                        disabled={guardandoMantenimiento}
                        className="px-4 py-2 bg-[#1B4589] hover:bg-[#15376d] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        {guardandoMantenimiento ? 'Guardando...' : '💾 Guardar Mensaje de Aviso'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Barra inferior informativa para mantener altura equilibrada */}
          <div className="px-4 sm:px-5 py-2.5 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2 shrink-0">
            <span className="flex items-center gap-1.5 font-medium">
              <span>🛡️</span>
              <span>El modo mantenimiento solo pausa el acceso a usuarios con rol Cliente. El panel administrativo permanece siempre en línea.</span>
            </span>
            <span className="font-mono text-[10px] text-slate-400 font-bold shrink-0">
              SISTEMA ACTIVO
            </span>
          </div>
        </div>
      )}

      {/* Modal / Popup de Confirmación: Restaurar Paleta Oficial */}
      {showModalRestaurarColores && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-[#1B4589] flex items-center gap-2">
                <span className="text-base">🔄</span>
                <span>Restaurar Paleta Oficial</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModalRestaurarColores(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-slate-800 leading-relaxed">
              ¿Deseas restaurar la paleta de colores predeterminada oficial (Power BI) para{' '}
              <strong className="text-[#1B4589]">
                {empresaActual?.nombre || 'la empresa seleccionada'}
              </strong>?
            </p>
            <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
              Esta acción restablecerá los 6 colores estándar de las estrategias (E1 a E6) para esta empresa en el servidor.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModalRestaurarColores(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarRestaurarColores}
                className="px-4 py-2 bg-[#1B4589] hover:bg-[#143468] text-white font-bold text-xs rounded-lg transition-all shadow-sm cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConfiguracionAdminPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400 font-bold text-xs">Cargando configuración...</div>}>
      <ConfiguracionContent />
    </Suspense>
  );
}
