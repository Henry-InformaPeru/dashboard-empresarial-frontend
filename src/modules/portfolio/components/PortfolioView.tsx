'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  portfolioService,
  MatrizResponse,
  MatrizCelda,
  EstrategiasCuadroResponse,
  MantenimientoResponse,
} from '../services/portfolioService';
import { MatrizTransicion } from './MatrizTransicion';
import { CuadroEstrategias } from './CuadroEstrategias';
import { PadronClientes } from './PadronClientes';
import { MapaPeru } from './MapaPeru';
import { KpisEmpresaView } from './KpisEmpresaView';
import { CustomSelect } from './CustomSelect';
import { useEstrategiaColores } from '../constants/estrategiaColores';
import { empresaService, EmpresaDto } from '@/modules/empresas/services/empresaService';

export function PortfolioView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduloQuery = searchParams.get('modulo') as 'kpis' | 'matriz' | 'detalle' | 'mapa' | null;
  const entidadQuery = searchParams.get('entidad');

  // Slicers / Filtros Globales
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>('');
  const [entidades, setEntidades] = useState<string[]>([]);
  const [entidadSeleccionada, setEntidadSeleccionada] = useState<string>('');
  const [tipoCliente, setTipoCliente] = useState<string>('Todas');
  const [empresas, setEmpresas] = useState<EmpresaDto[]>([]);

  const { getColor: getEstrategiaColor } = useEstrategiaColores(
    entidadSeleccionada ? { entidad: entidadSeleccionada } : undefined
  );

  const empresaActual = empresas.find(
    (emp) =>
      emp.nombre.toLowerCase().trim() === entidadSeleccionada.toLowerCase().trim() ||
      entidadSeleccionada.toLowerCase().includes(emp.nombre.toLowerCase().trim()) ||
      emp.nombre.toLowerCase().includes(entidadSeleccionada.toLowerCase().trim())
  );
  const logoEmpresa = empresaActual?.logo || null;

  useEffect(() => {
    if (typeof window !== 'undefined' && empresas.length > 0) {
      window.dispatchEvent(
        new CustomEvent('portfolio-logo-changed', { detail: logoEmpresa })
      );
    }
  }, [logoEmpresa, empresas.length]);

  // Navegación de Vistas / Pestañas principales (reactivo a la barra lateral / URL)
  const [pestanaActiva, setPestanaActiva] = useState<'kpis' | 'matriz' | 'detalle' | 'mapa'>(
    moduloQuery === 'matriz' || moduloQuery === 'detalle' || moduloQuery === 'mapa'
      ? moduloQuery
      : 'kpis'
  );

  useEffect(() => {
    if (
      moduloQuery === 'kpis' ||
      moduloQuery === 'matriz' ||
      moduloQuery === 'detalle' ||
      moduloQuery === 'mapa'
    ) {
      let active = true;
      Promise.resolve().then(() => {
        if (active) setPestanaActiva(moduloQuery);
      });
      return () => {
        active = false;
      };
    }
  }, [moduloQuery]);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (
        customEvent.detail &&
        (customEvent.detail === 'kpis' ||
          customEvent.detail === 'matriz' ||
          customEvent.detail === 'detalle' ||
          customEvent.detail === 'mapa')
      ) {
        setPestanaActiva(customEvent.detail);
      }
    };
    window.addEventListener('portfolio-cambiar-modulo', handler);
    return () => window.removeEventListener('portfolio-cambiar-modulo', handler);
  }, []);

  const handleIrAModulo = useCallback(
    (modulo: 'kpis' | 'matriz' | 'detalle' | 'mapa') => {
      setPestanaActiva(modulo);
      router.push(`/cliente/portfolio?modulo=${modulo}`, { scroll: false });
    },
    [router]
  );

  // Modo de visualización en la Matriz y Cuadro: Conteo de Clientes vs Saldos en Soles
  const [modo, setModo] = useState<'clientes' | 'saldos'>('clientes');

  // Control de Modo Mantenimiento
  const [isAdmin] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return false;
      const u = JSON.parse(userStr);
      return u?.rolId === 1;
    } catch {
      return false;
    }
  });
  const [mantenimiento, setMantenimiento] = useState<MantenimientoResponse | null>(null);
  const [mantenimientoCargando, setMantenimientoCargando] = useState<boolean>(true);
  const [actualizandoMantenimiento, setActualizandoMantenimiento] = useState<boolean>(false);
  const [comprobandoDisponibilidad, setComprobandoDisponibilidad] = useState<boolean>(false);
  const [mensajeComprobacion, setMensajeComprobacion] = useState<string>('');

  // Filtro dinámico de cuadrante por Estrategia (1 a 6) o null para ver todas
  const [estrategiaSeleccionada, setEstrategiaSeleccionada] = useState<number | null>(null);
  // Celda seleccionada específicamente en la matriz
  const [celdaSeleccionada, setCeldaSeleccionada] = useState<MatrizCelda | null>(null);
  // Origen de la selección cruzada (cross-filtering como Power BI)
  const [origenSeleccion, setOrigenSeleccion] = useState<
    'matriz_celda' | 'estrategias_tabla' | 'estrategias_torta' | null
  >(null);

  const handleSeleccionarCelda = (celda: MatrizCelda | null) => {
    if (!celda) {
      setCeldaSeleccionada(null);
      setEstrategiaSeleccionada(null);
      setOrigenSeleccion(null);
      return;
    }
    if (
      celdaSeleccionada &&
      celdaSeleccionada.fila === celda.fila &&
      celdaSeleccionada.columna === celda.columna
    ) {
      setCeldaSeleccionada(null);
      setEstrategiaSeleccionada(null);
      setOrigenSeleccion(null);
      return;
    }
    setCeldaSeleccionada(celda);
    setEstrategiaSeleccionada(celda.estrategia || null);
    setOrigenSeleccion('matriz_celda');
  };

  const handleSeleccionarEstrategiaDesdeTabla = (id: number | null) => {
    if (!id || (estrategiaSeleccionada === id && origenSeleccion === 'estrategias_tabla')) {
      setEstrategiaSeleccionada(null);
      setCeldaSeleccionada(null);
      setOrigenSeleccion(null);
      return;
    }
    setEstrategiaSeleccionada(id);
    setCeldaSeleccionada(null);
    setOrigenSeleccion('estrategias_tabla');
  };

  const handleSeleccionarEstrategiaDesdeTorta = (id: number | null) => {
    if (!id || (estrategiaSeleccionada === id && origenSeleccion === 'estrategias_torta')) {
      setEstrategiaSeleccionada(null);
      setCeldaSeleccionada(null);
      setOrigenSeleccion(null);
      return;
    }
    setEstrategiaSeleccionada(id);
    setCeldaSeleccionada(null);
    setOrigenSeleccion('estrategias_torta');
  };

  const handleLimpiarSeleccion = () => {
    setEstrategiaSeleccionada(null);
    setCeldaSeleccionada(null);
    setOrigenSeleccion(null);
  };

  // Modo de visualización: 'split' (Lado a Lado - Cero Scroll) | 'apilado' (Formato Extendido)
  const [vistaLayout, setVistaLayout] = useState<'split' | 'apilado'>('split');

  // Estados de datos
  const [matrizData, setMatrizData] = useState<MatrizResponse | null>(null);
  // Matriz sin filtro de segmento (solo cuando hay segmento activo) para mostrar opacado lo excluido
  const [matrizBaseData, setMatrizBaseData] = useState<MatrizResponse | null>(null);
  const [estrategiasData, setEstrategiasData] = useState<EstrategiasCuadroResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [exportando, setExportando] = useState<boolean>(false);

  const handleDescargarExcel = async () => {
    setExportando(true);
    setError('');
    try {
      if (pestanaActiva === 'detalle') {
        await portfolioService.descargarPadronExcel({
          periodo: periodoSeleccionado,
          entidad: entidadSeleccionada,
        });
      } else {
        await portfolioService.descargarArchivoCompleto({
          periodo: periodoSeleccionado,
          entidad: entidadSeleccionada,
        });
      }
    } catch (e: unknown) {
      console.error('Error al exportar archivo:', e);
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo generar ni descargar el archivo Excel solicitado.'
      );
    } finally {
      setExportando(false);
    }
  };

  const initFiltrosPromiseRef = useRef<Promise<{ periodo: string; entidad: string } | null> | null>(
    null
  );

  // 1. Inicialización de filtros y selectores (Periodos y Entidades)
  const initFiltros = useCallback(async () => {
    if (initFiltrosPromiseRef.current) {
      return initFiltrosPromiseRef.current;
    }

    const promise = (async () => {
      try {
        const [perList, entList] = await Promise.all([
          portfolioService.getPeriodos(entidadQuery || undefined),
          portfolioService.getEntidades(),
        ]);

        setPeriodos(perList);
        let perElegido = '';
        if (perList.length > 0) {
          perElegido = perList[0];
          setPeriodoSeleccionado((prev) => (prev && perList.includes(prev) ? prev : perList[0]));
        }

        setEntidades(entList);

        // Si es cliente, su entidad es estrictamente su empresa asignada
        let entidadElegida = '';
        const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        let esCliente = false;
        let empresaUsuario = '';
        if (userStr) {
          try {
            const u = JSON.parse(userStr);
            esCliente = u.rolId === 2;
            empresaUsuario = u.empresaNombre || '';
          } catch {}
        }

        if (esCliente && empresaUsuario) {
          entidadElegida = empresaUsuario;
        } else {
          if (entidadQuery) {
            const match = entList.find(
              (e) =>
                e.toLowerCase() === entidadQuery.toLowerCase() ||
                e.toLowerCase().includes(entidadQuery.toLowerCase()) ||
                entidadQuery.toLowerCase().includes(e.toLowerCase())
            );
            entidadElegida = match || entidadQuery;
          } else if (entList.length > 0) {
            entidadElegida = entList[0];
          }
        }

        setEntidadSeleccionada((prev) => prev || entidadElegida);
        if (typeof window !== 'undefined' && entidadElegida) {
          window.dispatchEvent(
            new CustomEvent('portfolio-entidad-changed', { detail: entidadElegida })
          );
        }
        return { periodo: perElegido, entidad: entidadElegida };
      } catch (err: unknown) {
        console.error('Error al inicializar filtros:', err);
        setError('No se pudo conectar con la base de datos de cartera.');
        return null;
      } finally {
        initFiltrosPromiseRef.current = null;
      }
    })();

    initFiltrosPromiseRef.current = promise;
    return promise;
  }, [entidadQuery]);

  // Carga inicial al montar el componente
  useEffect(() => {
    // Consultar estado de mantenimiento inicial
    portfolioService
      .getMantenimiento()
      .then((m) => {
        setMantenimiento(m);
        setMantenimientoCargando(false);
      })
      .catch((e) => {
        console.error('Error al consultar estado de mantenimiento:', e);
        setMantenimientoCargando(false);
      });

    if (isAdmin) {
      empresaService
        .listarEmpresas()
        .then((emps) => setEmpresas(emps))
        .catch((e) => console.error('Error al listar empresas:', e));
    }
  }, [isAdmin]);

  useEffect(() => {
    initFiltros();
  }, [initFiltros]);

  // Sincronización en tiempo real y sondeo pasivo mientras el portal esté en mantenimiento
  useEffect(() => {
    const verificarMantenimiento = async () => {
      try {
        const m = await portfolioService.getMantenimiento();
        setMantenimiento((prev) => {
          if (prev?.activo === m.activo && prev?.mensaje === m.mensaje) return prev;
          return m;
        });
      } catch {
        // Silencioso en sondeo automático
      }
    };

    const handler = () => {
      verificarMantenimiento();
    };

    const storageHandler = (e: StorageEvent) => {
      if (e.key === 'mantenimiento_ts' || e.key === 'mantenimiento_status') {
        verificarMantenimiento();
      }
    };

    window.addEventListener('mantenimiento-changed', handler);
    window.addEventListener('storage', storageHandler);

    // Sondeo inteligente cada 7 segundos mientras el cliente esté en pantalla de mantenimiento
    let interval: NodeJS.Timeout | null = null;
    if (!isAdmin && mantenimiento?.activo) {
      interval = setInterval(verificarMantenimiento, 7000);
    }

    return () => {
      window.removeEventListener('mantenimiento-changed', handler);
      window.removeEventListener('storage', storageHandler);
      if (interval) clearInterval(interval);
    };
  }, [isAdmin, mantenimiento?.activo]);

  const handleCambiarEntidadSupervisor = async (nuevaEntidad: string) => {
    setEntidadSeleccionada(nuevaEntidad);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('portfolio-entidad-changed', { detail: nuevaEntidad })
      );
    }
    try {
      const perList = await portfolioService.getPeriodos(nuevaEntidad);
      if (perList.length > 0) {
        setPeriodos(perList);
        if (!perList.includes(periodoSeleccionado)) {
          setPeriodoSeleccionado(perList[0]);
        }
      }
    } catch (e) {
      console.error('Error al actualizar periodos de la empresa supervisada:', e);
    }
  };

  const handleToggleMantenimiento = async () => {
    if (!isAdmin || actualizandoMantenimiento) return;
    const nuevoEstado = !mantenimiento?.activo;
    setActualizandoMantenimiento(true);
    try {
      const res = await portfolioService.setMantenimiento(nuevoEstado);
      setMantenimiento(res);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('mantenimiento-changed'));
        localStorage.setItem('mantenimiento_ts', Date.now().toString());
      }
    } catch (e) {
      console.error('Error al actualizar mantenimiento:', e);
    } finally {
      setActualizandoMantenimiento(false);
    }
  };

  // 2. Función reutilizable para cargar Matriz y Cuadro de Estrategias
  const cargarMatrizYEstrategias = useCallback(
    async (periodoParam?: string, entidadParam?: string) => {
      const per = periodoParam || periodoSeleccionado;
      const ent = entidadParam !== undefined ? entidadParam : entidadSeleccionada;

      if (!per) return;
      if (!isAdmin && mantenimiento?.activo) return;

      handleLimpiarSeleccion();
      setLoading(true);
      setError('');
      try {
        const params = {
          periodo: per,
          entidad: ent || undefined,
          tipoCliente: tipoCliente !== 'Todas' ? tipoCliente : undefined,
        };

        const conSegmento = params.tipoCliente !== undefined;

        const [matRes, estRes, matBaseRes] = await Promise.all([
          portfolioService.getMatriz(params),
          portfolioService.getEstrategias(params),
          conSegmento
            ? portfolioService.getMatriz({ ...params, tipoCliente: undefined })
            : Promise.resolve(null),
        ]);

        setMatrizData(matRes);
        setMatrizBaseData(matBaseRes);
        setEstrategiasData(estRes);
      } catch (err: unknown) {
        console.error('Error al cargar datos del portafolio:', err);
        const backendMsg = (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message;
        setError(
          typeof backendMsg === 'string'
            ? backendMsg
            : 'La empresa seleccionada está inactiva o aún no cuenta con datos de cartera cargados.'
        );
      } finally {
        setLoading(false);
      }
    },
    [periodoSeleccionado, entidadSeleccionada, tipoCliente, isAdmin, mantenimiento?.activo]
  );

  // Efecto que responde a cambios en filtros o al desactivarse el modo mantenimiento
  useEffect(() => {
    if (!isAdmin && mantenimiento?.activo) return;
    if (!periodoSeleccionado) return;

    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        cargarMatrizYEstrategias();
      }
    });
    return () => {
      active = false;
    };
  }, [
    periodoSeleccionado,
    entidadSeleccionada,
    tipoCliente,
    mantenimiento?.activo,
    isAdmin,
    cargarMatrizYEstrategias,
  ]);

  // Comprobar manualmente disponibilidad desde la pantalla de mantenimiento del cliente
  const handleComprobarDisponibilidad = async () => {
    setComprobandoDisponibilidad(true);
    setMensajeComprobacion('');
    try {
      const res = await portfolioService.getMantenimiento();
      setMantenimiento(res);

      if (res.activo) {
        setMensajeComprobacion(
          'El mantenimiento aún sigue en curso. Por favor aguarde unos momentos mientras se sincronizan los datos.'
        );
        setTimeout(() => setMensajeComprobacion(''), 4500);
      } else {
        // Reanudación confirmada: asegurar filtros y cargar datos de cartera de inmediato
        setLoading(true);
        let per = periodoSeleccionado;
        let ent = entidadSeleccionada;
        if (!per || periodos.length === 0) {
          const filtros = await initFiltros();
          if (filtros) {
            per = filtros.periodo;
            ent = filtros.entidad;
          }
        }
        if (per) {
          await cargarMatrizYEstrategias(per, ent);
        }
      }
    } catch (e) {
      console.error('Error al comprobar disponibilidad:', e);
      setMensajeComprobacion('No se pudo verificar el estado en este momento.');
      setTimeout(() => setMensajeComprobacion(''), 3500);
    } finally {
      setComprobandoDisponibilidad(false);
      setMantenimientoCargando(false);
    }
  };

  // Indicadores de resumen ejecutivo
  const totalClientes = matrizData?.granTotal.cantidad || 0;
  const totalSaldo = matrizData?.granTotal.saldoTotal || 0;

  const est1 = estrategiasData?.items.find((i) => i.id === 1);
  const est2 = estrategiasData?.items.find((i) => i.id === 2);
  const est3 = estrategiasData?.items.find((i) => i.id === 3);
  const est4 = estrategiasData?.items.find((i) => i.id === 4);
  const est5 = estrategiasData?.items.find((i) => i.id === 5);
  const est6 = estrategiasData?.items.find((i) => i.id === 6);

  const pctSanaNum = Number(((est1?.participacionSaldo || 0) + (est2?.participacionSaldo || 0)).toFixed(1));
  const pctCriticaNum = Number((est6?.participacionSaldo || 0).toFixed(1));
  const pctMediaNum = Number(
    ((est3?.participacionSaldo || 0) + (est4?.participacionSaldo || 0) + (est5?.participacionSaldo || 0)).toFixed(1)
  );

  const pctSana = pctSanaNum.toFixed(1);
  const pctCritica = pctCriticaNum.toFixed(1);

  const maxClientesEstr = Math.max(
    ...(estrategiasData?.items.map((i) => i.cantidad) || [1]),
    1
  );

  // Pantalla de Mantenimiento para Usuarios Clientes
  if (!mantenimientoCargando && !isAdmin && mantenimiento?.activo) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 sm:p-10 text-center relative overflow-hidden">
          {/* Acento superior de color institucional */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-[#F58220] to-[#1B4589]" />

          {/* Logo y Badge */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1B4589] to-[#2B6CB0] flex items-center justify-center text-white font-black text-sm shadow-xs">
              IP
            </div>
            <div className="text-left">
              <span className="font-extrabold text-sm text-[#1B4589] block leading-tight">Informa® Perú</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Inteligencia de Riesgo</span>
            </div>
          </div>

          {/* Icono animado */}
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shadow-xs">
            <span className="text-4xl animate-bounce">🛠️</span>
          </div>

          {/* Badge de Estado */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 mb-4 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
            Mantenimiento Programado
          </span>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-3">
            Actualización de Cartera en Curso
          </h2>

          <p className="text-sm text-slate-600 leading-relaxed mb-6 font-medium">
            {mantenimiento?.mensaje ||
              'Estamos actualizando la información de la cartera crediticia para brindarle datos actualizados y precisos. El servicio se restablecerá a la brevedad.'}
          </p>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 mb-6 text-xs text-slate-500 space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span className="font-bold text-slate-700">Estado:</span>
              <span>Procesando base de datos analítica</span>
            </div>
            <div className="flex items-center gap-2">
              <span>⏱️</span>
              <span className="font-bold text-slate-700">Disponibilidad:</span>
              <span>Reanudación automática al finalizar</span>
            </div>
            {mantenimiento?.fechaActualizacion && (
              <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-200/60">
                <span>🕒</span>
                <span>Último cambio: {new Date(mantenimiento.fechaActualizacion).toLocaleString('es-PE')}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleComprobarDisponibilidad}
            disabled={comprobandoDisponibilidad}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1B4589] hover:bg-[#163870] active:scale-[0.99] text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-75 disabled:cursor-wait"
          >
            <span className={comprobandoDisponibilidad ? 'animate-spin inline-block text-sm' : 'text-sm'}>🔄</span>
            <span>
              {comprobandoDisponibilidad
                ? 'Verificando disponibilidad del sistema...'
                : 'Comprobar disponibilidad del sistema'}
            </span>
          </button>

          {mensajeComprobacion && (
            <div className="mt-3.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold text-center">
              {mensajeComprobacion}
            </div>
          )}

          <p className="text-[11px] text-slate-400 mt-4 font-medium">
            Esta pantalla se reanudará automáticamente al finalizar las labores técnicas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-3 max-w-[1600px] mx-auto pb-1">
      {/* Barra de Auditoría / Supervisión de Administrador */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-[#0B192C] to-[#1B4589] text-white px-4 py-2.5 rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-slate-700/80">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-400 text-slate-950 shadow-2xs">
              Modo Supervisor Admin
            </span>

            {/* Logo de la Empresa Supervisada */}
            {logoEmpresa ? (
              <div className="bg-white rounded-lg h-9 max-h-9 px-2.5 py-1 shadow-xs border border-white/20 flex items-center justify-center overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoEmpresa}
                  alt={entidadSeleccionada}
                  style={{ height: '26px', maxHeight: '26px', width: 'auto', maxWidth: '170px' }}
                  className="h-6.5 w-auto object-contain shrink-0"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-blue-900/80 border border-blue-400/40 text-blue-200 flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                {entidadSeleccionada ? entidadSeleccionada.substring(0, 2).toUpperCase() : '🏢'}
              </div>
            )}

            <span className="text-xs font-semibold text-slate-200">
              Supervisando Portfolio de:{' '}
              <strong className="text-white">
                {entidadSeleccionada || 'Empresa'}
              </strong>
            </span>
            {entidades.length > 1 && (
              <CustomSelect
                value={entidadSeleccionada}
                options={entidades.map((ent) => ({
                  value: ent,
                  label: ent,
                }))}
                onChange={handleCambiarEntidadSupervisor}
                prefix="EMPRESA:"
                ariaLabel="Cambiar Empresa a Supervisar"
                variant="dark"
                size="sm"
              />
            )}
          </div>
          <button
            type="button"
            onClick={() => router.push('/admin/empresas')}
            className="text-xs font-bold text-amber-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer shrink-0"
          >
            ← Volver a Gestión de Empresas
          </button>
        </div>
      )}

      {/* Aviso informativo cuando la empresa no cuenta con cartera analítica en el periodo */}
      {matrizData && matrizData.granTotal.cantidad === 0 && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 text-slate-800 shadow-2xs">
          <span className="text-2xl shrink-0">📊</span>
          <div className="min-w-0">
            <p className="font-bold text-xs text-[#1B4589]">
              Sin registros de cartera para «{entidadSeleccionada || 'esta empresa'}» (Periodo {periodoSeleccionado})
            </p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Esta empresa no cuenta aún con información de clientes cargada en el repositorio analítico para el periodo seleccionado. En cuanto se sincronice la base de datos, los indicadores se reflejarán aquí automáticamente.
            </p>
          </div>
        </div>
      )}

      {/* Banner de Aviso exclusivo para el Administrador cuando el Mantenimiento está activo */}
      {isAdmin && mantenimiento?.activo && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-5 py-3 rounded-xl shadow-md border border-amber-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">🛠️</span>
            <div>
              <span className="font-black text-xs uppercase tracking-wider block">
                MODO MANTENIMIENTO ACTIVO — ACCESO EXCLUSIVO DE ADMINISTRADOR
              </span>
              <span className="text-xs text-amber-100 font-medium">
                Los clientes ven la pantalla de mantenimiento en este momento. Tienes acceso exclusivo de supervisión y validación técnica.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleMantenimiento}
            disabled={actualizandoMantenimiento}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0 border border-white/20"
          >
            {actualizandoMantenimiento ? 'Guardando...' : '🟢 Abrir Portal a Clientes'}
          </button>
        </div>
      )}

      {/* =========================================================================
          NIVEL 2: 4 BLOQUES DE KPI EJECUTIVOS DE RIESGO (Inspirados en Dashboard Moderno)
          Tarjetas con micro-gráficos: Bullet multi-segmento, espectro de barras, radial gauge y wave sparkline
          ========================================================================= */}
      {pestanaActiva === 'matriz' && (
        <section aria-label="Indicadores Clave de Riesgo" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-1">
          {/* KPI 1: Exposición Total con Barra de Progreso Multi-Segmento */}
          <div className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 sm:p-4.5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative group">
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-[#1B4589] via-[#00C9A7] to-[#1B4589] opacity-80 group-hover:opacity-100 transition-opacity" />

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Exposición Total Cartera
                  </span>
                  <span className="relative group/info inline-flex items-center">
                    <span
                      tabIndex={0}
                      aria-label="Origen del indicador Exposición Total Cartera"
                      className="w-3.5 h-3.5 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-[#1B4589] text-[9px] font-black inline-flex items-center justify-center cursor-help transition-colors"
                    >
                      i
                    </span>
                    <span className="pointer-events-none opacity-0 group-hover/info:opacity-100 group-focus-within/info:opacity-100 transition-opacity duration-150 absolute left-0 top-5 z-30 w-56 p-2.5 rounded-xl bg-slate-900 text-white text-[10.5px] leading-relaxed font-medium shadow-xl border border-slate-700">
                      <strong className="text-amber-300 block mb-0.5">Origen: Matriz de Transición</strong>
                      Suma del <strong>Saldo Total</strong> de todas las celdas (E1 a E6) para el corte {periodoSeleccionado || 'vigente'}.
                    </span>
                  </span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-[#1B4589] border border-blue-200/60 uppercase tracking-tight shrink-0">
                  Cartera Total
                </span>
              </div>

              <div className="flex items-baseline gap-2 mt-1 mb-0.5">
                <span className="font-mono text-xl xl:text-2xl font-black text-slate-900 tracking-tight">
                  S/ {totalSaldo.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                S/ {(totalSaldo / 1e6).toFixed(1)}M consolidado en corte
              </p>
              <p className="text-[10px] font-semibold text-slate-400/90 mt-0.5">
                Fuente: Matriz 8×9 (Saldo Total · {periodoSeleccionado || 'Corte'})
              </p>
            </div>

            {/* Micro-visual: Segmented Progress Bar */}
            <div className="mt-3.5 pt-2 border-t border-slate-100/90 space-y-1.5">
              <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${pctSanaNum}%` }}
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500"
                  title={`Cartera Sana: ${pctSanaNum}%`}
                />
                <div
                  style={{ width: `${pctMediaNum}%` }}
                  className="bg-gradient-to-r from-amber-400 to-amber-500 h-full transition-all duration-500"
                  title={`Riesgo Medio: ${pctMediaNum}%`}
                />
                <div
                  style={{ width: `${pctCriticaNum}%` }}
                  className="bg-gradient-to-r from-rose-500 to-red-600 h-full transition-all duration-500"
                  title={`Mora Crítica: ${pctCriticaNum}%`}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold px-0.5 pt-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                  Sana: <strong className="text-slate-800">{pctSana}%</strong>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Crítica: <strong className="text-slate-800">{pctCritica}%</strong>
                </span>
              </div>
            </div>
          </div>

          {/* KPI 2: Población de Deudores con Espectro de Micro-Barras por Estrategia */}
          <div className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 sm:p-4.5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative group">
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-amber-500 via-teal-400 to-amber-500 opacity-80 group-hover:opacity-100 transition-opacity" />

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Población de Deudores
                  </span>
                  <span className="relative group/info inline-flex items-center">
                    <span
                      tabIndex={0}
                      aria-label="Origen del indicador Población de Deudores"
                      className="w-3.5 h-3.5 rounded-full bg-slate-100 hover:bg-amber-100 text-slate-500 hover:text-amber-800 text-[9px] font-black inline-flex items-center justify-center cursor-help transition-colors"
                    >
                      i
                    </span>
                    <span className="pointer-events-none opacity-0 group-hover/info:opacity-100 group-focus-within/info:opacity-100 transition-opacity duration-150 absolute left-0 top-5 z-30 w-56 p-2.5 rounded-xl bg-slate-900 text-white text-[10.5px] leading-relaxed font-medium shadow-xl border border-slate-700">
                      <strong className="text-amber-300 block mb-0.5">Origen: Matriz &amp; Estrategias</strong>
                      Conteo total de clientes únicos distribuidos en las 6 estrategias (<strong>E1 a E6</strong>) en el corte {periodoSeleccionado || 'vigente'}.
                    </span>
                  </span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 uppercase tracking-tight shrink-0">
                  Titulares
                </span>
              </div>

              <div className="flex items-baseline gap-2 mt-1 mb-0.5">
                <span className="font-mono text-xl xl:text-2xl font-black text-slate-900 tracking-tight">
                  {totalClientes.toLocaleString('es-PE')}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                100.0% del universo evaluado
              </p>
              <p className="text-[10px] font-semibold text-slate-400/90 mt-0.5">
                Fuente: Suma E1–E6 (Matriz · {periodoSeleccionado || 'Corte'})
              </p>
            </div>

            {/* Micro-visual: 6 Column Spectrum Bars */}
            <div className="mt-2.5 pt-2 border-t border-slate-100/90">
              <div className="flex items-end justify-between gap-1 h-8 px-0.5">
                {(estrategiasData?.items && estrategiasData.items.length > 0
                  ? estrategiasData.items
                  : [
                      { id: 1, cantidad: 0, color: '#008000', descripcion: 'Fidelización' },
                      { id: 2, cantidad: 0, color: '#008080', descripcion: 'Prevención' },
                      { id: 3, cantidad: 0, color: '#FFFF00', descripcion: 'Mitigación' },
                      { id: 4, cantidad: 0, color: '#800080', descripcion: 'Blindaje' },
                      { id: 5, cantidad: 0, color: '#EB5559', descripcion: 'Cobranza' },
                      { id: 6, cantidad: 0, color: '#FF0000', descripcion: 'Conciliación' },
                    ]
                ).map((item) => {
                  const alturaPct = maxClientesEstr > 0
                    ? Math.max(18, Math.round((item.cantidad / maxClientesEstr) * 100))
                    : 20;
                  return (
                    <div key={item.id} className="flex-1 flex flex-col items-center gap-0.5 group/bar">
                      <div className="w-full bg-slate-100/80 rounded-t-sm h-6 flex items-end overflow-hidden">
                        <div
                          className="w-full rounded-t-sm transition-all duration-500 group-hover/bar:brightness-110"
                          style={{
                            height: `${alturaPct}%`,
                            backgroundColor: getEstrategiaColor(item.id).color || item.color || '#005B94',
                          }}
                          title={`${item.descripcion}: ${item.cantidad.toLocaleString('es-PE')} clientes`}
                        />
                      </div>
                      <span className="text-[8px] font-bold text-slate-400 group-hover/bar:text-slate-800">
                        E{item.id}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* KPI 3: Cartera Sana con Radial Circular Ring Gauge */}
          <div className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 sm:p-4.5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative group">
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 opacity-80 group-hover:opacity-100 transition-opacity" />

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Cartera Sana (E1 + E2)
                  </span>
                  <span className="relative group/info inline-flex items-center">
                    <span
                      tabIndex={0}
                      aria-label="Origen del indicador Cartera Sana"
                      className="w-3.5 h-3.5 rounded-full bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-700 text-[9px] font-black inline-flex items-center justify-center cursor-help transition-colors"
                    >
                      i
                    </span>
                    <span className="pointer-events-none opacity-0 group-hover/info:opacity-100 group-focus-within/info:opacity-100 transition-opacity duration-150 absolute left-0 top-5 z-30 w-60 p-2.5 rounded-xl bg-slate-900 text-white text-[10.5px] leading-relaxed font-medium shadow-xl border border-slate-700">
                      <strong className="text-emerald-300 block mb-0.5">Origen: Cuadro de Estrategias</strong>
                      Suma del % de saldo en <strong>1. Fidelización (E1)</strong> + <strong>2. Prevención (E2)</strong> respecto al Saldo Total.
                    </span>
                  </span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 uppercase tracking-tight shrink-0 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Bajo Riesgo
                </span>
              </div>

              {/* Layout dividido: Métrica + Radial Circular Ring */}
              <div className="flex items-center justify-between gap-2 mt-1">
                <div>
                  <span className="font-mono text-xl xl:text-2xl font-black text-emerald-700 tracking-tight block">
                    {pctSana} %
                  </span>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                    Fidelización &amp; Prevención
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400/90 mt-0.5">
                    Fórmula: (Saldo E1 + E2) ÷ Saldo Total
                  </p>
                </div>

                {/* Circular Gauge SVG */}
                <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 54 54">
                    <circle
                      cx="27"
                      cy="27"
                      r="22"
                      fill="none"
                      stroke="#E2E8F0"
                      strokeWidth="4.5"
                    />
                    <circle
                      cx="27"
                      cy="27"
                      r="22"
                      fill="none"
                      stroke="url(#emeraldTealGrad)"
                      strokeWidth="4.5"
                      strokeDasharray="138.2"
                      strokeDashoffset={138.2 - (138.2 * Math.min(100, Math.max(0, pctSanaNum))) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                    <defs>
                      <linearGradient id="emeraldTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#06B6D4" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute text-[10px] font-black text-emerald-700">
                    {Math.round(pctSanaNum)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Desglose E1 vs E2 pills */}
            <div className="mt-3 pt-2 border-t border-slate-100/90 flex items-center justify-between text-[10px]">
              <span className="text-slate-500 font-semibold">
                E1 Fidel.: <strong className="text-emerald-700">{est1?.participacionSaldo || 0}%</strong>
              </span>
              <span className="text-slate-500 font-semibold">
                E2 Prev.: <strong className="text-teal-700">{est2?.participacionSaldo || 0}%</strong>
              </span>
            </div>
          </div>

          {/* KPI 4: Mora Crítica con Wave Sparkline y Alerta */}
          <div className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 sm:p-4.5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative group">
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-rose-500 via-red-600 to-rose-700 opacity-80 group-hover:opacity-100 transition-opacity" />

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Mora Crítica (E6)
                  </span>
                  <span className="relative group/info inline-flex items-center">
                    <span
                      tabIndex={0}
                      aria-label="Origen del indicador Mora Crítica"
                      className="w-3.5 h-3.5 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 text-[9px] font-black inline-flex items-center justify-center cursor-help transition-colors"
                    >
                      i
                    </span>
                    <span className="pointer-events-none opacity-0 group-hover/info:opacity-100 group-focus-within/info:opacity-100 transition-opacity duration-150 absolute right-0 sm:left-0 top-5 z-30 w-60 p-2.5 rounded-xl bg-slate-900 text-white text-[10.5px] leading-relaxed font-medium shadow-xl border border-slate-700">
                      <strong className="text-rose-300 block mb-0.5">Origen: Cuadro de Estrategias</strong>
                      Participación de la estrategia <strong>6. Solución de Conciliación (E6)</strong> sobre el Saldo Total de la cartera.
                    </span>
                  </span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200/60 uppercase tracking-tight shrink-0 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                  Severa
                </span>
              </div>

              {/* Layout dividido: Métrica + Wave Sparkline */}
              <div className="flex items-center justify-between gap-2 mt-1">
                <div>
                  <span className="font-mono text-xl xl:text-2xl font-black text-rose-700 tracking-tight block">
                    {pctCritica} %
                  </span>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                    Conciliación &amp; Castigo
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400/90 mt-0.5">
                    Fórmula: Saldo E6 ÷ Saldo Total
                  </p>
                </div>

                {/* SVG Wave Sparkline */}
                <div className="w-20 h-11 shrink-0 overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 100 48" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="roseWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0 38 Q 25 32 45 16 T 82 8 T 100 22 L 100 48 L 0 48 Z"
                      fill="url(#roseWaveGrad)"
                    />
                    <path
                      d="M 0 38 Q 25 32 45 16 T 82 8 T 100 22"
                      fill="none"
                      stroke="#E11D48"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <circle cx="82" cy="8" r="3.5" fill="#E11D48" />
                    <circle cx="82" cy="8" r="7" fill="#E11D48" opacity="0.3" className="animate-ping" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Saldo deudor crítico */}
            <div className="mt-3 pt-2 border-t border-slate-100/90 flex items-center justify-between text-[10px]">
              <span className="text-slate-500 font-semibold">
                Saldo Judicial: <strong className="text-rose-700">S/ {((est6?.saldo || 0) / 1e6).toFixed(1)}M</strong>
              </span>
              <span className="text-rose-600 font-black">
                {Number(est6?.cantidad || 0).toLocaleString('es-PE')} deudores
              </span>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          NIVEL 3: BARRA DE OPERACIONES Y HERRAMIENTAS
          Fila única garantizada en laptops (lg:flex-nowrap) con botón verde Excel (#107C41)
          ========================================================================= */}
      {pestanaActiva === 'matriz' && (
        <section aria-label="Herramientas y Filtros Operativos" className="bg-white border border-slate-200/90 rounded-lg px-3 sm:px-3.5 py-2 sm:py-1.5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 lg:gap-3 relative z-20 overflow-visible">
          {/* Izquierda: Indicador formal del módulo + Selector de Layout (solo escritorio) */}
          <div className="flex items-center justify-between lg:justify-start gap-2 w-full lg:w-auto shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1B4589]" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-tight whitespace-nowrap">
                Diagnóstico de Cartera
              </span>
            </div>

            <div className="h-4 w-px bg-slate-200 hidden lg:block" />

            {/* Alternador de Layout: Dividido vs Extender (Solo en pantallas grandes lg+) */}
            <div className="hidden lg:inline-flex items-center h-7 bg-slate-100 p-0.5 rounded-md border border-slate-200 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setVistaLayout('split')}
                className={`flex items-center gap-1 px-2 h-full rounded transition-all cursor-pointer whitespace-nowrap text-xs ${
                  vistaLayout === 'split'
                    ? 'bg-[#1B4589] text-white shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vista Dividida: Matriz y Estrategias juntas"
              >
                <svg className="w-3 h-3 opacity-85" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h17.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
                </svg>
                <span>Dividido</span>
              </button>

              <button
                type="button"
                onClick={() => setVistaLayout('apilado')}
                className={`flex items-center gap-1 px-2 h-full rounded transition-all cursor-pointer whitespace-nowrap text-xs ${
                  vistaLayout === 'apilado'
                    ? 'bg-[#1B4589] text-white shadow-xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Extender a Vista Continua Amplia (Formato Clásico)"
              >
                <svg className="w-3 h-3 opacity-85" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
                <span>Extender</span>
              </button>
            </div>
          </div>

          {/* Derecha: Filtros Operativos de Cartera + Botón Exportar (adaptable en móvil, fila única en desktop) */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full lg:w-auto">
            {/* 1 y 2: Selectores de Periodo y Segmento */}
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
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
                  align="right"
                  size="sm"
                />
              )}

              <CustomSelect
                value={tipoCliente}
                options={[
                  { value: 'Todas', label: 'Todos', sublabel: 'Todos los Segmentos' },
                  { value: '1. EXCLUSIVO', label: 'Exclusivo', sublabel: '1. Exclusivo (Deuda única)' },
                  { value: '2. NO EXCLUSIVO', label: 'No Exclusivo', sublabel: '2. No Exclusivo (Compartida)' },
                ]}
                onChange={setTipoCliente}
                prefix="SEGMENTO:"
                ariaLabel="Segmento / Exclusividad"
                align="right"
                size="sm"
              />
            </div>

            {/* Divisor sutil */}
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            {/* 3. Segmented Control: Clientes (#) vs Saldos (S/) */}
            <div className="inline-flex items-center h-7 bg-slate-100 p-0.5 rounded-md border border-slate-200/90 shrink-0">
              <button
                type="button"
                onClick={() => setModo('clientes')}
                className={`px-2.5 h-full flex items-center text-xs font-bold rounded transition-all cursor-pointer whitespace-nowrap ${
                  modo === 'clientes'
                    ? 'bg-white text-[#1B4589] shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Clientes (#)
              </button>
              <button
                type="button"
                onClick={() => setModo('saldos')}
                className={`px-2.5 h-full flex items-center text-xs font-bold rounded transition-all cursor-pointer whitespace-nowrap ${
                  modo === 'saldos'
                    ? 'bg-white text-[#1B4589] shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Saldos (S/)
              </button>
            </div>

            {/* Divisor sutil */}
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            {/* 4. Botón Oficial Excel Verde Institucional (#107C41) */}
            <button
              type="button"
              onClick={handleDescargarExcel}
              disabled={exportando}
              className="flex items-center justify-center gap-1.5 px-3 h-7 text-xs font-bold rounded-md bg-[#107C41] hover:bg-[#0E6C38] text-white transition-all disabled:opacity-50 cursor-pointer shrink-0 whitespace-nowrap shadow-xs active:scale-[0.99]"
              title="Exportar archivo Excel oficial (.xlsx)"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5m0 0l5-5m-5 5V3" />
              </svg>
              <span>{exportando ? 'Exportando...' : 'Exportar'}</span>
            </button>
          </div>
        </section>
      )}

      {/* Alerta de Error si ocurre */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-4 py-3 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span className="font-bold">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setError('');
              window.history.back();
            }}
            className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-300 transition-colors shrink-0 shadow-2xs cursor-pointer"
          >
            ← Volver
          </button>
        </div>
      )}

      {/* =========================================================================
          NIVEL 4: VISTA DE DATOS (CABINA 'DIVIDIDO' CERO-SCROLL vs FORMATO EXTENDER)
          Ambos bloques coexisten armónicamente y se comunican en tiempo real
          ========================================================================= */}
      {pestanaActiva === 'matriz' && (
        vistaLayout === 'split' ? (
          /* MODO CABINA ZERO-SCROLL: Matriz (7 cols) y Estrategias (5 cols) con MISMO TAMAÑO exacto */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
            <div className="lg:col-span-7 min-w-0 flex flex-col">
              <MatrizTransicion
                data={matrizData}
                dataBase={matrizBaseData}
                loading={loading}
                modo={modo}
                onCambiarModo={setModo}
                estrategiaSeleccionada={estrategiaSeleccionada}
                onSeleccionarEstrategia={handleSeleccionarEstrategiaDesdeTabla}
                celdaSeleccionada={celdaSeleccionada}
                onSeleccionarCelda={handleSeleccionarCelda}
                origenSeleccion={origenSeleccion}
                onLimpiarSeleccion={handleLimpiarSeleccion}
                periodo={periodoSeleccionado}
                periodos={periodos}
                onPeriodoChange={setPeriodoSeleccionado}
                tipoCliente={tipoCliente}
                onTipoClienteChange={setTipoCliente}
                entidad={entidadSeleccionada}
                hideToolbar={true}
                compact={true}
              />
            </div>

            <div className="lg:col-span-5 min-w-0 flex flex-col">
              <CuadroEstrategias
                data={estrategiasData}
                loading={loading}
                modo={modo}
                onCambiarModo={setModo}
                estrategiaSeleccionada={estrategiaSeleccionada}
                onSeleccionarEstrategia={handleSeleccionarEstrategiaDesdeTabla}
                celdaSeleccionada={celdaSeleccionada}
                origenSeleccion={origenSeleccion}
                onSeleccionarEstrategiaTabla={handleSeleccionarEstrategiaDesdeTabla}
                onSeleccionarEstrategiaTorta={handleSeleccionarEstrategiaDesdeTorta}
                onLimpiarSeleccion={handleLimpiarSeleccion}
                periodo={periodoSeleccionado}
                periodos={periodos}
                onPeriodoChange={setPeriodoSeleccionado}
                tipoCliente={tipoCliente}
                onTipoClienteChange={setTipoCliente}
                entidad={entidadSeleccionada}
                hideToolbar={true}
                layout="split"
              />
            </div>
          </div>
        ) : (
          /* MODO EXTENDIDO: Matriz arriba y Cuadro de Estrategias abajo */
          <div className="space-y-4">
            <MatrizTransicion
              data={matrizData}
              dataBase={matrizBaseData}
              loading={loading}
              modo={modo}
              onCambiarModo={setModo}
              estrategiaSeleccionada={estrategiaSeleccionada}
              onSeleccionarEstrategia={handleSeleccionarEstrategiaDesdeTabla}
              celdaSeleccionada={celdaSeleccionada}
              onSeleccionarCelda={handleSeleccionarCelda}
              origenSeleccion={origenSeleccion}
              onLimpiarSeleccion={handleLimpiarSeleccion}
              periodo={periodoSeleccionado}
              periodos={periodos}
              onPeriodoChange={setPeriodoSeleccionado}
              tipoCliente={tipoCliente}
              onTipoClienteChange={setTipoCliente}
              entidad={entidadSeleccionada}
              hideToolbar={true}
              compact={false}
            />

            <CuadroEstrategias
              data={estrategiasData}
              loading={loading}
              modo={modo}
              onCambiarModo={setModo}
              estrategiaSeleccionada={estrategiaSeleccionada}
              onSeleccionarEstrategia={handleSeleccionarEstrategiaDesdeTabla}
              celdaSeleccionada={celdaSeleccionada}
              origenSeleccion={origenSeleccion}
              onSeleccionarEstrategiaTabla={handleSeleccionarEstrategiaDesdeTabla}
              onSeleccionarEstrategiaTorta={handleSeleccionarEstrategiaDesdeTorta}
              onLimpiarSeleccion={handleLimpiarSeleccion}
              periodo={periodoSeleccionado}
              periodos={periodos}
              onPeriodoChange={setPeriodoSeleccionado}
              tipoCliente={tipoCliente}
              onTipoClienteChange={setTipoCliente}
              entidad={entidadSeleccionada}
              hideToolbar={true}
              layout="apilado"
            />
          </div>
        )
      )}

      {pestanaActiva === 'kpis' && (
        <KpisEmpresaView
          periodo={periodoSeleccionado}
          periodos={periodos}
          onPeriodoChange={setPeriodoSeleccionado}
          entidad={entidadSeleccionada}
          onIrAModulo={handleIrAModulo}
        />
      )}

      {pestanaActiva === 'detalle' && (
        <PadronClientes
          periodo={periodoSeleccionado}
          periodos={periodos}
          onPeriodoChange={setPeriodoSeleccionado}
          entidad={entidadSeleccionada}
          hideToolbar={false}
        />
      )}

      {pestanaActiva === 'mapa' && (
        <MapaPeru
          periodo={periodoSeleccionado}
          periodos={periodos}
          onPeriodoChange={setPeriodoSeleccionado}
          entidad={entidadSeleccionada}
          hideToolbar={false}
          onIrAPadron={() => handleIrAModulo('detalle')}
        />
      )}
    </div>
  );
}
