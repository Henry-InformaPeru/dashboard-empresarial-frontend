import { httpClient } from '@/shared/lib/httpClient';

export interface DashboardResponseDto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  estado: string;
  urlPowerbi: string | null; // vínculo de Power BI del reporte (el mismo para todos sus periodos)
}

export const dashboardService = {
  // Consume el endpoint GET /dashboards/mis-dashboards
  async getMisDashboards(): Promise<DashboardResponseDto[]> {
    const { data } = await httpClient.get<DashboardResponseDto[]>('/dashboards/mis-dashboards');
    return data;
  },
};