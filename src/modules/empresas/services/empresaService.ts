import { httpClient } from '@/shared/lib/httpClient';

export interface EmpresaDto {
  id: number;
  nombre: string;
  ruc: string | null;
  estado: string;
  fechaCreacion: string;
}

export const empresaService = {
  async listarEmpresas(): Promise<EmpresaDto[]> {
    const { data } = await httpClient.get<EmpresaDto[]>('/empresas');
    return data;
  },
};