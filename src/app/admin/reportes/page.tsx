'use client';

import { useEffect, useState } from 'react';
import { httpClient } from '@/shared/lib/httpClient';
import { empresaService, EmpresaDto } from '@/modules/empresas/services/empresaService';
import { VisorReporte } from '@/modules/dashboards/components/VisorReporte';
import { SelectorPeriodo } from '@/modules/dashboards/components/SelectorPeriodo';
import { BotonDescarga } from '@/modules/dashboards/components/BotonDescarga';

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
    setPeriodo(null);
    setError('');
    setLoadingDashboards(id !== null);
  };

  const elegirDashboard = (id: number) => {
    setDashboardId(id);
    setPeriodos([]);
    setPeriodo(null);
    setError('');
    setLoadingPeriodos(true);
  };

  return (
    <div className="space-y-4">
      {/* Encabezado y selectores */}
      <div className="bg-white px-4 sm:px-5 py-4 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1B4589]">Reportes y Periodos</h2>
          <p className="text-[#231F20] text-xs mt-0.5">
            Elige una empresa y un periodo para ver su reporte, tal como lo ve el cliente.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 w-full sm:w-auto">
            <span className="text-[11px] font-bold text-[#1B4589] uppercase tracking-wider">EMPRESA:</span>
            <select
              value={empresaId ?? ''}
              onChange={(e) => elegirEmpresa(e.target.value ? Number(e.target.value) : null)}
              disabled={loadingEmpresas}
              className="flex-1 min-w-0 px-2 py-2 sm:py-1 border border-gray-300 rounded text-base sm:text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-white font-semibold sm:max-w-[220px]"
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
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 w-full sm:w-auto">
              <span className="text-[11px] font-bold text-[#1B4589] uppercase tracking-wider">DASHBOARD:</span>
              <select
                value={dashboardId ?? ''}
                onChange={(e) => elegirDashboard(Number(e.target.value))}
                className="flex-1 min-w-0 px-2 py-2 sm:py-1 border border-gray-300 rounded text-base sm:text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-white font-semibold sm:max-w-[220px]"
              >
                {dashboards.map((d) => (
                  <option key={d.id} value={d.id}>
                    {quitarPrefijo(d.nombre)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {empresaId !== null && (
            <SelectorPeriodo
              periodos={periodos}
              valor={periodo}
              onCambiar={setPeriodo}
              cargando={loadingDashboards || loadingPeriodos}
            />
          )}

          <BotonDescarga url={periodoActual?.urlMega} />
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

      {/* Visor */}
      <div className="bg-white p-3 sm:p-5 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-base text-[#1B4589]">
              {periodoActual
                ? `${empresaActual?.nombre ?? ''} · ${formatPeriodoLabel(periodoActual.periodo)}`
                : 'Selecciona una empresa y un periodo'}
            </h3>
            <p className="text-[11px] text-gray-400">Visualización interactiva y documentos adjuntos del periodo.</p>
          </div>
        </div>

        {loadingDashboards || loadingPeriodos ? (
          <div className="flex flex-col items-center justify-center py-24">
            <p className="text-[#1B4589] text-xs font-bold animate-pulse">Cargando...</p>
          </div>
        ) : periodoActual?.urlPowerbi ? (
          <VisorReporte src={periodoActual.urlPowerbi} titulo={`Reporte ${empresaActual?.nombre ?? ''}`} />
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
