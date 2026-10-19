import { httpClient } from '@/shared/lib/httpClient';

export interface PeriodoResponseDto {
  id: number;
  dashboardId: number;
  periodo: string; // Formato YYYYMM (ej. 202610)
  urlPowerbi: string;
  urlMega: string | null;
}

export interface EnlacesPeriodoResponseDto {
  id: number;
  dashboardId: number;
  periodo: string;
  urlPowerbi: string;
  urlMega: string | null;
}

export const periodoService = {
  // GET /dashboards/:dashboardId/periodos
  async getPeriodosPorDashboard(dashboardId: number): Promise<PeriodoResponseDto[]> {
    const { data } = await httpClient.get<PeriodoResponseDto[]>(`/dashboards/${dashboardId}/periodos`);
    return data;
  },

  // GET /dashboards/:dashboardId/periodos/:periodo
  async getEnlacesPeriodo(dashboardId: number, periodo: string): Promise<EnlacesPeriodoResponseDto> {
    const { data } = await httpClient.get<EnlacesPeriodoResponseDto>(`/dashboards/${dashboardId}/periodos/${periodo}`);
    return data;
  },
};