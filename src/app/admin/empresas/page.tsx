'use client';

import { useEffect, useState } from 'react';
import { empresaService, EmpresaDto } from '@/modules/empresas/services/empresaService';

export default function EmpresasAdminPage() {
  const [empresas, setEmpresas] = useState<EmpresaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const data = await empresaService.listarEmpresas();
        setEmpresas(data);
      } catch (err: any) {
        console.error('Error al cargar empresas:', err);
        setError('No se pudo cargar la lista de empresas desde el servidor.');
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresas();
  }, []);

  // Filtrar por nombre o RUC
  const empresasFiltradas = empresas.filter(
    (e) =>
      e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.ruc && e.ruc.includes(searchTerm))
  );

  // Lógica de Paginación (10 por hoja)
  const totalPages = Math.ceil(empresasFiltradas.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const empresasPaginadas = empresasFiltradas.slice(startIndex, startIndex + pageSize);

  // Resetear a la página 1 si cambia el término de búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-white px-6 py-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B4589]">
            Gestión de Empresas
          </h2>
          <p className="text-gray-500 text-xs mt-0.5">
            Administra y supervisa las empresas clientes registradas en la plataforma global.
          </p>
        </div>

        {/* Buscador rápido */}
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Buscar por nombre o RUC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-gray-50/50"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-[#ED1C24] text-xs font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Tabla de Empresas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col justify-between">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#1B4589]">
            Empresas Registradas ({empresasFiltradas.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <p className="text-[#1B4589] text-xs font-bold animate-pulse">Cargando empresas...</p>
          </div>
        ) : empresasPaginadas.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Empresa</th>
                    <th className="py-3 px-6">RUC</th>
                    <th className="py-3 px-6">Estado</th>
                    <th className="py-3 px-6">Fecha Creación</th>
                    <th className="py-3 px-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-[#231F20]">
                  {empresasPaginadas.map((empresa) => {
                    const isActive = empresa.estado?.toUpperCase() === 'ACTIVO';
                    return (
                      <tr key={empresa.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-4 px-6 font-bold text-[#1B4589]">
                          {empresa.nombre}
                        </td>
                        <td className="py-4 px-6 font-mono text-gray-600">
                          {empresa.ruc || 'S/N'}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {empresa.estado}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-500">
                          {new Date(empresa.fechaCreacion).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <a
                            href={`/admin/empresas/${empresa.id}/dashboards`}
                            className="px-3 py-1.5 bg-[#1B4589] hover:bg-[#143468] text-white font-semibold rounded-lg shadow-sm transition-all text-[11px]"
                          >
                            Ver Dashboards
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginador Inferior */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Página <strong className="text-[#1B4589]">{currentPage}</strong> de <strong className="text-[#1B4589]">{totalPages}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-[#1B4589] disabled:opacity-40 hover:bg-gray-100 transition-all shadow-sm"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-[#1B4589] disabled:opacity-40 hover:bg-gray-100 transition-all shadow-sm"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-[#E8ECF3] rounded-full flex items-center justify-center text-2xl mb-2 text-[#1B4589]">
              🏢
            </div>
            <p className="text-xs font-semibold text-[#231F20]">No se encontraron empresas registradas.</p>
          </div>
        )}
      </div>
    </div>
  );
}