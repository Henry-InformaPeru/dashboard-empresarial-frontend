'use client';

import { useEffect, useState } from 'react';
import { empresaService, EmpresaDto } from '@/modules/empresas/services/empresaService';
import { httpClient } from '@/shared/lib/httpClient';

export default function EmpresasAdminPage() {
  const [empresas, setEmpresas] = useState<EmpresaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Estados para el Modal de Nueva Empresa
  const [showModal, setShowModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const [ruc, setRuc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Limpiar formulario y cerrar modal
  const limpiarFormulario = () => {
    setNombre('');
    setRuc('');
    setError('');
  };

  const handleCerrarModal = () => {
    setShowModal(false);
    limpiarFormulario();
  };

  const fetchEmpresas = async () => {
    try {
      setLoading(true);
      const data = await empresaService.listarEmpresas();
      // Ordenar de más reciente a más antiguo (DESC según ID)
      const empresasOrdenadas = (data || []).sort((a, b) => b.id - a.id);
      setEmpresas(empresasOrdenadas);
    } catch (err: any) {
      console.error('Error al cargar empresas:', err);
      setError('No se pudo cargar la lista de empresas desde el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpresas();
  }, []);

  // Crear Empresa
  const handleCrearEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      await httpClient.post('/empresas', {
        nombre: nombre.trim(),
        ruc: ruc.trim() || null,
      });

      setSuccessMsg('¡Empresa creada correctamente!');
      handleCerrarModal();
      fetchEmpresas();
    } catch (err: any) {
      console.error('Error al crear empresa:', err);
      setError(err.response?.data?.message || 'Error al registrar la empresa.');
    } finally {
      setSubmitting(false);
    }
  };

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
      <div className="bg-white px-4 sm:px-6 py-4 sm:py-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B4589]">
            Gestión de Empresas
          </h2>
          <p className="text-gray-500 text-xs mt-0.5">
            Administra y supervisa las empresas clientes registradas en la plataforma global.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
          {/* Buscador rápido */}
          <input
            type="text"
            placeholder="Buscar por nombre o RUC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-base sm:text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-gray-50/50"
          />

          <button
            onClick={() => {
              limpiarFormulario();
              setShowModal(true);
            }}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 bg-[#1B4589] hover:bg-[#143468] text-white font-bold text-xs rounded-lg transition-all shadow-sm whitespace-nowrap"
          >
            + Nueva Empresa
          </button>
        </div>
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

      {/* Modal para Crear Empresa */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-[#1B4589]">Registrar Nueva Empresa</h3>
              <button
                onClick={handleCerrarModal}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearEmpresa} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#231F20] mb-1">Nombre de la Empresa</label>
                <input
                  type="text"
                  placeholder="Ej: Empresa S.A.C."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  maxLength={200}
                  className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-base sm:text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-gray-50/50 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#231F20] mb-1">RUC (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: 20123456789"
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  maxLength={11}
                  className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-base sm:text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-gray-50/50 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={handleCerrarModal}
                  className="min-h-[44px] sm:min-h-0 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] sm:min-h-0 px-4 py-2 bg-[#1B4589] hover:bg-[#143468] text-white font-bold text-xs rounded-lg transition-all shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Crear Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla de Empresas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col justify-between">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
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
            <div className="hidden md:block overflow-x-auto">
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
                            href={`/admin/empresas/${empresa.id}/periodos`}
                            className="px-3 py-1.5 bg-[#1B4589] hover:bg-[#143468] text-white font-bold text-[11px] rounded-lg transition-all"
                          >
                            Ver Periodos
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Celular: una tarjeta por empresa */}
            <div className="md:hidden divide-y divide-gray-100">
              {empresasPaginadas.map((empresa) => {
                const isActive = empresa.estado?.toUpperCase() === 'ACTIVO';
                return (
                  <div key={empresa.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-[#1B4589] text-sm break-words">{empresa.nombre}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          RUC: <span className="font-mono">{empresa.ruc || 'S/N'}</span> · {new Date(empresa.fechaCreacion).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                          isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {empresa.estado}
                      </span>
                    </div>
                    <a
                      href={`/admin/empresas/${empresa.id}/periodos`}
                      className="flex items-center justify-center min-h-[44px] w-full bg-[#1B4589] hover:bg-[#143468] active:bg-[#143468] text-white font-bold text-xs rounded-lg transition-all"
                    >
                      Ver Periodos
                    </a>
                  </div>
                );
              })}
            </div>

            {/* Paginador Inferior */}
            <div className="px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500">
                Página <strong className="text-[#1B4589]">{currentPage}</strong> de <strong className="text-[#1B4589]">{totalPages}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="min-h-[44px] sm:min-h-0 px-4 sm:px-3 py-2 sm:py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-[#1B4589] disabled:opacity-40 hover:bg-gray-100 transition-all shadow-sm"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="min-h-[44px] sm:min-h-0 px-4 sm:px-3 py-2 sm:py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-[#1B4589] disabled:opacity-40 hover:bg-gray-100 transition-all shadow-sm"
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