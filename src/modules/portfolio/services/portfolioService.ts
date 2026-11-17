import { httpClient } from '@/shared/lib/httpClient';

export interface MantenimientoResponse {
  activo: boolean;
  mensaje: string;
  fechaActualizacion?: string;
  actualizadoPor?: string;
}

export interface PaletaColoresResponse {
  empresaId: number;
  colores: Record<number, { color: string }>;
}

export interface MatrizCelda {
  fila: number;
  columna: number;
  filaDescripcion: string;
  columnaDescripcion: string;
  estrategia: number;
  estrategiaDescripcion: string;
  cantidad: number;
  saldoTotal: number;
  saldoCliente: number;
}

export interface MatrizResponse {
  filasHeaders: { id: number; descripcion: string }[];
  columnasHeaders: { id: number; descripcion: string }[];
  celdas: MatrizCelda[];
  totalesPorFila: Record<number, { cantidad: number; saldoTotal: number }>;
  totalesPorColumna: Record<number, { cantidad: number; saldoTotal: number }>;
  granTotal: { cantidad: number; saldoTotal: number };
}

export interface EstrategiaItem {
  id: number;
  descripcion: string;
  cantidad: number;
  saldo: number;
  participacionClientes: number;
  participacionSaldo: number;
  color: string;
}

export interface EstrategiasCuadroResponse {
  items: EstrategiaItem[];
  totales: {
    cantidad: number;
    saldo: number;
    participacionClientes: number;
    participacionSaldo: number;
  };
}

export interface ClienteDetalleItem {
  periodo: string;
  documento: string;
  razonSocial: string;
  saldoVigente: number;
  saldoCastigado: number;
  departamento: string;
  provincia: string;
  distrito: string;
  numeroEntidades: string;
  calificacionCliente: string;
  nor: number;
  cpp: number;
  def: number;
  dud: number;
  per: number;
  estrategia: number;
  estrategiaDescripcion: string;
}

export interface DetalleClientesPaginadoResponse {
  data: ClienteDetalleItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DepartamentoEstrategia {
  estrategia: number;
  nombre: string;
  cantidad: number;
  participacion: number;
}

export interface GeografiaItem {
  departamento: string;
  provincia?: string;
  distrito?: string;
  clientes: number;
  exclusivo: number;
  saldo: number;
  deudasVigentes: number;
  deudasCastigadas: number;
  participacionClientes: number;
  participacionMontos: number;
  estrategias?: DepartamentoEstrategia[];
}

export interface GeografiaResponse {
  items: GeografiaItem[];
  totales: {
    clientes: number;
    exclusivo: number;
    saldo: number;
    deudasVigentes: number;
    deudasCastigadas: number;
    participacionClientes: number;
    participacionMontos: number;
  };
}

export interface PortfolioFilterParams {
  periodo?: string;
  entidad?: string;
  tipoCliente?: string;
  estrategia?: number;
}

export async function extraerMensajeErrorDescarga(
  err: unknown,
  porDefecto = 'No se pudo generar ni descargar el archivo solicitado.'
): Promise<string> {
  const axiosErr = err as {
    response?: { data?: Blob | { message?: string | string[] } };
    message?: string;
  };
  const data = axiosErr?.response?.data;
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text) as { message?: string | string[] };
      if (Array.isArray(parsed.message)) return parsed.message.join('. ');
      if (typeof parsed.message === 'string' && parsed.message.trim()) {
        return parsed.message;
      }
    } catch {
      // Ignorar si el blob no contiene JSON
    }
  } else if (data && typeof data === 'object' && 'message' in data) {
    const msg = data.message;
    if (Array.isArray(msg)) return msg.join('. ');
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  if (typeof axiosErr?.message === 'string' && axiosErr.message.trim()) {
    return axiosErr.message;
  }
  return porDefecto;
}

export const portfolioService = {
  async getPeriodos(entidad?: string): Promise<string[]> {
    const res = await httpClient.get<string[]>('/portfolio/periodos', {
      params: entidad && entidad !== 'Todas' ? { entidad } : undefined,
    });
    return res.data;
  },

  async getEntidades(): Promise<string[]> {
    const res = await httpClient.get<string[]>('/portfolio/entidades');
    return res.data;
  },

  async getMatriz(params: PortfolioFilterParams): Promise<MatrizResponse> {
    const res = await httpClient.get<MatrizResponse>('/portfolio/matriz', {
      params,
    });
    return res.data;
  },

  async getEstrategias(
    params: PortfolioFilterParams
  ): Promise<EstrategiasCuadroResponse> {
    const res = await httpClient.get<EstrategiasCuadroResponse>(
      '/portfolio/estrategias',
      { params }
    );
    return res.data;
  },

  async getDetalle(params: {
    periodo?: string;
    entidad?: string;
    estrategia?: number;
    departamento?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<DetalleClientesPaginadoResponse> {
    const res = await httpClient.get<DetalleClientesPaginadoResponse>(
      '/portfolio/detalle',
      { params }
    );
    return res.data;
  },

  async getGeografia(params: {
    periodo?: string;
    entidad?: string;
    departamento?: string;
  }): Promise<GeografiaResponse> {
    const res = await httpClient.get<GeografiaResponse>('/portfolio/geografia', {
      params,
    });
    return res.data;
  },

  async getProvincias(params: {
    periodo?: string;
    entidad?: string;
    departamento: string;
  }): Promise<GeografiaResponse> {
    const res = await httpClient.get<GeografiaResponse>('/portfolio/provincias', {
      params,
    });
    return res.data;
  },

  async getDistritos(params: {
    periodo?: string;
    entidad?: string;
    departamento: string;
    provincia: string;
  }): Promise<GeografiaResponse> {
    const res = await httpClient.get<GeografiaResponse>('/portfolio/distritos', {
      params,
    });
    return res.data;
  },

  async descargarPadronExcel(params: {
    periodo?: string;
    entidad?: string;
    estrategia?: number;
    departamento?: string;
    search?: string;
  }): Promise<void> {
    try {
      const res = await httpClient.get('/portfolio/exportar', {
        params,
        responseType: 'blob',
      });

      const safePeriodo = (params.periodo || 'periodo').replace(/[^a-zA-Z0-9_-]/g, '_');
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `padron_clientes_${safePeriodo}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
    } catch (err: unknown) {
      const msg = await extraerMensajeErrorDescarga(
        err,
        'Error al exportar el padrón de clientes a Excel.'
      );
      throw new Error(msg);
    }
  },

  async descargarArchivoCompleto(params: {
    periodo?: string;
    entidad?: string;
  }): Promise<void> {
    try {
      const res = await httpClient.get('/portfolio/exportar-archivo', {
        params,
        responseType: 'blob',
      });

      const periodo = (params.periodo || '202609').replace(/[^a-zA-Z0-9_-]/g, '_');
      let rawEntidad = params.entidad && params.entidad !== 'Todas' ? params.entidad : '';
      if (!rawEntidad && typeof window !== 'undefined') {
        try {
          const u = JSON.parse(localStorage.getItem('user') || 'null');
          rawEntidad = u?.empresaEsquema || u?.empresaNombre || '';
        } catch {}
      }

      let entidadStr = 'CARTERA';
      if (rawEntidad) {
        const upper = rawEntidad.toUpperCase();
        entidadStr =
          upper.includes('QAPAQ') || upper.includes('QAPAC')
            ? 'QAPAQ'
            : upper
                .replace(/[^A-Z0-9]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_+|_+$/g, '') || 'CARTERA';
      }
      const filename = `${entidadStr}_${periodo}_FILE.xlsx`;

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
    } catch (err: unknown) {
      const msg = await extraerMensajeErrorDescarga(
        err,
        'Error al exportar el archivo consolidado de cartera.'
      );
      throw new Error(msg);
    }
  },

  async descargarCsv(params: {
    periodo?: string;
    entidad?: string;
    estrategia?: number;
    departamento?: string;
    search?: string;
  }): Promise<void> {
    try {
      const res = await httpClient.get('/portfolio/exportar-csv', {
        params,
        responseType: 'blob',
      });

      const safePeriodo = (params.periodo || 'periodo').replace(/[^a-zA-Z0-9_-]/g, '_');
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cartera_detalle_${safePeriodo}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
    } catch (err: unknown) {
      const msg = await extraerMensajeErrorDescarga(
        err,
        'Error al exportar el detalle en CSV.'
      );
      throw new Error(msg);
    }
  },

  async getMantenimiento(): Promise<MantenimientoResponse> {
    const res = await httpClient.get<MantenimientoResponse>('/portfolio/mantenimiento');
    return res.data;
  },

  async setMantenimiento(
    activo: boolean,
    mensaje?: string
  ): Promise<MantenimientoResponse> {
    const res = await httpClient.put<MantenimientoResponse>(
      '/portfolio/mantenimiento',
      { activo, mensaje }
    );
    return res.data;
  },

  async getColores(params?: {
    empresaId?: number;
    entidad?: string;
  }): Promise<PaletaColoresResponse> {
    const res = await httpClient.get<PaletaColoresResponse>('/portfolio/colores', {
      params,
    });
    return res.data;
  },

  async setColores(
    empresaId: number,
    colores: Record<number, { color: string }> | null
  ): Promise<PaletaColoresResponse> {
    const res = await httpClient.put<PaletaColoresResponse>('/portfolio/colores', {
      empresaId,
      colores,
    });
    return res.data;
  },

  async getDashboardGeneralAdmin(periodo?: string): Promise<DashboardGeneralAdminResponse> {
    const res = await httpClient.get<DashboardGeneralAdminResponse>('/portfolio/dashboard-general', {
      params: periodo ? { periodo } : undefined,
    });
    return res.data;
  },
};

export interface DashboardGeneralAdminResponse {
  periodo: string;
  kpis: {
    totalSaldo: number;
    totalClientes: number;
    saldoSano: number;
    saldoCritico: number;
    pctSano: number;
    pctCritico: number;
    totalExclusivos: number;
    totalNoExclusivos: number;
    deudasVigentes: number;
    deudasCastigadas: number;
    totalEmpresasActivas: number;
  };
  comparativaEmpresas: Array<{
    id: number;
    nombre: string;
    esquema: string;
    ruc: string | null;
    estado: string;
    totalClientes: number;
    totalSaldo: number;
    saldoSano: number;
    saldoCritico: number;
    participacionSaldo: number;
    participacionClientes: number;
  }>;
  estrategias: EstrategiaItem[];
  geografia: GeografiaItem[];
  geografiaTotales?: {
    clientes: number;
    exclusivo: number;
    saldo: number;
    deudasVigentes: number;
    deudasCastigadas: number;
    participacionClientes: number;
    participacionMontos: number;
  };
}
