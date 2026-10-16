'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { httpClient } from '@/shared/lib/httpClient';

interface EmpresaDto {
  id: number;
  nombre: string;
  ruc: string | null;
  estado: string;
}

interface DashboardAsignadoDto {
  id: number;
  nombre: string;
  codigo: string;
  estado: string;
}

interface PeriodoAdminDto {
  id: number;
  dashboardId: number;
  periodo: string;
  urlPowerbi: string;
  urlMega: string | null;
}

export default function AdminEmpresaPeriodosPage() {
  const params = useParams();
  const empresaId = params.id;

  const [empresa, setEmpresa] = useState<EmpresaDto | null>(null);
  const [selectedDashboardId, setSelectedDashboardId] = useState<number | null>(null);
  const [periodos, setPeriodos] = useState<PeriodoAdminDto[]>([]);
  
  const [loadingEmpresa, setLoadingEmpresa] = useState(true);
  const [loadingPeriodos, setLoadingPeriodos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Campos para nuevo periodo
  const [nuevoPeriodo, setNuevoPeriodo] = useState('');
  const [urlPowerbi, setUrlPowerbi] = useState('');
  const [urlMega, setUrlMega] = useState('');

  // 1. Cargar la información de la Empresa y su Dashboard asociado automáticamente
  useEffect(() => {
    const fetchEmpresaYDashboards = async () => {
      try {
        // Obtenemos los datos de la empresa para mostrar su nombre
        const resEmpresa = await httpClient.get<EmpresaDto>(`/empresas/${empresaId}`);
        setEmpresa(resEmpresa.data);

        // Obtenemos los dashboards de la empresa para capturar el ID de forma interna
        const resDashboards = await httpClient.get<DashboardAsignadoDto[]>(`/empresas/${empresaId}/dashboards`);
        if (resDashboards.data.length > 0) {
          setSelectedDashboardId(resDashboards.data[0].id); // Asignación automática del ID oculto
        } else {
          setError('Esta empresa no tiene un dashboard vinculado para registrar periodos.');
        }
      } catch (err: any) {
        console.error('Error al cargar la información:', err);
        setError('No se pudo obtener la configuración para esta empresa.');
      } finally {
        setLoadingEmpresa(false);
      }
    };

    if (empresaId) fetchEmpresaYDashboards();
  }, [empresaId]);

  // 2. Cargar Periodos del Dashboard obtenido automáticamente
  useEffect(() => {
    if (!selectedDashboardId) return;

    const fetchPeriodos = async () => {
      setLoadingPeriodos(true);
      setError('');
      try {
        const { data } = await httpClient.get<PeriodoAdminDto[]>(`/dashboards/${selectedDashboardId}/periodos`);
        setPeriodos(data);
      } catch (err: any) {
        console.error('Error al cargar periodos:', err);
        setError('No se pudieron obtener los periodos.');
      } finally {
        setLoadingPeriodos(false);
      }
    };

    fetchPeriodos();
  }, [selectedDashboardId]);

  // 3. Registrar un nuevo Periodo usando el ID obtenido automáticamente
  const handleCrearPeriodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDashboardId) {
      setError('No hay un dashboard válido vinculado a esta empresa.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      await httpClient.post(`/dashboards/${selectedDashboardId}/periodos`, {
        periodo: nuevoPeriodo,
        urlPowerbi,
        urlMega: urlMega || null,
      });

      setSuccessMsg('¡Periodo y enlaces asignados exitosamente!');
      setNuevoPeriodo('');
      setUrlPowerbi('');
      setUrlMega('');

      // Recargar la lista de periodos
      const { data } = await httpClient.get<PeriodoAdminDto[]>(`/dashboards/${selectedDashboardId}/periodos`);
      setPeriodos(data);
    } catch (err: any) {
      console.error('Error al crear periodo:', err);
      setError(err.response?.data?.message || 'Error al guardar el periodo en el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="bg-white px-6 py-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B4589]">
            Gestión de Periodos y Enlaces
          </h2>
          <p className="text-gray-500 text-xs mt-0.5">
            Administra los enlaces de PowerBI y descargas asignados por periodo a esta empresa.
          </p>
        </div>
        <a
          href="/admin/empresas"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#1B4589] font-bold text-xs rounded-lg transition-all"
        >
          ← Volver a Empresas
        </a>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-[#ED1C24] text-xs font-medium">
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs font-medium">
          ✅ {successMsg}
        </div>
      )}

      {/* Identificador de Empresa (Reemplazo visual del desplegable, manteniendo la lógica del ID) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
        <span className="text-xs font-bold text-[#1B4589] uppercase tracking-wider">EMPRESA:</span>
        <span className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-[#231F20]">
          {loadingEmpresa ? 'Cargando...' : empresa?.nombre || 'Empresa No Encontrada'} {empresa?.ruc ? `(RUC: ${empresa.ruc})` : ''}
        </span>
      </div>

      {/* Formulario de Nuevo Periodo */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-sm text-[#1B4589] mb-4">
          Asignar Nuevo Periodo y Enlaces
        </h3>

        <form onSubmit={handleCrearPeriodo} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-[#231F20] mb-1">
              Periodo (AAAAMM)
            </label>
            <input
              type="text"
              placeholder="Ej: 202610"
              value={nuevoPeriodo}
              onChange={(e) => setNuevoPeriodo(e.target.value)}
              required
              maxLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-gray-50/50 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#231F20] mb-1">
              Link PowerBI
            </label>
            <input
              type="url"
              placeholder="https://app.powerbi.com/..."
              value={urlPowerbi}
              onChange={(e) => setUrlPowerbi(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-gray-50/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#231F20] mb-1">
              Link Descarga (Mega)
            </label>
            <input
              type="url"
              placeholder="https://mega.nz/..."
              value={urlMega}
              onChange={(e) => setUrlMega(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-gray-50/50"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting || !selectedDashboardId}
              className="w-full py-2 bg-[#1B4589] hover:bg-[#143468] text-white font-bold text-xs rounded-lg transition-all shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : '+ Registrar Periodo'}
            </button>
          </div>
        </form>
      </div>

      {/* Tabla de Periodos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-sm text-[#1B4589]">
            Periodos Registrados ({periodos.length})
          </h3>
        </div>

        {loadingPeriodos ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-[#1B4589] text-xs font-bold animate-pulse">Cargando periodos...</p>
          </div>
        ) : periodos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-6">Periodo</th>
                  <th className="py-3 px-6">PowerBI URL</th>
                  <th className="py-3 px-6">Mega URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-[#231F20]">
                {periodos.map((p) => (
                  <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-[#1B4589]">
                      {p.periodo}
                    </td>
                    <td className="py-4 px-6 text-gray-600 truncate max-w-xs">
                      <a href={p.urlPowerbi} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {p.urlPowerbi}
                      </a>
                    </td>
                    <td className="py-4 px-6 text-gray-600 truncate max-w-xs">
                      {p.urlMega ? (
                        <a href={p.urlMega} target="_blank" rel="noopener noreferrer" className="text-[#ED1C24] hover:underline">
                          {p.urlMega}
                        </a>
                      ) : (
                        <span className="text-gray-400 italic">Sin enlace</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-xs font-semibold text-gray-500">No hay periodos registrados para esta empresa.</p>
          </div>
        )}
      </div>
    </div>
  );
}