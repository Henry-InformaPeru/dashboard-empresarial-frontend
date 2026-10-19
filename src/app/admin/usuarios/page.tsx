'use client';

import { useEffect, useState } from 'react';
import { httpClient } from '@/shared/lib/httpClient';
import { CampoClave } from '@/modules/usuarios/components/CampoClave';
import { claveValida } from '@/modules/usuarios/lib/clave';

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

// Mensaje de error de la API (puede ser un texto o una lista de textos de validación)
const mensajeError = (err: unknown, porDefecto: string): string => {
  const mensaje = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(mensaje)) return mensaje.join('. ');
  return mensaje || porDefecto;
};

// Id de la cuenta con la que se inició sesión (para no ofrecerse eliminar ni desactivar a uno mismo)
const idSesionActual = (): number | null => {
  if (typeof window === 'undefined') return null;
  try {
    const usuario = JSON.parse(localStorage.getItem('user') || 'null');
    return typeof usuario?.id === 'number' ? usuario.id : null;
  } catch {
    return null;
  }
};

const claseInput =
  'w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-base sm:text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-gray-50/50';
const claseBotonSecundario =
  'min-h-[44px] sm:min-h-0 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-lg transition-all';
const claseBotonPrimario =
  'min-h-[44px] sm:min-h-0 px-4 py-2 bg-[#1B4589] hover:bg-[#143468] text-white font-bold text-xs rounded-lg transition-all shadow-sm disabled:opacity-50';

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

  // Nuevo usuario
  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [rolId, setRolId] = useState<number>(2); // Por defecto cliente
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState('');

  // Cambiar contraseña
  const [usuarioClave, setUsuarioClave] = useState<UsuarioDto | null>(null);
  const [nuevaClave, setNuevaClave] = useState('');

  // Eliminar
  const [usuarioEliminar, setUsuarioEliminar] = useState<UsuarioDto | null>(null);

  const miId = idSesionActual();

  const limpiarFormulario = () => {
    setUsername('');
    setPassword('');
    setNombreCompleto('');
    setEmail('');
    setRolId(2);
    setEmpresaId(null);
    setErrorModal('');
  };

  const handleCerrarModal = () => {
    setShowModal(false);
    limpiarFormulario();
  };

  const abrirCambiarClave = (u: UsuarioDto) => {
    setSuccessMsg('');
    setError('');
    setErrorModal('');
    setNuevaClave('');
    setUsuarioClave(u);
  };

  const cerrarCambiarClave = () => {
    setUsuarioClave(null);
    setNuevaClave('');
    setErrorModal('');
  };

  const abrirEliminar = (u: UsuarioDto) => {
    setSuccessMsg('');
    setError('');
    setErrorModal('');
    setUsuarioEliminar(u);
  };

  const cerrarEliminar = () => {
    setUsuarioEliminar(null);
    setErrorModal('');
  };

  // Cargar usuarios y empresas ordenados del más reciente al más antiguo
  // (la primera vez «loading» ya parte en true; las recargas después de una acción son silenciosas)
  const fetchData = async () => {
    try {
      const [resUsuarios, resEmpresas] = await Promise.all([
        httpClient.get<{ usuarios: UsuarioDto[] }>('/usuarios'),
        httpClient.get<EmpresaDto[]>('/empresas'),
      ]);

      const usuariosOrdenados = (resUsuarios.data.usuarios || []).sort((a, b) => b.id - a.id);

      setUsuarios(usuariosOrdenados);
      setEmpresas(resEmpresas.data);
    } catch (err: unknown) {
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

  // Crear usuario
  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorModal('');
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

      setSuccessMsg(`¡Usuario «${username.trim().toLowerCase()}» creado correctamente!`);
      handleCerrarModal();
      fetchData();
    } catch (err: unknown) {
      console.error('Error al crear usuario:', err);
      setErrorModal(mensajeError(err, 'Error al registrar el usuario.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Cambiar la contraseña de un usuario
  const handleCambiarClave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioClave) return;
    setSubmitting(true);
    setErrorModal('');

    try {
      await httpClient.patch(`/usuarios/${usuarioClave.id}/password`, { password: nuevaClave });
      setSuccessMsg(`Contraseña de «${usuarioClave.username}» actualizada. Entrégasela por un medio seguro.`);
      cerrarCambiarClave();
    } catch (err: unknown) {
      console.error('Error al cambiar la contraseña:', err);
      setErrorModal(mensajeError(err, 'No se pudo cambiar la contraseña.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar un usuario
  const handleEliminar = async () => {
    if (!usuarioEliminar) return;
    setSubmitting(true);
    setErrorModal('');

    try {
      await httpClient.delete(`/usuarios/${usuarioEliminar.id}`);
      setSuccessMsg(`Usuario «${usuarioEliminar.username}» eliminado.`);
      cerrarEliminar();
      fetchData();
    } catch (err: unknown) {
      console.error('Error al eliminar el usuario:', err);
      setErrorModal(mensajeError(err, 'No se pudo eliminar el usuario.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Cambiar estado (Activo / Inactivo)
  const handleCambiarEstado = async (id: number, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    setSuccessMsg('');
    setError('');
    try {
      await httpClient.patch(`/usuarios/${id}/estado`, { estado: nuevoEstado });
      setSuccessMsg(`Estado actualizado a ${nuevoEstado}`);
      fetchData();
    } catch (err: unknown) {
      console.error('Error al cambiar estado:', err);
      setError(mensajeError(err, 'No se pudo actualizar el estado del usuario.'));
    }
  };

  // Obtener nombre de la empresa vinculada
  const obtenerNombreEmpresa = (idEmpresa: number | null) => {
    if (!idEmpresa) return 'N/A (Administrador)';
    const empresa = empresas.find((e) => e.id === idEmpresa);
    return empresa ? empresa.nombre : `Empresa ID: ${idEmpresa}`;
  };

  // Botones de acción de un usuario (en tabla y en tarjeta)
  const acciones = (u: UsuarioDto, enTarjeta: boolean) => {
    const isActive = u.estado?.toUpperCase() === 'ACTIVO';
    const esMiCuenta = miId !== null && u.id === miId;
    const base = enTarjeta
      ? 'w-full min-h-[44px] rounded-lg font-bold text-xs transition-all border'
      : 'px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all border';

    return (
      <>
        <button
          onClick={() => abrirCambiarClave(u)}
          className={`${base} bg-blue-50 text-[#1B4589] hover:bg-blue-100 border-blue-200`}
        >
          🔑 Cambiar clave
        </button>
        {esMiCuenta ? (
          <span className={`${enTarjeta ? 'block text-center py-2' : 'px-2'} text-[11px] font-semibold text-gray-400`}>
            Tu cuenta
          </span>
        ) : (
          <>
            <button
              onClick={() => handleCambiarEstado(u.id, u.estado)}
              className={`${base} ${
                isActive
                  ? 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100 border-yellow-200'
                  : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
              }`}
            >
              {isActive ? 'Desactivar' : 'Activar'}
            </button>
            <button
              onClick={() => abrirEliminar(u)}
              className={`${base} bg-red-50 text-[#ED1C24] hover:bg-red-100 border-red-200`}
            >
              🗑 Eliminar
            </button>
          </>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="bg-white px-4 sm:px-6 py-4 sm:py-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B4589]">Gestión de Usuarios</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            Crea cuentas, cambia contraseñas, activa, desactiva o elimina usuarios (clientes y administradores).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Buscar por usuario, nombre o email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // al buscar se vuelve a la primera hoja
            }}
            className="w-full md:w-64 px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-base sm:text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-gray-50/50"
          />

          <button
            onClick={() => {
              limpiarFormulario();
              setSuccessMsg('');
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

      {/* Modal: nuevo usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-[#1B4589]">Registrar Nuevo Usuario</h3>
              <button
                onClick={handleCerrarModal}
                aria-label="Cerrar"
                className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {errorModal && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[#ED1C24] text-xs font-medium">
                ⚠️ {errorModal}
              </div>
            )}

            <form onSubmit={handleCrearUsuario} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#231F20] mb-1">Rol de Usuario</label>
                <select
                  value={rolId}
                  onChange={(e) => setRolId(Number(e.target.value))}
                  className={`${claseInput} font-bold`}
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
                    className={`${claseInput} font-bold`}
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
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className={`${claseInput} font-mono`}
                />
                <p className="text-[10px] text-gray-400 mt-1">Se guarda en minúsculas.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#231F20] mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={nombreCompleto}
                    onChange={(e) => setNombreCompleto(e.target.value)}
                    className={claseInput}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#231F20] mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="correo@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={claseInput}
                  />
                </div>
              </div>

              <CampoClave id="clave-nuevo-usuario" valor={password} onCambiar={setPassword} />

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={handleCerrarModal} className={claseBotonSecundario}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting || !claveValida(password)} className={claseBotonPrimario}>
                  {submitting ? 'Guardando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: cambiar contraseña */}
      {usuarioClave && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-[#1B4589]">Cambiar contraseña</h3>
              <button
                onClick={cerrarCambiarClave}
                aria-label="Cerrar"
                className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Usuario: <strong className="font-mono text-[#1B4589]">{usuarioClave.username}</strong>
              {usuarioClave.nombreCompleto ? ` · ${usuarioClave.nombreCompleto}` : ''}
            </p>

            {errorModal && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[#ED1C24] text-xs font-medium">
                ⚠️ {errorModal}
              </div>
            )}

            <form onSubmit={handleCambiarClave} className="space-y-3">
              <CampoClave id="clave-cambiar" etiqueta="Nueva contraseña" valor={nuevaClave} onCambiar={setNuevaClave} />
              <p className="text-[11px] text-gray-500">
                La clave anterior deja de servir al instante. Si la persona ya tiene una sesión abierta, esa sesión
                puede seguir hasta 1 hora.
              </p>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={cerrarCambiarClave} className={claseBotonSecundario}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting || !claveValida(nuevaClave)} className={claseBotonPrimario}>
                  {submitting ? 'Guardando...' : 'Cambiar contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: eliminar usuario */}
      {usuarioEliminar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-[#ED1C24]">Eliminar usuario</h3>
              <button
                onClick={cerrarEliminar}
                aria-label="Cerrar"
                className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-[#231F20]">
              ¿Eliminar a <strong className="font-mono text-[#1B4589]">{usuarioEliminar.username}</strong>
              {usuarioEliminar.nombreCompleto ? ` (${usuarioEliminar.nombreCompleto})` : ''}?
            </p>
            <p className="text-xs text-gray-600">
              Esta acción <strong>no se puede deshacer</strong>. Si solo quieres que no pueda entrar por ahora, usa
              «Desactivar».
            </p>

            {errorModal && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[#ED1C24] text-xs font-medium">
                ⚠️ {errorModal}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={cerrarEliminar} className={claseBotonSecundario}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEliminar}
                disabled={submitting}
                className="min-h-[44px] sm:min-h-0 px-4 py-2 bg-[#ED1C24] hover:bg-[#c9151b] text-white font-bold text-xs rounded-lg transition-all shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de usuarios */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col justify-between">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-sm text-[#1B4589]">Usuarios Registrados ({usuariosFiltrados.length})</h3>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-[#1B4589] text-xs font-bold animate-pulse">Cargando usuarios...</p>
          </div>
        ) : usuariosPaginados.length > 0 ? (
          <>
            {/* Escritorio: tabla */}
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
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCliente ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {isCliente ? 'CLIENTE' : 'ADMINISTRADOR'}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-semibold text-gray-700">{obtenerNombreEmpresa(u.empresaId)}</td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {u.estado}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap items-center justify-end gap-2">{acciones(u, false)}</div>
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
                        <p className="text-[11px] text-gray-400 break-words">
                          {u.nombreCompleto || u.email || 'Sin datos adicionales'}
                        </p>
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
                    <div className="grid grid-cols-1 gap-2">{acciones(u, true)}</div>
                  </div>
                );
              })}
            </div>

            {/* Paginador Inferior */}
            <div className="px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500">
                Página <strong className="text-[#1B4589]">{currentPage}</strong> de{' '}
                <strong className="text-[#1B4589]">{totalPages}</strong>
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
