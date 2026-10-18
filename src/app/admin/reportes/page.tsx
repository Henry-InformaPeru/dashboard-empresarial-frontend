'use client';

import { useEffect, useState } from 'react';
import { httpClient } from '@/shared/lib/httpClient';
import { empresaService, EmpresaDto } from '@/modules/empresas/services/empresaService';

interface DashboardEmpresaDto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  estado: string;
  asignacion: { estado: string };
}

// GET /dashboards/:id/periodos devuelve también los enlaces (el administrador los ve todos)
interface PeriodoAdminDto {
  id: number;
  dashboardId: number;
  periodo: string; // AAAAMM
  urlPowerbi: string;
  urlMega: string | null;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const formatPeriodoLabel = (periodo: string) => {
  if (!periodo || periodo.length !== 6) return periodo;
  const mes = parseInt(periodo.substring(4, 6), 10);
  return `${MESES[mes - 1] || mes} ${periodo.substring(0, 4)}`;
};

const quitarPrefijo = (nombre: string) => nombre.replace(/^Dashboard\s+/i, '');

export default function AdminReportesPage() {
  const [empresas, setEmpresas] = useState<EmpresaDto[]>([]);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [dashboards, setDashboards] = useState<DashboardEmpresaDto[]>([]);
  const [dashboardId, setDashboardId] = useState<number | null>(null);
  const [periodos, setPeriodos] = useState<PeriodoAdminDto[]>([]);
  const [anio, setAnio] = useState('');
  const [periodo, setPeriodo] = useState<string | null>(null);

  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [loadingDashboards, setLoadingDashboards] = useState(false);
  const [loadingPeriodos, setLoadingPeriodos] = useState(false);
  const [error, setError] = useState('');

  // 1. Empresas (por nombre)
  useEffect(() => {
    let vigente = true;
    empresaService
      .listarEmpresas()
      .then((data) => {
        if (vigente) setEmpresas([...(data || [])].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      })
      .catch(() => {
        if (vigente) setError('No se pudo cargar la lista de empresas.');
      })
      .finally(() => {
        if (vigente) setLoadingEmpresas(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  // 2. Dashboards de la empresa elegida (los reinicios se hacen en elegirEmpresa)
  useEffect(() => {
    if (!empresaId) return;

    let vigente = true;
    httpClient
      .get<DashboardEmpresaDto[]>(`/empresas/${empresaId}/dashboards`)
      .then(({ data }) => {
        if (!vigente) return;
        setDashboards(data);
        const activo = data.find((d) => d.estado === 'ACTIVO' && d.asignacion.estado === 'ACTIVO');
        const elegido = activo || data[0];
        if (elegido) {
          setLoadingPeriodos(true);
          setDashboardId(elegido.id);
        }
      })
      .catch(() => {
        if (vigente) setError('No se pudieron cargar los dashboards de esta empresa.');
      })
      .finally(() => {
        if (vigente) setLoadingDashboards(false);
      });
    return () => {
      vigente = false;
    };
  }, [empresaId]);

  // 3. Periodos del dashboard elegido (el más reciente queda seleccionado)
  useEffect(() => {
    if (!dashboardId) return;

    let vigente = true;
    httpClient
      .get<PeriodoAdminDto[]>(`/dashboards/${dashboardId}/periodos`)
      .then(({ data }) => {
        if (!vigente) return;
        const ordenados = [...data].sort((a, b) => b.periodo.localeCompare(a.periodo));
        setPeriodos(ordenados);
        if (ordenados.length > 0) {
          setAnio(ordenados[0].periodo.substring(0, 4));
          setPeriodo(ordenados[0].periodo);
        }
      })
      .catch(() => {
        if (vigente) setError('No se pudieron cargar los periodos de este dashboard.');
      })
      .finally(() => {
        if (vigente) setLoadingPeriodos(false);
      });
    return () => {
      vigente = false;
    };
  }, [dashboardId]);

  const aniosDisponibles = Array.from(new Set(periodos.map((p) => p.periodo.substring(0, 4))));
  const periodosDelAnio = periodos.filter((p) => p.periodo.startsWith(anio));
  const periodoActual = periodos.find((p) => p.periodo === periodo) || null;
  const dashboardActual = dashboards.find((d) => d.id === dashboardId) || null;
  const empresaActual = empresas.find((e) => e.id === empresaId) || null;
  const dashboardInactivo =
    !!dashboardActual && (dashboardActual.estado !== 'ACTIVO' || dashboardActual.asignacion.estado !== 'ACTIVO');

  const elegirEmpresa = (id: number | null) => {
    setEmpresaId(id);
    setDashboards([]);
    setDashboardId(null);
    setPeriodos([]);
    setAnio('');
    setPeriodo(null);
    setError('');
    setLoadingDashboards(id !== null);
  };

  const elegirDashboard = (id: number) => {
    setDashboardId(id);
    setPeriodos([]);
    setAnio('');
    setPeriodo(null);
    setError('');
    setLoadingPeriodos(true);
  };

  const elegirAnio = (nuevo: string) => {
    setAnio(nuevo);
    const primero = periodos.find((p) => p.periodo.startsWith(nuevo));
    if (primero) setPeriodo(primero.periodo);
  };

  return (
    <div className="space-y-4">
      {/* Encabezado y selectores */}
      <div className="bg-white px-5 py-4 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1B4589]">Reportes y Periodos</h2>
          <p className="text-[#231F20] text-xs mt-0.5">
            Elige una empresa y un periodo para ver su reporte, tal como lo ve el cliente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <span className="text-[11px] font-bold text-[#1B4589] uppercase tracking-wider">EMPRESA:</span>
            <select
              value={empresaId ?? ''}
              onChange={(e) => elegirEmpresa(e.target.value ? Number(e.target.value) : null)}
              disabled={loadingEmpresas}
              className="px-2 py-1 border border-gray-300 rounded text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-white font-semibold max-w-[220px]"
            >
              <option value="">{loadingEmpresas ? 'Cargando...' : 'Selecciona una empresa'}</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                  {e.estado !== 'ACTIVO' ? ' (inactiva)' : ''}
                </option>
              ))}
            </select>
          </div>

          {dashboards.length > 1 && (
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <span className="text-[11px] font-bold text-[#1B4589] uppercase tracking-wider">DASHBOARD:</span>
              <select
                value={dashboardId ?? ''}
                onChange={(e) => elegirDashboard(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-white font-semibold max-w-[220px]"
              >
                {dashboards.map((d) => (
                  <option key={d.id} value={d.id}>
                    {quitarPrefijo(d.nombre)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[#ED1C24] text-xs font-medium">
          ⚠️ {error}
        </div>
      )}

      {dashboardInactivo && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-xs font-medium">
          Este dashboard o su asignación a la empresa está inactivo: el cliente no lo ve, pero tú sí.
        </div>
      )}

      {/* Año y periodo */}
      {periodos.length > 0 && (
        <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100 space-y-2">
          {aniosDisponibles.length > 1 && (
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 overflow-x-auto">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 px-1">AÑO:</span>
              <div className="flex items-center gap-1.5">
                {aniosDisponibles.map((a) => (
                  <button
                    key={a}
                    onClick={() => elegirAnio(a)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      anio === a ? 'bg-[#1B4589] text-white shadow-sm' : 'bg-gray-100 text-[#231F20] hover:bg-gray-200'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 px-1">PERIODOS:</span>
            <div className="flex items-center gap-1.5">
              {periodosDelAnio.map((p) => {
                const seleccionado = periodo === p.periodo;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPeriodo(p.periodo)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      seleccionado ? 'bg-[#1B4589] text-white shadow-sm' : 'bg-gray-100 text-[#231F20] hover:bg-gray-200'
                    }`}
                  >
                    <span>{formatPeriodoLabel(p.periodo).split(' ')[0]}</span>
                    <span
                      className={`text-[10px] px-1 rounded font-mono ${
                        seleccionado ? 'bg-white/20 text-white' : 'bg-white text-gray-500 border border-gray-200'
                      }`}
                    >
                      {p.periodo}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Visor */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-base text-[#1B4589]">
              {periodoActual
                ? `${empresaActual?.nombre ?? ''} · ${formatPeriodoLabel(periodoActual.periodo)}`
                : 'Selecciona una empresa y un periodo'}
            </h3>
            <p className="text-[11px] text-gray-400">Visualización interactiva y documentos adjuntos del periodo.</p>
          </div>

          {periodoActual?.urlMega && (
            <a
              href={periodoActual.urlMega}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-[#1B4589] hover:bg-[#143468] text-white text-xs font-bold rounded-lg transition-all shadow flex items-center gap-1.5 shrink-0"
            >
              <span>📥</span> Descargar
            </a>
          )}
        </div>

        {loadingDashboards || loadingPeriodos ? (
          <div className="flex flex-col items-center justify-center py-24">
            <p className="text-[#1B4589] text-xs font-bold animate-pulse">Cargando...</p>
          </div>
        ) : periodoActual?.urlPowerbi ? (
          <div className="w-full h-[550px] bg-gray-50 rounded-xl overflow-hidden border border-gray-200 shadow-inner">
            <iframe
              key={periodoActual.id}
              title={`Reporte ${periodoActual.periodo}`}
              src={periodoActual.urlPowerbi}
              className="w-full h-full border-0"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-[#E8ECF3] rounded-full flex items-center justify-center text-2xl mb-2 text-[#1B4589]">
              📊
            </div>
            <p className="text-xs font-semibold text-[#231F20]">
              {!empresaId
                ? 'Elige una empresa para ver sus reportes.'
                : dashboards.length === 0
                  ? 'Esta empresa no tiene dashboards asignados.'
                  : 'Este dashboard no tiene periodos registrados.'}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Los dashboards y periodos se administran en «Gestión de Empresas».
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
