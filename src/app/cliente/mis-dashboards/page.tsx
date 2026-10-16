'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dashboardService, DashboardResponseDto } from '@/modules/dashboards/services/dashboardService';

export default function MisDashboardsPage() {
  const router = useRouter();
  const [dashboards, setDashboards] = useState<DashboardResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usuario, setUsuario] = useState<{ nombreCompleto?: string; empresaId?: number } | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUsuario(JSON.parse(userStr));
      } catch (e) {
        console.error('Error parsing user', e);
      }
    }

    const fetchDashboards = async () => {
      try {
        const data = await dashboardService.getMisDashboards();
        setDashboards(data);
      } catch (err: any) {
        console.error('Error al cargar dashboards:', err);
        if (err.response?.status === 403) {
          setError('No tienes permisos o no cuentas con una empresa asignada.');
        } else {
          setError('Ocurrió un error al cargar los dashboards de tu empresa.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboards();
  }, []);

  const handleSelectDashboard = (dashboardId: number) => {
    router.push(`/cliente/periodos?dashboardId=${dashboardId}`);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Bienvenida sin Empresa ID */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-[#1B4589]">
          Bienvenido, {usuario?.nombreCompleto || 'Usuario'}
        </h2>
        <p className="text-[#231F20] text-sm mt-1">
          Plataforma de consulta e indicadores empresariales de Informa Perú.
        </p>
      </div>

      {/* Indicador de Carga */}
      {loading && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-[#1B4589] font-bold animate-pulse">Cargando reportes asignados...</p>
        </div>
      )}

      {/* Mensaje de Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-[#ED1C24] text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Listado de Dashboards */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboards.length > 0 ? (
            dashboards.map((dash) => (
              <div
                key={dash.id}
                onClick={() => handleSelectDashboard(dash.id)}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-[#1B4589] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between w-full overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="w-12 h-12 bg-[#E8ECF3] rounded-lg flex items-center justify-center text-2xl shrink-0 group-hover:bg-[#1B4589] group-hover:text-white transition-colors">
                      📈
                    </div>
                  </div>

                  <h3 className="font-bold text-[#1B4589] text-base mb-2 group-hover:text-[#143468] break-words">
                    {dash.nombre.replace(/^Dashboard\s+/i, '')}
                  </h3>

                  <p className="text-xs text-gray-500 mb-6 line-clamp-3 break-words">
                    {dash.descripcion || 'Sin descripción disponible para este reporte.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-50 flex items-center justify-between mt-auto">
                  <span className="text-xs font-bold text-[#ED1C24] group-hover:underline flex items-center gap-1">
                    Ver Dashboard <span>→</span>
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    {dash.estado}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 text-sm">
                No hay dashboards disponibles para esta empresa en este momento.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}