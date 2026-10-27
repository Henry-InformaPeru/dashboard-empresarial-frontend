'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { dashboardService, DashboardResponseDto } from '@/modules/dashboards/services/dashboardService';
import { periodoService, PeriodoResponseDto } from '@/modules/dashboards/services/periodoService';
import { VisorReporte } from '@/modules/dashboards/components/VisorReporte';
import { SelectorPeriodo, etiquetaPeriodo } from '@/modules/dashboards/components/SelectorPeriodo';
import { BotonDescarga } from '@/modules/dashboards/components/BotonDescarga';

function PeriodosContent() {
  const searchParams = useSearchParams();
  const initialDashboardId = searchParams.get('dashboardId');

  const [dashboards, setDashboards] = useState<DashboardResponseDto[]>([]);
  const [selectedDashboardId, setSelectedDashboardId] = useState<number | null>(
    initialDashboardId ? Number(initialDashboardId) : null
  );
  
  const [periodos, setPeriodos] = useState<PeriodoResponseDto[]>([]);
  const [selectedPeriodoStr, setSelectedPeriodoStr] = useState<string | null>(null);
  
  const [loadingDashboards, setLoadingDashboards] = useState(true);
  const [loadingPeriodos, setLoadingPeriodos] = useState(false);
  const [error, setError] = useState('');

  // 1. Cargar dashboards
  useEffect(() => {
    const fetchDashboards = async () => {
      try {
        const data = await dashboardService.getMisDashboards();
        setDashboards(data);
        if (data.length > 0 && !selectedDashboardId) {
          setSelectedDashboardId(data[0].id);
        }
      } catch (err: any) {
        console.error('Error al cargar dashboards:', err);
        setError('No se pudieron cargar los dashboards de la empresa.');
      } finally {
        setLoadingDashboards(false);
      }
    };

    fetchDashboards();
  }, []);

  // 2. Cargar periodos al cambiar de dashboard
  useEffect(() => {
    if (!selectedDashboardId) return;

    const fetchPeriodos = async () => {
      setLoadingPeriodos(true);
      setError('');
      setPeriodos([]);
      setSelectedPeriodoStr(null);

      try {
        const data = await periodoService.getPeriodosPorDashboard(selectedDashboardId);
        setPeriodos(data);
        
        // El más reciente queda seleccionado
        if (data.length > 0) {
          setSelectedPeriodoStr(data[0].periodo);
        }
      } catch (err: any) {
        console.error('Error al cargar periodos:', err);
        setError('No se pudieron cargar los periodos de este reporte o no tienes acceso.');
      } finally {
        setLoadingPeriodos(false);
      }
    };

    fetchPeriodos();
  }, [selectedDashboardId]);

  // El periodo elegido (la lista ya trae el enlace de Power BI y el de descarga de cada periodo).
  // Cambiar de periodo NO recarga el reporte: el periodo se cambia dentro del propio Power BI y, si el enlace es el mismo,
  // la página no lo vuelve a cargar; solo cambian el título y el botón de descarga.
  const periodoActual = periodos.find((p) => p.periodo === selectedPeriodoStr) || null;
  const dashboardActual = dashboards.find((d) => d.id === selectedDashboardId) || null;

  // El vínculo de Power BI es del reporte: aunque el reporte no tenga ningún periodo, el cliente lo ve.
  // Los periodos son opcionales y sirven sobre todo para la descarga de MEGA; uno solo lleva vínculo propio si ese mes usa otro reporte.
  const urlReporte = periodoActual?.urlPowerbi ?? dashboardActual?.urlPowerbi ?? null;

  const currentDashboardNombre = dashboardActual?.nombre.replace(/^Dashboard\s+/i, '');

  return (
    <div className="space-y-4">
      {/* Encabezado Superior Compacto */}
      <div className="bg-white px-4 sm:px-5 py-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1B4589]">
            Reportes y Periodos
          </h2>
          <p className="text-[#231F20] text-xs mt-0.5">
            Visualiza tu reporte interactivo y, si hay periodos disponibles, descarga el archivo del periodo que necesites.
          </p>
        </div>

        {!loadingDashboards && dashboards.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
            {dashboards.length > 1 ? (
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 w-full md:w-auto">
                <span className="text-[11px] font-bold text-[#1B4589] uppercase tracking-wider">DASHBOARD:</span>
                <select
                  value={selectedDashboardId || ''}
                  onChange={(e) => setSelectedDashboardId(Number(e.target.value))}
                  className="flex-1 min-w-0 px-2 py-2 sm:py-1 border border-gray-300 rounded text-base sm:text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-white font-semibold"
                >
                  {dashboards.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre.replace(/^Dashboard\s+/i, '')}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="bg-blue-50/80 border border-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">REPORTE:</span>
                <span className="text-xs font-bold text-[#1B4589]">{currentDashboardNombre}</span>
              </div>
            )}

            {/* Los periodos son opcionales: sin ninguno, solo se ve el reporte */}
            {(loadingPeriodos || periodos.length > 0) && (
              <>
                <SelectorPeriodo
                  periodos={periodos}
                  valor={selectedPeriodoStr}
                  onCambiar={setSelectedPeriodoStr}
                  cargando={loadingPeriodos}
                />

                <BotonDescarga url={periodoActual?.urlMega} />
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[#ED1C24] text-xs font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Visor Principal Optimizado */}
      <div className="bg-white p-3 sm:p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-base text-[#1B4589]">
              {selectedPeriodoStr ? `Reporte del Periodo: ${etiquetaPeriodo(selectedPeriodoStr)}` : `Reporte ${currentDashboardNombre ?? ''}`}
            </h3>
            <p className="text-[11px] text-gray-400">
              {periodos.length > 0 ? 'Visualización interactiva y documentos adjuntos del periodo.' : 'Visualización interactiva del reporte.'}
            </p>
          </div>
        </div>

        {loadingPeriodos ? (
          <div className="flex flex-col items-center justify-center py-24">
            <p className="text-[#1B4589] text-xs font-bold animate-pulse">Cargando reporte interactivo...</p>
          </div>
        ) : urlReporte ? (
          <VisorReporte src={urlReporte} titulo={`Reporte ${currentDashboardNombre ?? ''}`} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-[#E8ECF3] rounded-full flex items-center justify-center text-2xl mb-2 text-[#1B4589]">
              📊
            </div>
            <p className="text-xs font-semibold text-[#231F20]">
              {dashboardActual ? 'Este reporte todavía no tiene un enlace de Power BI disponible.' : 'No hay reportes disponibles para tu empresa.'}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">Comunícate con Informa Perú si crees que es un error.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PeriodosPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-[#1B4589] font-bold">Cargando...</div>}>
      <PeriodosContent />
    </Suspense>
  );
}