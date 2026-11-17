'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { empresaService, EmpresaDto } from '@/modules/empresas/services/empresaService';
import { portfolioService } from '@/modules/portfolio/services/portfolioService';
import { httpClient } from '@/shared/lib/httpClient';
import { CustomSelect } from '@/shared/components/ui/CustomSelect';

interface UsuarioDto {
  id: number;
  empresaId: number | null;
  rolId: number | null;
  username: string;
  email: string | null;
  nombreCompleto: string | null;
  estado: string;
}

export default function EmpresasAdminPage() {
  const [empresas, setEmpresas] = useState<EmpresaDto[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioDto[]>([]);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modal para Nueva Empresa
  const [showModal, setShowModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const [ruc, setRuc] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [logoError, setLogoError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal para Ver Usuarios Asignados a una Empresa
  const [empresaUsuariosModal, setEmpresaUsuariosModal] = useState<EmpresaDto | null>(null);

  // Modal para Editar Empresa
  const [empresaEditarModal, setEmpresaEditarModal] = useState<EmpresaDto | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editRuc, setEditRuc] = useState('');
  const [editEsquema, setEditEsquema] = useState('');
  const [editEstado, setEditEstado] = useState('ACTIVO');
  const [editLogo, setEditLogo] = useState<string | null>(null);
  const [editLogoError, setEditLogoError] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Modal para Eliminar Empresa (Lógico)
  const [empresaEliminar, setEmpresaEliminar] = useState<EmpresaDto | null>(null);
  const [submittingEliminar, setSubmittingEliminar] = useState(false);

  const handleLogoUpload = (file: File | null, isEdit = false) => {
    const setErrorFn = isEdit ? setEditLogoError : setLogoError;
    const setLogoFn = isEdit ? setEditLogo : setLogo;
    setErrorFn('');

    if (!file) {
      setLogoFn(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorFn('Formato inválido. Debe ser una imagen (PNG, JPG, SVG o WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorFn('La imagen supera el límite de 2MB. Seleccione un logo más liviano.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoFn(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const generarSugerenciaEsquema = (nombreEmpresa: string) => {
    let limpio = nombreEmpresa
      .replace(/\b(s\.?a\.?c\.?|s\.?a\.?|s\.?r\.?l\.?|e\.?i\.?r\.?l\.?|s\.?a\.?a\.?)\b/gi, '')
      .trim();
    const palabras = limpio.split(/\s+/).filter(Boolean);
    if (palabras.length > 1 && /^(financiera|caja|banco|cooperativa|creditos)$/i.test(palabras[0])) {
      limpio = palabras.slice(1).join('');
    } else {
      limpio = palabras.join('');
    }
    return limpio
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_]/g, '');
  };

  const limpiarFormulario = () => {
    setNombre('');
    setRuc('');
    setLogo(null);
    setLogoError('');
    setError('');
  };

  const handleCerrarModal = () => {
    setShowModal(false);
    limpiarFormulario();
  };

  const extraerMensajeError = (err: unknown, porDefecto: string): string => {
    const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
      ?.message;
    if (Array.isArray(msg)) return msg.join('. ');
    if (typeof msg === 'string' && msg.trim()) return msg;
    return porDefecto;
  };

  const fetchData = async () => {
    await Promise.resolve();
    try {
      setLoading(true);
      const [dataEmpresas, resUsuarios, perList] = await Promise.all([
        empresaService.listarEmpresas(),
        httpClient.get<{ usuarios: UsuarioDto[] }>('/usuarios').catch(() => ({ data: { usuarios: [] } })),
        portfolioService.getPeriodos().catch(() => []),
      ]);

      const empresasOrdenadas = (dataEmpresas || []).sort((a, b) => b.id - a.id);
      setEmpresas(empresasOrdenadas);
      setUsuarios(resUsuarios.data?.usuarios || []);
      setPeriodos(perList || []);
    } catch (err: unknown) {
      console.error('Error al cargar datos de empresas:', err);
      setError('No se pudo cargar la lista de empresas desde el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) fetchData();
    });
    return () => {
      active = false;
    };
  }, []);

  // Crear Empresa
  const handleCrearEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      const esquemaAuto = generarSugerenciaEsquema(nombre.trim());
      await empresaService.crearEmpresa({
        nombre: nombre.trim(),
        ruc: ruc.trim() || null,
        esquema: esquemaAuto || null,
        logo: logo || null,
      });

      setSuccessMsg('¡Empresa creada correctamente!');
      handleCerrarModal();
      fetchData();
    } catch (err: unknown) {
      console.error('Error al crear empresa:', err);
      setError(extraerMensajeError(err, 'Error al registrar la empresa.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Editar Empresa
  const handleEditarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaEditarModal) return;
    setSubmittingEdit(true);
    setError('');
    setSuccessMsg('');

    try {
      await empresaService.actualizarEmpresa(empresaEditarModal.id, {
        nombre: editNombre.trim(),
        ruc: editRuc.trim() || null,
        esquema: editEsquema.trim() || null,
        estado: editEstado,
        logo: editLogo ?? null,
      });

      setSuccessMsg(`¡Empresa «${editNombre.trim()}» actualizada correctamente!`);
      setEmpresaEditarModal(null);
      fetchData();
    } catch (err: unknown) {
      console.error('Error al editar empresa:', err);
      setError(extraerMensajeError(err, 'Error al actualizar la empresa.'));
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleEliminarEmpresa = async () => {
    if (!empresaEliminar) return;
    setSubmittingEliminar(true);
    setError('');
    setSuccessMsg('');
    try {
      await empresaService.eliminarEmpresa(empresaEliminar.id);
      setSuccessMsg(`Empresa «${empresaEliminar.nombre}» dada de baja correctamente.`);
      setEmpresaEliminar(null);
      fetchData();
    } catch (err: unknown) {
      console.error('Error al dar de baja empresa:', err);
      setError(extraerMensajeError(err, 'No se pudo dar de baja la empresa.'));
    } finally {
      setSubmittingEliminar(false);
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

  // Cálculos para KPIs
  const empresasActivas = empresas.filter((e) => e.estado?.toUpperCase() === 'ACTIVO').length;
  const usuariosClientes = usuarios.filter((u) => u.rolId === 2).length;
  const ultimoPeriodo = periodos.length > 0 ? periodos[0] : '202608';

  return (
    <div className="space-y-4">
      {/* 3 KPI Cards Ejecutivas del Panel Administrador */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Empresas */}
        <div className="bg-white p-4 sm:p-5 rounded-xl shadow-2xs border border-slate-200/90 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1B4589] flex items-center justify-center text-2xl shrink-0 shadow-2xs">
            🏢
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
              Empresas Clientes
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-[#1B4589]">
                {empresas.length}
              </span>
              <span className="text-xs font-semibold text-emerald-600">
                {empresasActivas} activas
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Usuarios */}
        <div className="bg-white p-4 sm:p-5 rounded-xl shadow-2xs border border-slate-200/90 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
            👥
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
              Usuarios Asignados
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900">
                {usuarios.length}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {usuariosClientes} clientes
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Último Periodo */}
        <div className="bg-white p-4 sm:p-5 rounded-xl shadow-2xs border border-slate-200/90 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
            📅
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
              Último Periodo
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {ultimoPeriodo}
              </span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Periodo vigente
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Encabezado y Barra de Búsqueda */}
      <div className="bg-white px-4 sm:px-6 py-3.5 rounded-xl shadow-2xs border border-slate-200/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-[#1B4589] tracking-tight">
            Gestión de Empresas Clientes
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Administra empresas, supervisa sus usuarios y audita sus portfolios de cartera en tiempo real.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full md:w-auto">
          {/* Buscador rápido */}
          <input
            type="text"
            placeholder="Buscar por nombre o RUC..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full md:w-64 px-3.5 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-[#1B4589] focus:outline-hidden bg-slate-50/50"
          />

          <button
            onClick={() => {
              limpiarFormulario();
              setShowModal(true);
            }}
            className="w-full sm:w-auto px-4 py-2 bg-[#1B4589] hover:bg-[#143468] text-white font-bold text-xs rounded-lg transition-all shadow-2xs whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>+ Nueva Empresa</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-[#ED1C24] text-xs font-medium shrink-0">
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs font-medium shrink-0">
          ✅ {successMsg}
        </div>
      )}

      {/* Modal para Crear Empresa */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-[#1B4589]">Registrar Nueva Empresa</h3>
              <button
                onClick={handleCerrarModal}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearEmpresa} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Nombre de la Empresa / Razón Social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Financiera Qapaq S.A. o Caja Huancayo"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  maxLength={200}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-[#1B4589] focus:outline-hidden bg-slate-50 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  RUC <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: 20501234567"
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  maxLength={11}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-[#1B4589] focus:outline-hidden bg-slate-50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Logotipo de la Empresa <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                {logo ? (
                  <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logo} alt="Preview" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">Logo cargado</p>
                      <p className="text-[10px] text-slate-400">Se almacenará en la base de datos PostgreSQL</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLogo(null)}
                      className="px-2 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      ✕ Quitar
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-[#1B4589] rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer bg-slate-50/50 hover:bg-blue-50/30 transition-colors">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={(e) => handleLogoUpload(e.target.files?.[0] || null, false)}
                      className="hidden"
                    />
                    <span className="text-lg">🖼️</span>
                    <span className="text-xs font-semibold text-slate-700">Subir imagen de logotipo</span>
                    <span className="text-[10px] text-slate-400">PNG, JPG, SVG o WebP (máx. 2MB)</span>
                  </label>
                )}
                {logoError && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">⚠️ {logoError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={handleCerrarModal}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#1B4589] hover:bg-[#143468] text-white font-bold text-xs rounded-lg transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Guardando...' : 'Crear Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Editar Empresa */}
      {empresaEditarModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-[#1B4589]">Editar Empresa</h3>
              <button
                type="button"
                onClick={() => setEmpresaEditarModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditarEmpresa} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Nombre de la Empresa / Razón Social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  required
                  maxLength={200}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-[#1B4589] focus:outline-hidden bg-slate-50 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  RUC <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  value={editRuc}
                  onChange={(e) => setEditRuc(e.target.value)}
                  maxLength={11}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-[#1B4589] focus:outline-hidden bg-slate-50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Estado Operativo
                </label>
                <CustomSelect
                  value={editEstado}
                  options={[
                    { value: 'ACTIVO', label: 'ACTIVO', sublabel: 'Permite acceso regular a usuarios' },
                    { value: 'INACTIVO', label: 'INACTIVO', sublabel: 'Bloquea accesos y consultas' },
                  ]}
                  onChange={setEditEstado}
                  size="md"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Logotipo de la Empresa <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                {editLogo ? (
                  <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={editLogo} alt="Preview" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">Logo asignado</p>
                      <p className="text-[10px] text-slate-400">Base de datos PostgreSQL</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditLogo(null)}
                      className="px-2 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      ✕ Quitar
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-[#1B4589] rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer bg-slate-50/50 hover:bg-blue-50/30 transition-colors">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={(e) => handleLogoUpload(e.target.files?.[0] || null, true)}
                      className="hidden"
                    />
                    <span className="text-lg">🖼️</span>
                    <span className="text-xs font-semibold text-slate-700">Subir o cambiar logotipo</span>
                    <span className="text-[10px] text-slate-400">PNG, JPG, SVG o WebP (máx. 2MB)</span>
                  </label>
                )}
                {editLogoError && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">⚠️ {editLogoError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEmpresaEditarModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-4 py-2 bg-[#1B4589] hover:bg-[#143468] text-white font-bold text-xs rounded-lg transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submittingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Ver Usuarios Asignados */}
      {empresaUsuariosModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90dvh] flex flex-col border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50">
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-[#1B4589] truncate">
                  Usuarios de {empresaUsuariosModal.nombre}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  RUC: {empresaUsuariosModal.ruc || 'S/N'} · Estado: {empresaUsuariosModal.estado}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEmpresaUsuariosModal(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[60vh] space-y-3">
              {(() => {
                const usuariosDeEmpresa = usuarios.filter((u) => u.empresaId === empresaUsuariosModal.id);
                if (usuariosDeEmpresa.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-xl mx-auto mb-2 text-slate-400">
                        👥
                      </div>
                      <p className="text-xs font-bold text-slate-700">No hay usuarios asignados a esta empresa</p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                        Puedes asignar usuarios a esta empresa desde el módulo de Gestión de Usuarios.
                      </p>
                      <Link
                        href="/admin/usuarios"
                        className="inline-flex items-center gap-1.5 mt-3.5 px-3.5 py-1.5 bg-[#1B4589] hover:bg-[#143468] text-white font-bold text-xs rounded-lg transition-all"
                      >
                        + Crear o Asignar Usuario
                      </Link>
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-slate-100">
                    {usuariosDeEmpresa.map((u) => {
                      const isActive = u.estado?.toUpperCase() === 'ACTIVO';
                      return (
                        <div key={u.id} className="py-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-900 truncate">
                              {u.nombreCompleto || u.username}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              @{u.username} {u.email ? `· ${u.email}` : ''}
                            </p>
                          </div>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {u.estado}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <Link
                href="/admin/usuarios"
                className="text-xs font-bold text-[#1B4589] hover:underline"
              >
                Ir a Gestión de Usuarios →
              </Link>
              <button
                type="button"
                onClick={() => setEmpresaUsuariosModal(null)}
                className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Eliminar Empresa (Lógico) */}
      {empresaEliminar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6 space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-[#ED1C24] flex items-center gap-1.5">
                <span>🗑️</span>
                <span>Dar de baja empresa</span>
              </h3>
              <button
                onClick={() => setEmpresaEliminar(null)}
                aria-label="Cerrar"
                className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-[#231F20]">
              ¿Deseas dar de baja a la empresa <strong className="font-bold text-[#1B4589]">{empresaEliminar.nombre}</strong>?
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Esta acción es un <strong>borrado lógico</strong>: la empresa dejará de estar visible en el sistema y se suspenderá el acceso a sus portfolios, conservando todos sus registros en base de datos para fines de auditoría histórica.
            </p>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setEmpresaEliminar(null)}
                disabled={submittingEliminar}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEliminarEmpresa}
                disabled={submittingEliminar}
                className="px-4 py-2 bg-[#ED1C24] hover:bg-[#c9151b] text-white font-bold text-xs rounded-lg transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {submittingEliminar ? 'Procesando...' : 'Sí, dar de baja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Empresas Clientes */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200/90 overflow-hidden">
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-bold text-xs sm:text-sm text-[#1B4589]">
            Empresas Registradas ({empresasFiltradas.length})
          </h3>
          <span className="text-[11px] font-semibold text-slate-500">
            {empresasActivas} activas
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-[#1B4589] border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-[#1B4589] text-xs font-bold">Cargando empresas y portfolios...</p>
          </div>
        ) : empresasPaginadas.length > 0 ? (
          <>
            {/* Vista Tabla Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10.5px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Empresa</th>
                    <th className="py-3 px-6">RUC</th>
                    <th className="py-3 px-6 text-center">Usuarios Asignados</th>
                    <th className="py-3 px-6">Estado</th>
                    <th className="py-3 px-6">Fecha Creación</th>
                    <th className="py-3 px-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                  {empresasPaginadas.map((empresa) => {
                    const isActive = empresa.estado?.toUpperCase() === 'ACTIVO';
                    const usuariosDeEmpresa = usuarios.filter((u) => u.empresaId === empresa.id);

                    return (
                      <tr key={empresa.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-[#1B4589]">
                          <div className="flex items-center gap-3">
                            {empresa.logo ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={empresa.logo}
                                alt={empresa.nombre}
                                className="w-9 h-9 rounded-lg object-contain bg-white border border-slate-200 p-0.5 shrink-0 shadow-2xs"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 text-[#1B4589] border border-blue-200/80 flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                                {empresa.nombre.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="truncate max-w-[280px] block leading-tight text-slate-900 font-bold text-xs">{empresa.nombre}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-6 font-mono text-slate-600">
                          {empresa.ruc || 'S/N'}
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <button
                            type="button"
                            onClick={() => setEmpresaUsuariosModal(empresa)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-[#1B4589] border border-blue-200/80 transition-colors cursor-pointer"
                            title="Ver usuarios asignados a esta empresa"
                          >
                            <span>👥 {usuariosDeEmpresa.length} {usuariosDeEmpresa.length === 1 ? 'usuario' : 'usuarios'}</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-6">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {empresa.estado}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-500 font-mono text-[11px]">
                          {new Date(empresa.fechaCreacion).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Botón Principal: Ver Portfolio (Solo empresas activas) */}
                            {isActive ? (
                              <Link
                                href={`/cliente/portfolio?entidad=${encodeURIComponent(empresa.nombre)}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1B4589] hover:bg-[#143468] text-white font-bold text-xs rounded-lg transition-all shadow-2xs cursor-pointer"
                                title={`Abrir Portfolio de ${empresa.nombre}`}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <span>Ver Portfolio</span>
                              </Link>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-400 font-semibold text-xs rounded-lg border border-slate-200 cursor-not-allowed select-none"
                                title="Portfolio no disponible: la empresa está inactiva. Actívala en 'Editar' para visualizar sus datos."
                              >
                                <svg className="w-3.5 h-3.5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                <span>Inactiva</span>
                              </span>
                            )}

                            {/* Botón Editar Empresa */}
                            <button
                              type="button"
                              onClick={() => {
                                setEmpresaEditarModal(empresa);
                                setEditNombre(empresa.nombre);
                                setEditRuc(empresa.ruc || '');
                                setEditEsquema(empresa.esquema || '');
                                setEditEstado(empresa.estado);
                                setEditLogo(empresa.logo || null);
                                setEditLogoError('');
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition-colors shadow-2xs cursor-pointer"
                              title="Editar nombre, RUC o estado de la empresa"
                            >
                              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Editar</span>
                            </button>

                            {/* Botón Eliminar Empresa (Lógico) */}
                            <button
                              type="button"
                              onClick={() => setEmpresaEliminar(empresa)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50/80 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-lg border border-rose-200 transition-colors shadow-2xs cursor-pointer"
                              title="Dar de baja empresa (eliminación lógica)"
                            >
                              <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Eliminar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Vista Celular: Tarjetas estilizadas */}
            <div className="md:hidden divide-y divide-slate-100">
              {empresasPaginadas.map((empresa) => {
                const isActive = empresa.estado?.toUpperCase() === 'ACTIVO';
                const usuariosDeEmpresa = usuarios.filter((u) => u.empresaId === empresa.id);

                return (
                  <div key={empresa.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {empresa.logo ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={empresa.logo}
                            alt={empresa.nombre}
                            className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-200 p-0.5 shrink-0 shadow-2xs"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 text-[#1B4589] border border-blue-200/80 flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                            {empresa.nombre.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-[#1B4589] text-sm break-words leading-tight">{empresa.nombre}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            RUC: <strong className="font-mono text-slate-700">{empresa.ruc || 'S/N'}</strong>
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {empresa.estado}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setEmpresaUsuariosModal(empresa)}
                        className="text-xs font-bold text-[#1B4589] hover:underline flex items-center gap-1"
                      >
                        👥 {usuariosDeEmpresa.length} usuarios asignados
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {isActive ? (
                        <Link
                          href={`/cliente/portfolio?entidad=${encodeURIComponent(empresa.nombre)}`}
                          className="flex-1 flex items-center justify-center gap-1.5 min-h-[40px] bg-[#1B4589] hover:bg-[#143468] text-white font-bold text-xs rounded-lg transition-all shadow-2xs"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span>Ver Portfolio</span>
                        </Link>
                      ) : (
                        <div className="flex-1 flex items-center justify-center gap-1.5 min-h-[40px] bg-slate-100 text-slate-400 font-semibold text-xs rounded-lg border border-slate-200 select-none cursor-not-allowed">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>Inactiva</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEmpresaEditarModal(empresa);
                          setEditNombre(empresa.nombre);
                          setEditRuc(empresa.ruc || '');
                          setEditEsquema(empresa.esquema || '');
                          setEditEstado(empresa.estado);
                          setEditLogo(empresa.logo || null);
                          setEditLogoError('');
                        }}
                        className="px-3 min-h-[40px] bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 flex items-center gap-1.5 shadow-2xs"
                        title="Editar Empresa"
                      >
                        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmpresaEliminar(empresa)}
                        className="px-3 min-h-[40px] bg-rose-50/80 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-lg border border-rose-200 flex items-center gap-1.5 shadow-2xs"
                        title="Dar de baja empresa"
                      >
                        <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginador Inferior */}
            <div className="px-4 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">
                Página <strong className="text-[#1B4589]">{currentPage}</strong> de <strong className="text-[#1B4589]">{totalPages}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-[#1B4589] disabled:opacity-40 hover:bg-slate-100 transition-all shadow-2xs cursor-pointer"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-[#1B4589] disabled:opacity-40 hover:bg-slate-100 transition-all shadow-2xs cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-2xl mb-2 text-[#1B4589]">
              🏢
            </div>
            <p className="text-xs font-bold text-slate-800">No se encontraron empresas registradas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
