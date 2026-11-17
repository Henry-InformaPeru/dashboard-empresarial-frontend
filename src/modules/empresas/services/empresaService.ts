import { httpClient } from '@/shared/lib/httpClient';

export interface EmpresaDto {
  id: number;
  nombre: string;
  ruc: string | null;
  esquema?: string | null;
  logo?: string | null;
  estado: string;
  fechaCreacion: string;
}

export const empresaService = {
  async listarEmpresas(): Promise<EmpresaDto[]> {
    const { data } = await httpClient.get<EmpresaDto[]>('/empresas');
    return data;
  },

  async crearEmpresa(datos: {
    nombre: string;
    ruc?: string | null;
    esquema?: string | null;
    logo?: string | null;
  }): Promise<EmpresaDto> {
    const { data } = await httpClient.post<{ message: string; empresa: EmpresaDto }>('/empresas', datos);
    return data.empresa ?? (data as unknown as EmpresaDto);
  },

  async actualizarEmpresa(
    id: number,
    datos: {
      nombre?: string;
      ruc?: string | null;
      esquema?: string | null;
      logo?: string | null;
      estado?: string;
    },
  ): Promise<EmpresaDto> {
    const { data } = await httpClient.patch<{ message: string; empresa: EmpresaDto }>(
      `/empresas/${id}`,
      datos,
    );
    return data.empresa;
  },

  async eliminarEmpresa(id: number): Promise<void> {
    await httpClient.delete(`/empresas/${id}`);
  },
};
