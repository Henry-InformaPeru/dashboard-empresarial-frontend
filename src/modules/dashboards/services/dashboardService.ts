import { httpClient } from '@/shared/lib/httpClient';

export interface DashboardResponseDto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  estado: string;
}

export const dashboardService = {
  // Consume el endpoint GET /dashboards/mis-dashboards
  async getMisDashboards(): Promise<DashboardResponseDto[]> {
    const { data } = await httpClient.get<DashboardResponseDto[]>('/dashboards/mis-dashboards');
    return data;
  },
};