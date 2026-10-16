'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { dashboardService, DashboardResponseDto } from '@/modules/dashboards/services/dashboardService';
import { periodoService, PeriodoResponseDto, EnlacesPeriodoResponseDto } from '@/modules/dashboards/services/periodoService';

function PeriodosContent() {
  const searchParams = useSearchParams();
  const initialDashboardId = searchParams.get('dashboardId');

  const [dashboards, setDashboards] = useState<DashboardResponseDto[]>([]);
  const [selectedDashboardId, setSelectedDashboardId] = useState<number | null>(
    initialDashboardId ? Number(initialDashboardId) : null
  );
  
  const [periodos, setPeriodos] = useState<PeriodoResponseDto[]>([]);
  const [selectedAnio, setSelectedAnio] = useState<string>('');
  const [selectedPeriodoStr, setSelectedPeriodoStr] = useState<string | null>(null);
  
  const [enlaces, setEnlaces] = useState<EnlacesPeriodoResponseDto | null>(null);
  
  const [loadingDashboards, setLoadingDashboards] = useState(true);
  const [loadingPeriodos, setLoadingPeriodos] = useState(false);
  const [loadingEnlaces, setLoadingEnlaces] = useState(false);
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
      setSelectedAnio('');
      setSelectedPeriodoStr(null);
      setEnlaces(null);

      try {
        const data = await periodoService.getPeriodosPorDashboard(selectedDashboardId);
        setPeriodos(data);
        
        if (data.length > 0) {
          const aniosUnicos = Array.from(new Set(data.map(p => p.periodo.substring(0, 4)))).sort().reverse();
          const anioDefault = aniosUnicos[0];
          setSelectedAnio(anioDefault);

          const periodosDelAnio = data.filter(p => p.periodo.startsWith(anioDefault));
          if (periodosDelAnio.length > 0) {
            setSelectedPeriodoStr(periodosDelAnio[0].periodo);
          }
        }
      } catch (err: any) {
        console.error('Error al cargar periodos:', err);
        setError('Este dashboard no cuenta con periodos activos o no tienes acceso.');
      } finally {
        setLoadingPeriodos(false);
      }
    };

    fetchPeriodos();
  }, [selectedDashboardId]);

  const aniosDisponibles = Array.from(new Set(periodos.map(p => p.periodo.substring(0, 4)))).sort().reverse();
  const periodosFiltradosPorAnio = periodos.filter(p => p.periodo.startsWith(selectedAnio));

  // 3. Cargar enlaces
  useEffect(() => {
    if (!selectedDashboardId || !selectedPeriodoStr) return;

    const fetchEnlaces = async () => {
      setLoadingEnlaces(true);
      try {
        const data = await periodoService.getEnlacesPeriodo(selectedDashboardId, selectedPeriodoStr);
        setEnlaces(data);
      } catch (err: any) {
        console.error('Error al cargar enlaces del periodo:', err);
        setError('No se pudieron obtener los enlaces para este periodo.');
      } finally {
        setLoadingEnlaces(false);
      }
    };

    fetchEnlaces();
  }, [selectedDashboardId, selectedPeriodoStr]);

  const formatPeriodoLabel = (periodoStr: string) => {
    if (!periodoStr || periodoStr.length !== 6) return periodoStr;
    const anio = periodoStr.substring(0, 4);
    const mesNum = parseInt(periodoStr.substring(4, 6), 10);
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${meses[mesNum - 1] || mesNum} ${anio}`;
  };

  const currentDashboardNombre = dashboards
    .find(d => d.id === selectedDashboardId)
    ?.nombre.replace(/^Dashboard\s+/i, '');

  return (
    <div className="space-y-4">
      {/* Encabezado Superior Compacto */}
      <div className="bg-white px-5 py-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1B4589]">
            Reportes y Periodos
          </h2>
          <p className="text-[#231F20] text-xs mt-0.5">
            Visualiza los reportes interactivos seleccionando el periodo de tu interés.
          </p>
        </div>

        {!loadingDashboards && dashboards.length > 0 && (
          <div className="flex items-center gap-2">
            {dashboards.length > 1 ? (
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                <span className="text-[11px] font-bold text-[#1B4589] uppercase tracking-wider">DASHBOARD:</span>
                <select
                  value={selectedDashboardId || ''}
                  onChange={(e) => setSelectedDashboardId(Number(e.target.value))}
                  className="px-2 py-1 border border-gray-300 rounded text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-white font-semibold"
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
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[#ED1C24] text-xs font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Selector de Años y Meses Compacto */}
      {periodos.length > 0 && (
        <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100 space-y-2">
          {aniosDisponibles.length > 1 && (
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 overflow-x-auto">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 px-1">
                AÑO:
              </span>
              <div className="flex items-center gap-1.5">
                {aniosDisponibles.map((anio) => {
                  const isAnioSelected = selectedAnio === anio;
                  return (
                    <button
                      key={anio}
                      onClick={() => {
                        setSelectedAnio(anio);
                        const primerMesDelAnio = periodos.find(p => p.periodo.startsWith(anio));
                        if (primerMesDelAnio) {
                          setSelectedPeriodoStr(primerMesDelAnio.periodo);
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                        isAnioSelected
                          ? 'bg-[#1B4589] text-white shadow-sm'
                          : 'bg-gray-100 text-[#231F20] hover:bg-gray-200'
                      }`}
                    >
                      {anio}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 px-1">
              PERIODOS:
            </span>
            <div className="flex items-center gap-1.5">
              {periodosFiltradosPorAnio.map((p) => {
                const isSelected = selectedPeriodoStr === p.periodo;
                const mesNombre = formatPeriodoLabel(p.periodo).split(' ')[0];
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPeriodoStr(p.periodo)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#1B4589] text-white shadow-sm'
                        : 'bg-gray-100 text-[#231F20] hover:bg-gray-200'
                    }`}
                  >
                    <span>{mesNombre}</span>
                    <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${isSelected ? 'bg-white/20 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
                      {p.periodo}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Visor Principal Optimizado */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-base text-[#1B4589]">
              {selectedPeriodoStr ? `Reporte del Periodo: ${formatPeriodoLabel(selectedPeriodoStr)}` : 'Seleccione un periodo'}
            </h3>
            <p className="text-[11px] text-gray-400">Visualización interactiva y documentos adjuntos del periodo.</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {enlaces?.urlMega && (
              <a
                href={enlaces.urlMega}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-[#1B4589] hover:bg-[#143468] text-white text-xs font-bold rounded-lg transition-all shadow flex items-center gap-1.5 shrink-0"
              >
                <span>📥</span> Descargar
              </a>
            )}
          </div>
        </div>

        {loadingEnlaces ? (
          <div className="flex flex-col items-center justify-center py-24">
            <p className="text-[#1B4589] text-xs font-bold animate-pulse">Cargando reporte interactivo...</p>
          </div>
        ) : enlaces && enlaces.urlPowerbi ? (
          <div className="w-full h-[550px] bg-gray-50 rounded-xl overflow-hidden border border-gray-200 shadow-inner">
            <iframe
              title={`Reporte ${enlaces.periodo}`}
              src={enlaces.urlPowerbi}
              className="w-full h-full border-0"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-[#E8ECF3] rounded-full flex items-center justify-center text-2xl mb-2 text-[#1B4589]">
              📊
            </div>
            <p className="text-xs font-semibold text-[#231F20]">No hay un enlace de PowerBI disponible para este periodo.</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Seleccione otro periodo en la barra superior.</p>
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