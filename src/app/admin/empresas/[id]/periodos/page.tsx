'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { httpClient } from '@/shared/lib/httpClient';
import { extraerEnlacePowerBi, periodoSiguiente, validarEnlaceDescarga } from '@/modules/dashboards/lib/enlaces';

interface EmpresaDto {
  id: number;
  nombre: string;
  ruc: string | null;
  estado: string;
}

interface DashboardAsignadoDto {
  id: number;
  nombre: string;
  codigo: string;
  estado: string;
}

interface PeriodoAdminDto {
  id: number;
  dashboardId: number;
  periodo: string;
  urlPowerbi: string;
  urlMega: string | null;
}

export default function AdminEmpresaPeriodosPage() {
  const params = useParams();
  const empresaId = params.id;

  const [empresa, setEmpresa] = useState<EmpresaDto | null>(null);
  const [selectedDashboardId, setSelectedDashboardId] = useState<number | null>(null);
  const [periodos, setPeriodos] = useState<PeriodoAdminDto[]>([]);
  
  const [loadingEmpresa, setLoadingEmpresa] = useState(true);
  const [loadingPeriodos, setLoadingPeriodos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Campos para nuevo periodo
  const [nuevoPeriodo, setNuevoPeriodo] = useState('');
  const [urlPowerbi, setUrlPowerbi] = useState('');
  const [urlMega, setUrlMega] = useState('');
  // Lo que se pegó en «Power BI» puede ser el HTML de «Código para insertar» o su vínculo: se analiza al instante y se guarda solo el vínculo.
  const analisisPowerbi = useMemo(() => (urlPowerbi.trim() ? extraerEnlacePowerBi(urlPowerbi) : null), [urlPowerbi]);
  const analisisMega = useMemo(() => (urlMega.trim() ? validarEnlaceDescarga(urlMega) : null), [urlMega]);
  // La primera vez que llegan los periodos se deja listo el siguiente: el mes que sigue y el mismo vínculo de Power BI del último periodo.
  const preparado = useRef(false);

  // 1. Cargar la información de la Empresa y su Dashboard asociado automáticamente
  useEffect(() => {
    const fetchEmpresaYDashboards = async () => {
      try {
        // Obtenemos los datos de la empresa para mostrar su nombre
        const resEmpresa = await httpClient.get<EmpresaDto>(`/empresas/${empresaId}`);
        setEmpresa(resEmpresa.data);

        // Obtenemos los dashboards de la empresa para capturar el ID de forma interna
        const resDashboards = await httpClient.get<DashboardAsignadoDto[]>(`/empresas/${empresaId}/dashboards`);
        if (resDashboards.data.length > 0) {
          setSelectedDashboardId(resDashboards.data[0].id); // Asignación automática del ID oculto
        } else {
          setError('Esta empresa no tiene un dashboard vinculado para registrar periodos.');
        }
      } catch (err: any) {
        console.error('Error al cargar la información:', err);
        setError('No se pudo obtener la configuración para esta empresa.');
      } finally {
        setLoadingEmpresa(false);
      }
    };

    if (empresaId) fetchEmpresaYDashboards();
  }, [empresaId]);

  // 2. Cargar Periodos del Dashboard obtenido automáticamente
  useEffect(() => {
    if (!selectedDashboardId) return;

    const fetchPeriodos = async () => {
      setLoadingPeriodos(true);
      setError('');
      try {
        const { data } = await httpClient.get<PeriodoAdminDto[]>(`/dashboards/${selectedDashboardId}/periodos`);
        setPeriodos(data);
        if (!preparado.current) {
          preparado.current = true;
          const ultimo = data.reduce<PeriodoAdminDto | null>((a, p) => (!a || p.periodo > a.periodo ? p : a), null);
          if (ultimo) setUrlPowerbi(ultimo.urlPowerbi);
          setNuevoPeriodo(periodoSiguiente(ultimo?.periodo));
        }
      } catch (err: any) {
        console.error('Error al cargar periodos:', err);
        setError('No se pudieron obtener los periodos.');
      } finally {
        setLoadingPeriodos(false);
      }
    };

    fetchPeriodos();
  }, [selectedDashboardId]);

  // 3. Registrar un nuevo Periodo usando el ID obtenido automáticamente
  const handleCrearPeriodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDashboardId) {
      setError('No hay un dashboard válido vinculado a esta empresa.');
      return;
    }

    setError('');
    setSuccessMsg('');
    if (!/^\d{4}(0[1-9]|1[0-2])$/.test(nuevoPeriodo)) {
      setError('El periodo debe tener el formato AAAAMM, por ejemplo 202610.');
      return;
    }
    const powerbi = extraerEnlacePowerBi(urlPowerbi);
    if (!powerbi.ok) {
      setError(powerbi.motivo);
      return;
    }
    const descarga = validarEnlaceDescarga(urlMega);
    if (!descarga.ok) {
      setError(descarga.motivo);
      return;
    }

    setSubmitting(true);

    try {
      await httpClient.post(`/dashboards/${selectedDashboardId}/periodos`, {
        periodo: nuevoPeriodo,
        urlPowerbi: powerbi.url,
        urlMega: descarga.url,
      });

      setSuccessMsg(`Periodo ${nuevoPeriodo} registrado. Quedó listo el siguiente con el mismo vínculo de Power BI: solo falta su descarga de MEGA.`);
      setNuevoPeriodo(periodoSiguiente(nuevoPeriodo));
      setUrlPowerbi(powerbi.url);
      setUrlMega('');

      // Recargar la lista de periodos
      const { data } = await httpClient.get<PeriodoAdminDto[]>(`/dashboards/${selectedDashboardId}/periodos`);
      setPeriodos(data);
    } catch (err: any) {
      console.error('Error al crear periodo:', err);
      setError(err.response?.data?.message || 'Error al guardar el periodo en el servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="bg-white px-4 sm:px-6 py-4 sm:py-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B4589]">
            Gestión de Periodos y Enlaces
          </h2>
          <p className="text-gray-500 text-xs mt-0.5">
            Administra los enlaces de PowerBI y descargas asignados por periodo a esta empresa.
          </p>
        </div>
        <a
          href="/admin/empresas"
          className="inline-flex items-center justify-center w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#1B4589] font-bold text-xs rounded-lg transition-all"
        >
          ← Volver a Empresas
        </a>
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

      {/* Identificador de Empresa (Reemplazo visual del desplegable, manteniendo la lógica del ID) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="text-xs font-bold text-[#1B4589] uppercase tracking-wider">EMPRESA:</span>
        <span className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-[#231F20]">
          {loadingEmpresa ? 'Cargando...' : empresa?.nombre || 'Empresa No Encontrada'} {empresa?.ruc ? `(RUC: ${empresa.ruc})` : ''}
        </span>
      </div>

      {/* Formulario de Nuevo Periodo */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-sm text-[#1B4589] mb-4">
          Asignar Nuevo Periodo y Enlaces
        </h3>

        <form onSubmit={handleCrearPeriodo} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-start">
          <div className="md:col-span-1">
            <label htmlFor="periodo" className="block text-xs font-medium text-[#231F20] mb-1">
              Periodo (AAAAMM)
            </label>
            <input
              id="periodo"
              type="text"
              inputMode="numeric"
              placeholder="Ej: 202610"
              value={nuevoPeriodo}
              onChange={(e) => setNuevoPeriodo(e.target.value.replace(/\D/g, ''))}
              required
              maxLength={6}
              className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-base sm:text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-gray-50/50 font-mono"
            />
          </div>

          <div className="md:col-span-3">
            <label htmlFor="mega" className="block text-xs font-medium text-[#231F20] mb-1">
              Link Descarga (MEGA) — opcional
            </label>
            <input
              id="mega"
              type="text"
              inputMode="url"
              spellCheck={false}
              placeholder="https://mega.nz/..."
              value={urlMega}
              onChange={(e) => setUrlMega(e.target.value)}
              className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-base sm:text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-gray-50/50"
            />
            {analisisMega && !analisisMega.ok ? (
              <p className="mt-1.5 text-[11px] text-[#ED1C24]">⚠️ {analisisMega.motivo}</p>
            ) : (
              <p className="mt-1.5 text-[11px] text-gray-500">Con este vínculo el cliente descarga el periodo desde MEGA.</p>
            )}
          </div>

          <div className="md:col-span-2 md:pt-[22px]">
            <button
              type="submit"
              disabled={submitting || !selectedDashboardId}
              className="w-full min-h-[44px] sm:min-h-0 py-2 bg-[#1B4589] hover:bg-[#143468] text-white font-bold text-xs rounded-lg transition-all shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : '+ Registrar Periodo'}
            </button>
          </div>

          <div className="md:col-span-6">
            <label htmlFor="powerbi" className="block text-xs font-medium text-[#231F20] mb-1">
              Power BI (HTML o vínculo)
            </label>
            <textarea
              id="powerbi"
              rows={3}
              spellCheck={false}
              placeholder={'Pega aquí el «HTML para pegar en un sitio web» de Power BI (empieza con <iframe …>) o su vínculo https://app.powerbi.com/view?r=…'}
              value={urlPowerbi}
              onChange={(e) => setUrlPowerbi(e.target.value)}
              required
              className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-base sm:text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-gray-50/50 font-mono"
            />
            {analisisPowerbi === null ? (
              <p className="mt-1.5 text-[11px] text-gray-500">
                En Power BI: «Publicar en la web» → «Código para insertar». Copia el «HTML para pegar en un sitio web»; también sirve el vínculo. El mismo vínculo vale para todos los periodos de esta empresa.
              </p>
            ) : analisisPowerbi.ok ? (
              <div className="mt-1.5 text-[11px] text-green-700">
                ✓ Vínculo de Power BI detectado{analisisPowerbi.titulo ? ` · reporte «${analisisPowerbi.titulo}»` : ''}. Se guarda solo el vínculo.{' '}
                <a href={analisisPowerbi.url} target="_blank" rel="noopener noreferrer" className="font-bold underline">
                  Probarlo
                </a>
                <span className="block font-mono text-gray-500 truncate">{analisisPowerbi.url}</span>
              </div>
            ) : (
              <p className="mt-1.5 text-[11px] text-[#ED1C24]">⚠️ {analisisPowerbi.motivo}</p>
            )}
          </div>
        </form>
      </div>

      {/* Tabla de Periodos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-sm text-[#1B4589]">
            Periodos Registrados ({periodos.length})
          </h3>
        </div>

        {loadingPeriodos ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-[#1B4589] text-xs font-bold animate-pulse">Cargando periodos...</p>
          </div>
        ) : periodos.length > 0 ? (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-6">Periodo</th>
                  <th className="py-3 px-6">PowerBI URL</th>
                  <th className="py-3 px-6">Mega URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-[#231F20]">
                {periodos.map((p) => (
                  <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-[#1B4589]">
                      {p.periodo}
                    </td>
                    <td className="py-4 px-6 text-gray-600 truncate max-w-xs">
                      <a href={p.urlPowerbi} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {p.urlPowerbi}
                      </a>
                    </td>
                    <td className="py-4 px-6 text-gray-600 truncate max-w-xs">
                      {p.urlMega ? (
                        <a href={p.urlMega} target="_blank" rel="noopener noreferrer" className="text-[#ED1C24] hover:underline">
                          {p.urlMega}
                        </a>
                      ) : (
                        <span className="text-gray-400 italic">Sin enlace</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Celular: una tarjeta por periodo */}
          <div className="md:hidden divide-y divide-gray-100">
            {periodos.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between gap-3">
                <p className="font-mono font-bold text-[#1B4589] text-base">{p.periodo}</p>
                <div className="flex items-center gap-2">
                  <a
                    href={p.urlPowerbi}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center min-h-[44px] px-3 text-xs font-bold text-[#1B4589] border border-[#1B4589]/30 rounded-lg active:bg-blue-50"
                  >
                    Power BI
                  </a>
                  {p.urlMega && (
                    <a
                      href={p.urlMega}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center min-h-[44px] px-3 text-xs font-bold text-[#ED1C24] border border-[#ED1C24]/30 rounded-lg active:bg-red-50"
                    >
                      Descarga
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-xs font-semibold text-gray-500">No hay periodos registrados para esta empresa.</p>
          </div>
        )}
      </div>
    </div>
  );
}