'use client';

import { useEffect, useState } from 'react';
import { httpClient } from '@/shared/lib/httpClient';

interface UsuarioDto {
  id: number;
  empresaId: number | null;
  rolId: number | null;
  username: string;
  email: string | null;
  nombreCompleto: string | null;
  estado: string;
  fechaCreacion: Date;
}

interface EmpresaDto {
  id: number;
  nombre: string;
  ruc: string | null;
}

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioDto[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Buscador y Paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Estados del formulario de nuevo usuario
  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [rolId, setRolId] = useState<number>(2); // Por defecto cliente
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Función para limpiar el formulario
  const limpiarFormulario = () => {
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setNombreCompleto('');
    setEmail('');
    setRolId(2);
    setEmpresaId(null);
    setError('');
  };

  // Manejar apertura y cierre del modal de forma limpia
  const handleCerrarModal = () => {
    setShowModal(false);
    limpiarFormulario();
  };

  // Cargar usuarios y empresas ordenados del más reciente al más antiguo
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resUsuarios, resEmpresas] = await Promise.all([
        httpClient.get<{ usuarios: UsuarioDto[] }>('/usuarios'),
        httpClient.get<EmpresaDto[]>('/empresas'),
      ]);

      // Ordenar de más reciente a más antiguo (DESC según ID)
      const usuariosOrdenados = (resUsuarios.data.usuarios || []).sort(
        (a, b) => b.id - a.id
      );

      setUsuarios(usuariosOrdenados);
      setEmpresas(resEmpresas.data);
    } catch (err: any) {
      console.error('Error al cargar datos:', err);
      setError('No se pudo obtener la información de usuarios o empresas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtrado de usuarios por término de búsqueda
  const usuariosFiltrados = usuarios.filter((u) => {
    const term = searchTerm.toLowerCase();
    const matchUsername = u.username.toLowerCase().includes(term);
    const matchNombre = u.nombreCompleto?.toLowerCase().includes(term) ?? false;
    const matchEmail = u.email?.toLowerCase().includes(term) ?? false;
    return matchUsername || matchNombre || matchEmail;
  });

  // Lógica de Paginación
  const totalPages = Math.ceil(usuariosFiltrados.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const usuariosPaginados = usuariosFiltrados.slice(startIndex, startIndex + pageSize);

  // Resetear a la página 1 si cambia la búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Crear usuario
  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      await httpClient.post('/usuarios', {
        username,
        password,
        nombreCompleto: nombreCompleto || null,
        email: email || null,
        rolId: Number(rolId),
        empresaId: Number(rolId) === 2 ? Number(empresaId) : null,
      });

      setSuccessMsg('¡Usuario creado correctamente!');
      handleCerrarModal();
      fetchData();
    } catch (err: any) {
      console.error('Error al crear usuario:', err);
      setError(err.response?.data?.message || 'Error al registrar el usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  // Cambiar estado (Activo / Inactivo)
  const handleCambiarEstado = async (id: number, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    try {
      await httpClient.patch(`/usuarios/${id}/estado`, { estado: nuevoEstado });
      setSuccessMsg(`Estado actualizado a ${nuevoEstado}`);
      fetchData();
    } catch (err: any) {
      console.error('Error al cambiar estado:', err);
      setError('No se pudo actualizar el estado del usuario.');
    }
  };

  // Obtener nombre de la empresa vinculada
  const obtenerNombreEmpresa = (idEmpresa: number | null) => {
    if (!idEmpresa) return 'N/A (Administrador)';
    const empresa = empresas.find((e) => e.id === idEmpresa);
    return empresa ? empresa.nombre : `Empresa ID: ${idEmpresa}`;
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="bg-white px-4 sm:px-6 py-4 sm:py-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B4589]">Gestión de Usuarios</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            Administra las cuentas de acceso de los clientes (empresas) y administradores del sistema.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
          {/* Buscador */}
          <input
            type="text"
            placeholder="Buscar por usuario, nombre o email..."
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
            + Nuevo Usuario
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

      {/* Modal para Crear Usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-[#1B4589]">Registrar Nuevo Usuario</h3>
              <button
                onClick={handleCerrarModal}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearUsuario} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#231F20] mb-1">Rol de Usuario</label>
                <select
                  value={rolId}
                  onChange={(e) => setRolId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-base sm:text-xs font-bold text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-gray-50/50"
                >
                  <option value={2}>Cliente (Empresa)</option>
                  <option value={1}>Administrador Global</option>
                </select>
              </div>

              {rolId === 2 && (
                <div>
                  <label className="block text-xs font-medium text-[#231F20] mb-1">Empresa Asociada</label>
                  <select
                    value={empresaId || ''}
                    onChange={(e) => setEmpresaId(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-base sm:text-xs font-bold text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-gray-50/50"
                  >
                    <option value="">Seleccione una empresa...</option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nombre} {emp.ruc ? `(RUC: ${emp.ruc})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#231F20] mb-1">Nombre de Usuario (Username)</label>
                <input
                  type="text"
                  placeholder="Ej: empresa_admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-base sm:text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-gray-50/50 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#231F20] mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={nombreCompleto}
                    onChange={(e) => setNombreCompleto(e.target.value)}
                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-base sm:text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-gray-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#231F20] mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="correo@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-base sm:text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-gray-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#231F20] mb-1">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mín. 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3 py-2.5 sm:py-2 pr-10 border border-gray-300 rounded-lg text-base sm:text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-gray-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Mín. 6 caracteres, incluir mayúscula, minúscula, número y símbolo.
                </p>
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
                  {submitting ? 'Guardando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col justify-between">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-sm text-[#1B4589]">
            Usuarios Registrados ({usuariosFiltrados.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-[#1B4589] text-xs font-bold animate-pulse">Cargando usuarios...</p>
          </div>
        ) : usuariosPaginados.length > 0 ? (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Usuario / Nombre</th>
                    <th className="py-3 px-6">Rol</th>
                    <th className="py-3 px-6">Empresa Vinculada</th>
                    <th className="py-3 px-6">Estado</th>
                    <th className="py-3 px-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-[#231F20]">
                  {usuariosPaginados.map((u) => {
                    const isActive = u.estado?.toUpperCase() === 'ACTIVO';
                    const isCliente = u.rolId === 2;
                    return (
                      <tr key={u.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold font-mono text-[#1B4589]">{u.username}</div>
                          <div className="text-gray-400 text-[11px]">{u.nombreCompleto || u.email || 'Sin datos adicionales'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${isCliente ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                            {isCliente ? 'CLIENTE' : 'ADMINISTRADOR'}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-semibold text-gray-700">
                          {obtenerNombreEmpresa(u.empresaId)}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {u.estado}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleCambiarEstado(u.id, u.estado)}
                            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
                              isActive
                                ? 'bg-red-50 text-[#ED1C24] hover:bg-red-100 border border-red-200'
                                : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                            }`}
                          >
                            {isActive ? 'Desactivar' : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Celular: una tarjeta por usuario */}
            <div className="md:hidden divide-y divide-gray-100">
              {usuariosPaginados.map((u) => {
                const isActive = u.estado?.toUpperCase() === 'ACTIVO';
                const isCliente = u.rolId === 2;
                return (
                  <div key={u.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold font-mono text-[#1B4589] text-sm break-all">{u.username}</p>
                        <p className="text-[11px] text-gray-400 break-words">{u.nombreCompleto || u.email || 'Sin datos adicionales'}</p>
                      </div>
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                          isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {u.estado}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          isCliente ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {isCliente ? 'CLIENTE' : 'ADMINISTRADOR'}
                      </span>
                      <span className="font-semibold text-gray-700 break-words">{obtenerNombreEmpresa(u.empresaId)}</span>
                    </div>
                    <button
                      onClick={() => handleCambiarEstado(u.id, u.estado)}
                      className={`w-full min-h-[44px] rounded-lg font-bold text-xs transition-all ${
                        isActive
                          ? 'bg-red-50 text-[#ED1C24] hover:bg-red-100 border border-red-200'
                          : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                      }`}
                    >
                      {isActive ? 'Desactivar' : 'Activar'}
                    </button>
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
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-xs font-semibold text-gray-500">No se encontraron usuarios.</p>
          </div>
        )}
      </div>
    </div>
  );
}