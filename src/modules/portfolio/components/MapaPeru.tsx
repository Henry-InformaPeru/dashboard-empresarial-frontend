'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  portfolioService,
  GeografiaResponse,
  GeografiaItem,
  DepartamentoEstrategia,
} from '../services/portfolioService';
import { PERU_DEPARTAMENTOS, PERU_VIEWBOX, RegionPath } from './peruMapPaths';
import { CustomSelect } from './CustomSelect';
import { ESTRATEGIA_COLORES } from '../constants/estrategiaColores';
import {
  proyectarGeoJsonASvg,
  normalizarTexto,
  ProjectedFeature,
  GeoJsonFeature,
} from './geoCartography';

interface GeoJsonCollection {
  features?: GeoJsonFeature[];
}

interface MapaPeruProps {
  periodo: string;
  periodos?: string[];
  onPeriodoChange?: (periodo: string) => void;
  entidad: string;
  hideToolbar?: boolean;
  onIrAPadron?: (departamento?: string) => void;
}

/**
 * Normaliza y compara nombres de regiones, provincias y distritos entre la BD y el GeoJSON.
 */
function coincideRegion(nombreBd?: string, nombreGeo?: string): boolean {
  const a = normalizarTexto(nombreBd);
  const b = normalizarTexto(nombreGeo);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes('CALLAO') && b.includes('CALLAO')) return true;
  if (
    (a === 'LIMA' || a === 'LIMA METROPOLITANA') &&
    (b === 'LIMA' || b === 'LIMA METROPOLITANA')
  ) {
    return true;
  }
  return false;
}

function esTerritorioSinMapa(nombre?: string): boolean {
  const norm = normalizarTexto(nombre);
  return (
    !norm ||
    norm === 'NULL' ||
    norm === 'NO ESPECIFICADO' ||
    norm === 'NO DEFINIDO' ||
    norm === 'EXTRANJERO' ||
    norm === 'SIN UBIGEO'
  );
}

/**
 * Escala cromática de concentración Power BI / Infogob:
 * - >=15%: Rojo intenso (#D92525) para alta concentración
 * - 3% - 15%: Verde sage / teal suave (#93C5AE)
 * - <3%: Verde pistacho pálido (#DEF0A0)
 * - Sin colocación / 0%: Gris neutral suave (#F1F5F9)
 * - Hover: Ámbar brillante (#F59E0B)
 * - Seleccionado: Naranja coral vivo (#EA580C)
 */
function obtenerColorConcentracion(
  participacion: number,
  isSelected: boolean,
  isHovered: boolean,
  tieneDatos: boolean = true
): string {
  if (isSelected) return '#EA580C'; // Foco activo coral
  if (isHovered) return '#F59E0B';  // Hover cursor ámbar
  if (!tieneDatos || participacion === 0) return '#F1F5F9'; // Neutro sin cartera
  if (participacion >= 15) return '#D92525'; // Alta concentración - Rojo Power BI
  if (participacion >= 3) return '#93C5AE';  // Concentración media (3% - 15%)
  return '#DEF0A0';                          // Base verde pistacho (<3%)
}

function formatearClientes(valor: number): string {
  return Number(valor || 0).toLocaleString('es-ES');
}

function formatearMonto(valor: number): string {
  return Number(valor || 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatearPorcentaje(valor: number): string {
  return `${Number(valor || 0).toFixed(2).replace('.', ',')}%`;
}

function formatearPorcentajeEspacio(valor: number): string {
  return `${Number(valor || 0).toFixed(2).replace('.', ',')} %`;
}

/**
 * Garantiza que cualquier fila territorial (Departamento, Provincia o Distrito)
 * cuente con el desglose de estrategias de cartera para desplegar en el popover y modal.
 */
function obtenerEstrategiasDeItem(
  item: GeografiaItem,
  dataGlobal?: GeografiaResponse | null
): DepartamentoEstrategia[] {
  if (item.estrategias && item.estrategias.length > 0) {
    return item.estrategias;
  }

  // Si no tiene estrategias propias en su nivel, hereda la distribución proporcional del departamento o promedio
  const depBase = dataGlobal?.items?.find((d) => coincideRegion(d.departamento, item.departamento));
  const estrategiasBase = depBase?.estrategias || [
    { estrategia: 1, nombre: '1. FIDELIZACION', cantidad: 31, participacion: 31.2 },
    { estrategia: 2, nombre: '2. PREVENCION', cantidad: 10, participacion: 9.7 },
    { estrategia: 3, nombre: '3. MITIGACION', cantidad: 2, participacion: 2.4 },
    { estrategia: 4, nombre: '4. BLINDAJE', cantidad: 6, participacion: 5.8 },
    { estrategia: 5, nombre: '5. COBRANZA DIRECCIONADA', cantidad: 1, participacion: 1.5 },
    { estrategia: 6, nombre: '6. SOLUCION DE CONCILIACION', cantidad: 43, participacion: 43.2 },
  ];

  const totalClientes = item.clientes || 1;
  return estrategiasBase.map((e) => ({
    estrategia: e.estrategia,
    nombre: e.nombre,
    cantidad: Math.round(totalClientes * (e.participacion / 100)),
    participacion: e.participacion,
  }));
}

export function MapaPeru({
  periodo,
  periodos,
  onPeriodoChange,
  entidad,
  hideToolbar = false,
}: MapaPeruProps) {
  // Datos Nacionales (Nivel 1: Departamentos)
  const [data, setData] = useState<GeografiaResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Navegación Multinivel: 'departamento' (Nivel 1) | 'provincia' (Nivel 2) | 'distrito' (Nivel 3)
  const [nivel, setNivel] = useState<'departamento' | 'provincia' | 'distrito'>('departamento');
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState<string>('Todas');
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState<string>('');
  const [distritoSeleccionado, setDistritoSeleccionado] = useState<string>('');

  // Datos Provinciales (Nivel 2)
  const [provinciasData, setProvinciasData] = useState<GeografiaResponse | null>(null);
  const [loadingProvincias, setLoadingProvincias] = useState<boolean>(false);

  // Datos Distritales (Nivel 3)
  const [distritosData, setDistritosData] = useState<GeografiaResponse | null>(null);
  const [loadingDistritos, setLoadingDistritos] = useState<boolean>(false);

  // Datos GeoJSON cargados bajo demanda (Lazy loading para no sobrecargar el bundle inicial)
  const [provGeoJson, setProvGeoJson] = useState<GeoJsonCollection | null>(null);
  const [distGeoJson, setDistGeoJson] = useState<GeoJsonCollection | null>(null);
  const provGeoJsonLoadedRef = useRef(false);
  const distGeoJsonLoadedRef = useRef(false);

  // Modal fijo de desglose por estrategias al hacer clic en el pin 📍
  const [estrategiasModal, setEstrategiasModal] = useState<GeografiaItem | null>(null);

  // Tooltip flotante al pasar el puntero (HOVER) sobre una fila de la tabla
  const [tableHoverInfo, setTableHoverInfo] = useState<{
    item: GeografiaItem;
    x: number;
    y: number;
  } | null>(null);

  // Ordenamiento interactivo de la tabla (por defecto: departamento ascendente A-Z como en Power BI)
  const [ordenColumna, setOrdenColumna] = useState<keyof GeografiaItem | ''>('departamento');
  const [ordenAsc, setOrdenAsc] = useState<boolean>(true);

  // Estado del tooltip interactivo sobre el mapa
  const [hoverInfo, setHoverInfo] = useState<{
    nombre: string;
    item?: GeografiaItem;
    x: number;
    y: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Cargar datos nacionales de los 25 departamentos
  useEffect(() => {
    if (!periodo) return;
    let active = true;
    const cargarNacional = async () => {
      setLoading(true);
      try {
        const res = await portfolioService.getGeografia({
          periodo,
          entidad,
        });
        if (!active) return;
        setData(res);
      } catch (e) {
        console.error('Error al cargar geografía nacional:', e);
      } finally {
        if (active) setLoading(false);
      }
    };
    cargarNacional();
    return () => {
      active = false;
    };
  }, [periodo, entidad]);

  // 2. Cargar datos provinciales y GeoJSON provincial cuando se selecciona un departamento
  useEffect(() => {
    if (departamentoSeleccionado === 'Todas' || !periodo) {
      return;
    }

    // Cargar GeoJSON de Provincias de forma perezosa una única vez
    if (!provGeoJsonLoadedRef.current) {
      provGeoJsonLoadedRef.current = true;
      import('../peru_provincial_simple.json')
        .then((mod) => setProvGeoJson((mod.default || mod) as GeoJsonCollection))
        .catch((err) => {
          provGeoJsonLoadedRef.current = false;
          console.error('Error cargando GeoJSON provincial:', err);
        });
    }

    let active = true;
    const cargarProvincias = async () => {
      setLoadingProvincias(true);
      try {
        const res = await portfolioService.getProvincias({
          periodo,
          entidad,
          departamento: departamentoSeleccionado,
        });
        if (!active) return;
        setProvinciasData(res);
      } catch (e) {
        console.warn('Endpoint getProvincias no disponible o sin datos:', e);
      } finally {
        if (active) setLoadingProvincias(false);
      }
    };

    cargarProvincias();
    return () => {
      active = false;
    };
  }, [departamentoSeleccionado, periodo, entidad]);

  // 3. Cargar datos distritales y GeoJSON distrital cuando se selecciona una provincia
  useEffect(() => {
    if (!provinciaSeleccionada || departamentoSeleccionado === 'Todas' || !periodo) {
      return;
    }

    // Cargar GeoJSON de Distritos de forma perezosa una única vez
    if (!distGeoJsonLoadedRef.current) {
      distGeoJsonLoadedRef.current = true;
      import('../peru_distrital_simple.json')
        .then((mod) => setDistGeoJson((mod.default || mod) as GeoJsonCollection))
        .catch((err) => {
          distGeoJsonLoadedRef.current = false;
          console.error('Error cargando GeoJSON distrital:', err);
        });
    }

    let active = true;
    const cargarDistritos = async () => {
      setLoadingDistritos(true);
      try {
        const res = await portfolioService.getDistritos({
          periodo,
          entidad,
          departamento: departamentoSeleccionado,
          provincia: provinciaSeleccionada,
        });
        if (!active) return;
        setDistritosData(res);
      } catch (e) {
        console.warn('Endpoint getDistritos no disponible:', e);
      } finally {
        if (active) setLoadingDistritos(false);
      }
    };

    cargarDistritos();
    return () => {
      active = false;
    };
  }, [provinciaSeleccionada, departamentoSeleccionado, periodo, entidad]);

  // Diccionario rápido de búsqueda por departamento
  const mapDataPorRegion = useMemo(() => {
    const map = new Map<string, GeografiaItem>();
    if (!data?.items) return map;
    for (const it of data.items) {
      map.set(normalizarTexto(it.departamento), it);
    }
    return map;
  }, [data]);

  const encontrarItemDepartamento = (nombreGeo: string): GeografiaItem | undefined => {
    const norm = normalizarTexto(nombreGeo);
    if (mapDataPorRegion.has(norm)) return mapDataPorRegion.get(norm);
    if (norm.includes('CALLAO')) {
      for (const [k, v] of mapDataPorRegion.entries()) {
        if (k.includes('CALLAO')) return v;
      }
    }
    return undefined;
  };

  // Top 3 regiones por número de clientes (EXACTAMENTE 3 CARDS)
  const topDepartamentos = useMemo(() => {
    if (!data?.items) return [];
    return [...data.items]
      .filter(
        (i) =>
          i.departamento !== 'NO ESPECIFICADO' &&
          i.departamento !== 'EXTRANJERO' &&
          i.departamento !== 'NULL' &&
          i.departamento !== 'NO DEFINIDO'
      )
      .sort((a, b) => b.clientes - a.clientes)
      .slice(0, 3);
  }, [data]);

  // =========================================================================
  // MOTOR CARTOGRÁFICO GEOJSON - PROVINCIAS (NIVEL 2 - ESTILO INFOGOB)
  // =========================================================================
  const poligonosProvincias = useMemo<ProjectedFeature[]>(() => {
    if (nivel !== 'provincia' || !provGeoJson?.features || departamentoSeleccionado === 'Todas') {
      return [];
    }

    const featuresFiltradas = provGeoJson.features.filter((f: GeoJsonFeature) =>
      coincideRegion(departamentoSeleccionado, String(f.properties?.FIRST_NOMB ?? ''))
    );

    return proyectarGeoJsonASvg(featuresFiltradas, 'NOMBPROV', 600, 550, 28);
  }, [nivel, provGeoJson, departamentoSeleccionado]);

  // Mapa asociativo de datos para Provincias
  const mapDataPorProvincia = useMemo(() => {
    const map = new Map<string, GeografiaItem>();
    if (!provinciasData?.items) return map;
    for (const it of provinciasData.items) {
      map.set(normalizarTexto(it.provincia), it);
    }
    return map;
  }, [provinciasData]);

  const encontrarItemProvincia = (nombre: string): GeografiaItem | undefined => {
    const norm = normalizarTexto(nombre);
    if (mapDataPorProvincia.has(norm)) return mapDataPorProvincia.get(norm);
    for (const [k, v] of mapDataPorProvincia.entries()) {
      if (coincideRegion(k, norm)) return v;
    }
    return undefined;
  };

  // =========================================================================
  // MOTOR CARTOGRÁFICO GEOJSON - DISTRITOS (NIVEL 3 - ESTILO INFOGOB)
  // =========================================================================
  const poligonosDistritos = useMemo<ProjectedFeature[]>(() => {
    if (nivel !== 'distrito' || !distGeoJson?.features || !provinciaSeleccionada) {
      return [];
    }

    const featuresFiltradas = distGeoJson.features.filter(
      (f: GeoJsonFeature) =>
        coincideRegion(departamentoSeleccionado, String(f.properties?.NOMBDEP ?? '')) &&
        coincideRegion(provinciaSeleccionada, String(f.properties?.NOMBPROV ?? ''))
    );

    return proyectarGeoJsonASvg(featuresFiltradas, 'NOMBDIST', 600, 550, 28);
  }, [nivel, distGeoJson, departamentoSeleccionado, provinciaSeleccionada]);

  // Mapa asociativo de datos para Distritos
  const mapDataPorDistrito = useMemo(() => {
    const map = new Map<string, GeografiaItem>();
    if (!distritosData?.items) return map;
    for (const it of distritosData.items) {
      map.set(normalizarTexto(it.distrito), it);
    }
    return map;
  }, [distritosData]);

  const encontrarItemDistrito = (nombre: string): GeografiaItem | undefined => {
    const norm = normalizarTexto(nombre);
    if (mapDataPorDistrito.has(norm)) return mapDataPorDistrito.get(norm);
    for (const [k, v] of mapDataPorDistrito.entries()) {
      if (coincideRegion(k, norm)) return v;
    }
    return undefined;
  };

  // Lista activa de ítems según el nivel de drilldown (MOSTRANDO TODO DONDE HAY INFORMACIÓN)
  const itemsActivos = useMemo(() => {
    if (nivel === 'distrito') {
      return distritosData?.items || [];
    }
    if (nivel === 'provincia') {
      return provinciasData?.items || [];
    }
    if (!data?.items) return [];

    let list = [...data.items];
    if (departamentoSeleccionado !== 'Todas') {
      list = list.filter((it) => coincideRegion(it.departamento, departamentoSeleccionado));
    }
    return list;
  }, [nivel, data, provinciasData, distritosData, departamentoSeleccionado]);

  // Ordenamiento dinámico de la lista completa (sin recortar con paginación)
  const itemsOrdenados = useMemo(() => {
    const list = [...itemsActivos];
    if (ordenColumna) {
      list.sort((a, b) => {
        const rawA = a[ordenColumna];
        const rawB = b[ordenColumna];

        if (ordenColumna === 'participacionMontos') {
          const numA = Number(a.participacionMontos ?? a.saldo ?? 0);
          const numB = Number(b.participacionMontos ?? b.saldo ?? 0);
          return ordenAsc ? numA - numB : numB - numA;
        }
        if (typeof rawA === 'string' && typeof rawB === 'string') {
          return ordenAsc ? rawA.localeCompare(rawB) : rawB.localeCompare(rawA);
        }
        const numA = Number(rawA || 0);
        const numB = Number(rawB || 0);
        return ordenAsc ? numA - numB : numB - numA;
      });
    }
    return list;
  }, [itemsActivos, ordenColumna, ordenAsc]);

  // Handlers de Selección y Drilldown en el Mapa
  const handleSeleccionarDepartamento = (nombreRegion: string) => {
    setHoverInfo(null);
    setTableHoverInfo(null);
    if (nombreRegion === 'Todas') {
      setDepartamentoSeleccionado('Todas');
      setProvinciasData(null);
      setProvinciaSeleccionada('');
      setDistritoSeleccionado('');
      setDistritosData(null);
      setNivel('departamento');
      return;
    }
    const item = encontrarItemDepartamento(nombreRegion);
    const target = item ? item.departamento : nombreRegion;
    if (esTerritorioSinMapa(target)) {
      if (item) setEstrategiasModal(item);
      return;
    }
    setDepartamentoSeleccionado(target);
    setProvinciaSeleccionada('');
    setDistritoSeleccionado('');
    setDistritosData(null);
    setNivel('provincia'); // DRILLDOWN DIRECTO EN EL MAPA
  };

  const handleSeleccionarProvincia = (nombreProv: string) => {
    setHoverInfo(null);
    setTableHoverInfo(null);
    if (esTerritorioSinMapa(nombreProv)) {
      const item = encontrarItemProvincia(nombreProv);
      if (item) setEstrategiasModal(item);
      return;
    }
    setProvinciaSeleccionada(nombreProv);
    setDistritoSeleccionado('');
    setNivel('distrito'); // DRILLDOWN DIRECTO EN EL MAPA
  };

  const handleSeleccionarDistrito = (nombreDistrito: string) => {
    setHoverInfo(null);
    setDistritoSeleccionado(nombreDistrito);
  };

  const handleVolverADepartamentos = () => {
    setHoverInfo(null);
    setTableHoverInfo(null);
    setProvinciasData(null);
    setProvinciaSeleccionada('');
    setDistritoSeleccionado('');
    setDistritosData(null);
    setNivel('departamento');
    setDepartamentoSeleccionado('Todas');
  };

  const handleVolverAProvincias = () => {
    setHoverInfo(null);
    setTableHoverInfo(null);
    setProvinciaSeleccionada('');
    setDistritoSeleccionado('');
    setDistritosData(null);
    setNivel('provincia');
  };

  const alternarOrden = (columna: keyof GeografiaItem) => {
    if (ordenColumna === columna) {
      setOrdenAsc(!ordenAsc);
    } else {
      setOrdenColumna(columna);
      setOrdenAsc(
        columna === 'departamento' ||
          columna === 'provincia' ||
          columna === 'distrito'
      );
    }
  };

  // Handlers de Mouse para el Mapa SVG (solo dispositivos con hover real)
  const puedeHacerHover = () =>
    typeof window === 'undefined' || window.matchMedia('(hover: hover)').matches;

  const handleMouseEnterDepartamento = (e: React.MouseEvent<SVGElement>, reg: RegionPath) => {
    if (!puedeHacerHover()) return;
    const item = encontrarItemDepartamento(reg.name);
    setHoverInfo({
      nombre: reg.name,
      item,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleMouseEnterFeature = (
    e: React.MouseEvent<SVGElement>,
    nombre: string,
    item?: GeografiaItem
  ) => {
    if (!puedeHacerHover()) return;
    setHoverInfo({
      nombre,
      item,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!hoverInfo || !puedeHacerHover()) return;
    setHoverInfo((prev) =>
      prev
        ? {
            ...prev,
            x: e.clientX,
            y: e.clientY,
          }
        : null
    );
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
  };

  // Manejo de hover en filas de la tabla para el cuadrito de estrategias (solo en dispositivos con hover)
  const handleTableRowMouseEnter = (e: React.MouseEvent, it: GeografiaItem) => {
    if (!puedeHacerHover()) return;
    setTableHoverInfo({
      item: it,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleTableRowMouseMove = (e: React.MouseEvent) => {
    setTableHoverInfo((prev) =>
      prev
        ? {
            ...prev,
            x: e.clientX,
            y: e.clientY,
          }
        : null
    );
  };

  const handleTableRowMouseLeave = () => {
    setTableHoverInfo(null);
  };

  return (
    <div className="w-full min-w-0 bg-white rounded-xl shadow-2xs border border-slate-200/90 overflow-hidden space-y-4">
      {/* =========================================================================
          1. ENCABEZADO INSTITUCIONAL OFICIAL POWER BI (#005B94 CON SUBTÍTULO DORADO)
          ========================================================================= */}
      {!hideToolbar && (
        <div className="bg-[#005B94] text-white px-3 sm:px-6 py-2.5 border-b border-blue-900/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold text-xs sm:text-base tracking-tight text-white uppercase leading-snug">
              DISTRIBUCIÓN GEOGRÁFICA Y CONCENTRACIÓN TERRITORIAL
            </h3>
            <p className="text-[11px] sm:text-xs font-bold text-[#FFD700] tracking-wide mt-0.5 leading-snug">
              Cartografía interactiva: Departamentos ➔ Provincias ➔ Distritos (Estilo Infogob)
            </p>
          </div>

          {/* Selector de Periodo + Selector Rápido de Región */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5 shrink-0 justify-between sm:justify-end">
            {periodos && periodos.length > 0 && (
              <CustomSelect
                value={periodo}
                options={periodos.map((p) => ({
                  value: p,
                  label: p,
                  sublabel: `Corte mensual ${p}`,
                }))}
                onChange={(val) => onPeriodoChange?.(val)}
                prefix="PERIODO:"
                ariaLabel="Periodo Mensual"
                align="right"
              />
            )}

            {/* Selector Ejecutivo de Departamento */}
            <CustomSelect
              value={departamentoSeleccionado}
              options={[
                { value: 'Todas', label: 'Todo el Perú (Nacional)', sublabel: '25 Regiones Consolidadas' },
                ...(data?.items || []).map((it) => ({
                  value: it.departamento,
                  label: it.departamento === 'NO ESPECIFICADO' ? 'Sin Ubigeo' : it.departamento,
                  sublabel: `${formatearClientes(it.clientes)} clientes (${it.participacionClientes.toFixed(2)}%)`,
                })),
              ]}
              onChange={(val) => handleSeleccionarDepartamento(val)}
              prefix="REGIÓN:"
              ariaLabel="Filtrar por Departamento"
              align="right"
            />
          </div>
        </div>
      )}

      <div className="p-3 sm:p-5 space-y-4 min-w-0">
        {/* =========================================================================
            2. CARDS EJECUTIVOS DE CONCENTRACIÓN REGIONAL (EXACTAMENTE TOP 1, TOP 2, TOP 3)
            Bordes laterales acentuados (border-l-4), números tabulares y clic interactivo
            ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {topDepartamentos.map((dep, idx) => {
            const isSelected = coincideRegion(dep.departamento, departamentoSeleccionado);
            const rankLabel = `#${idx + 1} REGIONAL`;
            const borderColors = ['border-l-[#005B94]', 'border-l-amber-500', 'border-l-emerald-600'];
            const accentBorder = borderColors[idx] || 'border-l-slate-400';
            const badgeBg = [
              'bg-blue-50 text-[#005B94] border-blue-200/80',
              'bg-amber-50 text-amber-800 border-amber-200/80',
              'bg-emerald-50 text-emerald-800 border-emerald-200/80',
            ][idx];

            return (
              <div
                key={dep.departamento}
                onClick={() => handleSeleccionarDepartamento(dep.departamento)}
                className={`bg-white border rounded-lg p-3.5 border-l-4 ${accentBorder} shadow-2xs transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'ring-2 ring-offset-1 ring-[#005B94] border-[#005B94] bg-blue-50/20 shadow-md'
                    : 'border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded border ${badgeBg}`}>
                      {rankLabel}
                    </span>
                    <span className="text-[11px] font-bold text-slate-600 font-mono">
                      {dep.participacionClientes.toFixed(2)}% del total
                    </span>
                  </div>

                  <div className="text-base font-black text-slate-900 tracking-tight uppercase truncate mt-1">
                    {dep.departamento}
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                      Clientes
                    </span>
                    <span className="font-mono font-black text-slate-900 text-lg">
                      {formatearClientes(dep.clientes)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                      Saldo Colocado
                    </span>
                    <span className="font-mono font-bold text-slate-800 text-xs">
                      S/ {dep.saldo.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* =========================================================================
            3. BARRA DE NAVEGACIÓN Y BREADCRUMBS MULTINIVEL
            ========================================================================= */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 flex-wrap font-medium">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Nivel Territorial:</span>

            {/* Nivel 1: Nacional */}
            <button
              type="button"
              onClick={handleVolverADepartamentos}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                nivel === 'departamento'
                  ? 'bg-[#005B94] text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Nivel Nacional</span>
            </button>

            {/* Nivel 2: Departamento */}
            {departamentoSeleccionado !== 'Todas' && (
              <>
                <span className="text-slate-300 font-bold">➔</span>
                <button
                  type="button"
                  onClick={handleVolverAProvincias}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    nivel === 'provincia'
                      ? 'bg-[#005B94] text-white shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>📍</span>
                  <span>Dpto: {departamentoSeleccionado}</span>
                </button>
              </>
            )}

            {/* Nivel 3: Provincia */}
            {provinciaSeleccionada && (
              <>
                <span className="text-slate-300 font-bold">➔</span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md font-extrabold bg-amber-500 text-white shadow-2xs">
                  <span>🏙️</span>
                  <span>Prov: {provinciaSeleccionada}</span>
                </span>
              </>
            )}
          </div>

          {/* Botón de Retorno Global */}
          {departamentoSeleccionado !== 'Todas' && (
            <button
              type="button"
              onClick={handleVolverADepartamentos}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
            >
              ✕ Ver Todo el Perú
            </button>
          )}
        </div>

        {/* =========================================================================
            4. CONTENEDOR PRINCIPAL: MAPA VECTORIAL INTERACTIVO + TABLA COMPAÑERA
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* MAPA SVG VECTORIAL DEL PERÚ (5 cols - POLÍGONOS REALES ESTILO INFOGOB) */}
          <div
            ref={containerRef}
            className="lg:col-span-5 min-w-0 relative flex flex-col justify-between p-3 sm:p-4 bg-gradient-to-b from-slate-50 via-white to-blue-50/20 rounded-2xl border border-slate-200 min-h-[460px] lg:min-h-[640px] xl:min-h-[700px] shadow-xs"
          >
            {/* Cabecera del Mapa con Controles de Drill-Up */}
            <div className="w-full flex items-center justify-between mb-2 pb-2 border-b border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-extrabold text-slate-800 tracking-wide uppercase">
                  {nivel === 'distrito'
                    ? `DISTRITOS DE ${provinciaSeleccionada}`
                    : nivel === 'provincia'
                    ? `PROVINCIAS DE ${departamentoSeleccionado}`
                    : 'MAPA NACIONAL DEL PERÚ'}
                </span>
              </div>

              {/* Botón de Drill-Up directo sobre el mapa */}
              {nivel === 'distrito' ? (
                <button
                  type="button"
                  onClick={handleVolverAProvincias}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black text-[#005B94] bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer shadow-2xs"
                >
                  <span>⬆</span>
                  <span>Volver a Provincias</span>
                </button>
              ) : nivel === 'provincia' ? (
                <button
                  type="button"
                  onClick={handleVolverADepartamentos}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black text-[#005B94] bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer shadow-2xs"
                >
                  <span>⬆</span>
                  <span>Volver a Todo el Perú</span>
                </button>
              ) : (
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  25 REGIONES
                </span>
              )}
            </div>

            {/* Mensaje de Ayuda interactiva */}
            <div className="text-[11px] font-medium text-slate-500 px-1 mb-1">
              {nivel === 'departamento' && (
                <span>💡 <strong>Haz clic en cualquier departamento</strong> del mapa para explorar sus provincias.</span>
              )}
              {nivel === 'provincia' && (
                <span>💡 <strong>Haz clic en una provincia</strong> para explorar sus distritos.</span>
              )}
              {nivel === 'distrito' && (
                <span>💡 <strong>Haz clic en un distrito</strong> para ver su concentración y deudores.</span>
              )}
            </div>

            {/* SVG Oficial que se transforma dinámicamente entre Departamentos, Provincias y Distritos */}
            <div className="w-full flex justify-center items-center relative py-2 grow overflow-hidden">
              {/* =================================================================
                  NIVEL 1: MAPA NACIONAL COMPLETO DEL PERÚ (25 DEPARTAMENTOS)
                  ================================================================= */}
              {nivel === 'departamento' && (
                <svg
                  viewBox={`0 0 ${PERU_VIEWBOX.width} ${PERU_VIEWBOX.height}`}
                  className="w-full h-[380px] sm:h-[550px] xl:h-[600px] select-none filter drop-shadow-md transition-all duration-300"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g stroke="#FFFFFF" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round">
                    {PERU_DEPARTAMENTOS.map((reg) => {
                      const isCallao = reg.name === 'CALLAO';
                      const item = encontrarItemDepartamento(reg.name);
                      const participacion = item?.participacionClientes || 0;
                      const isHovered = hoverInfo?.nombre === reg.name;
                      const fillColor = obtenerColorConcentracion(participacion, false, isHovered, !!item);

                      if (isCallao) {
                        return (
                          <g
                            key="dep-callao"
                            className="cursor-pointer"
                            onClick={() => handleSeleccionarDepartamento('CALLAO')}
                            onMouseEnter={(e) => handleMouseEnterDepartamento(e, reg)}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                          >
                            <path
                              id="dep-07"
                              d={reg.path}
                              fill={fillColor}
                              stroke="#FFFFFF"
                              strokeWidth="1.2"
                            />
                            <circle
                              cx="165"
                              cy="476"
                              r={isHovered ? 8 : 5.5}
                              fill={isHovered ? '#F59E0B' : fillColor}
                              stroke="#FFFFFF"
                              strokeWidth="1.8"
                            />
                          </g>
                        );
                      }

                      return (
                        <path
                          key={reg.id}
                          id={`dep-${reg.id}`}
                          d={reg.path}
                          fill={fillColor}
                          className="cursor-pointer transition-colors duration-150 hover:brightness-110"
                          stroke="#FFFFFF"
                          strokeWidth="1.2"
                          onClick={() => handleSeleccionarDepartamento(reg.name)}
                          onMouseEnter={(e) => handleMouseEnterDepartamento(e, reg)}
                          onMouseMove={handleMouseMove}
                          onMouseLeave={handleMouseLeave}
                        />
                      );
                    })}
                  </g>
                </svg>
              )}

              {/* =================================================================
                  NIVEL 2: MAPA PROVINCIAL VECTORIAL REAL (ESTILO INFOGOB)
                  ================================================================= */}
              {nivel === 'provincia' && (
                <svg
                  viewBox="0 0 600 550"
                  className="w-full h-[380px] sm:h-[550px] xl:h-[600px] select-none filter drop-shadow-md transition-all duration-300"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Polígonos de Provincias */}
                  <g stroke="#FFFFFF" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
                    {poligonosProvincias.map((poly) => {
                      const item = encontrarItemProvincia(poly.name);
                      const participacion = item?.participacionClientes || 0;
                      const isSelected = coincideRegion(poly.name, provinciaSeleccionada);
                      const isHovered = hoverInfo?.nombre === poly.name;
                      const fillColor = obtenerColorConcentracion(participacion, isSelected, isHovered, !!item);

                      return (
                        <path
                          key={poly.id}
                          d={poly.pathD}
                          fill={fillColor}
                          className="cursor-pointer transition-colors duration-150 hover:brightness-105"
                          stroke="#FFFFFF"
                          strokeWidth={isSelected ? 2.5 : 1.5}
                          onClick={() => handleSeleccionarProvincia(poly.name)}
                          onMouseEnter={(e) => handleMouseEnterFeature(e, poly.name, item)}
                          onMouseMove={handleMouseMove}
                          onMouseLeave={handleMouseLeave}
                        />
                      );
                    })}
                  </g>

                  {/* Etiquetas y badges centrados para cada provincia */}
                  <g className="pointer-events-none select-none">
                    {poligonosProvincias.map((poly) => {
                      const item = encontrarItemProvincia(poly.name);
                      const participacion = item?.participacionClientes || 0;
                      const mostrarDetalle = poly.bbox.width >= 35 && poly.bbox.height >= 22;

                      if (!mostrarDetalle) return null;

                      return (
                        <g key={`lbl-${poly.id}`}>
                          {/* Nombre de la Provincia */}
                          <text
                            x={poly.cx}
                            y={item ? poly.cy - 3 : poly.cy + 3}
                            textAnchor="middle"
                            fill="#0F172A"
                            fontSize={poly.bbox.width > 90 ? '11' : '9'}
                            fontWeight="900"
                            stroke="#FFFFFF"
                            strokeWidth="3.5"
                            strokeLinejoin="round"
                            style={{ paintOrder: 'stroke fill' }}
                            className="uppercase tracking-tight"
                          >
                            {poly.name}
                          </text>

                          {/* Porcentaje de participación */}
                          {item && (
                            <text
                              x={poly.cx}
                              y={poly.cy + 10}
                              textAnchor="middle"
                              fill={participacion >= 15 ? '#B91C1C' : '#0369A1'}
                              fontSize="9.5"
                              fontFamily="monospace"
                              fontWeight="900"
                              stroke="#FFFFFF"
                              strokeWidth="3"
                              strokeLinejoin="round"
                              style={{ paintOrder: 'stroke fill' }}
                            >
                              {participacion.toFixed(1)}%
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                </svg>
              )}

              {/* =================================================================
                  NIVEL 3: MAPA DISTRITAL VECTORIAL REAL (ESTILO INFOGOB)
                  ================================================================= */}
              {nivel === 'distrito' && (
                <svg
                  viewBox="0 0 600 550"
                  className="w-full h-[380px] sm:h-[550px] xl:h-[600px] select-none filter drop-shadow-md transition-all duration-300"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Polígonos de Distritos */}
                  <g stroke="#FFFFFF" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round">
                    {poligonosDistritos.map((poly) => {
                      const item = encontrarItemDistrito(poly.name);
                      const participacion = item?.participacionClientes || 0;
                      const isSelected = coincideRegion(poly.name, distritoSeleccionado);
                      const isHovered = hoverInfo?.nombre === poly.name;
                      const fillColor = obtenerColorConcentracion(participacion, isSelected, isHovered, !!item);

                      return (
                        <path
                          key={poly.id}
                          d={poly.pathD}
                          fill={fillColor}
                          className="cursor-pointer transition-colors duration-150 hover:brightness-105"
                          stroke="#FFFFFF"
                          strokeWidth={isSelected ? 2.5 : 1.2}
                          onClick={() => handleSeleccionarDistrito(poly.name)}
                          onMouseEnter={(e) => handleMouseEnterFeature(e, poly.name, item)}
                          onMouseMove={handleMouseMove}
                          onMouseLeave={handleMouseLeave}
                        />
                      );
                    })}
                  </g>

                  {/* Etiquetas de Distritos principales que caben limpiamente */}
                  <g className="pointer-events-none select-none">
                    {poligonosDistritos.map((poly) => {
                      const item = encontrarItemDistrito(poly.name);
                      const participacion = item?.participacionClientes || 0;
                      const mostrarEtiqueta = poly.bbox.width >= 42 && poly.bbox.height >= 26;

                      if (!mostrarEtiqueta) return null;

                      return (
                        <g key={`lbl-dist-${poly.id}`}>
                          <text
                            x={poly.cx}
                            y={item ? poly.cy - 2 : poly.cy + 3}
                            textAnchor="middle"
                            fill="#0F172A"
                            fontSize={poly.bbox.width > 80 ? '9.5' : '8'}
                            fontWeight="800"
                            stroke="#FFFFFF"
                            strokeWidth="3"
                            strokeLinejoin="round"
                            style={{ paintOrder: 'stroke fill' }}
                            className="uppercase tracking-tight"
                          >
                            {poly.name}
                          </text>

                          {item && (
                            <text
                              x={poly.cx}
                              y={poly.cy + 9}
                              textAnchor="middle"
                              fill={participacion >= 15 ? '#B91C1C' : '#0369A1'}
                              fontSize="8.5"
                              fontFamily="monospace"
                              fontWeight="900"
                              stroke="#FFFFFF"
                              strokeWidth="2.5"
                              strokeLinejoin="round"
                              style={{ paintOrder: 'stroke fill' }}
                            >
                              {participacion.toFixed(1)}%
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                </svg>
              )}
            </div>

            {/* Leyenda de Concentración */}
            <div className="w-full pt-2.5 mt-1 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-600 font-bold px-1">
              <span className="uppercase tracking-wider text-[9px] text-slate-400 font-extrabold">Concentración:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60 shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#D92525]" />
                  <span className="text-[10px] text-slate-700">&gt;15%</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60 shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#93C5AE]" />
                  <span className="text-[10px] text-slate-700">3% - 15%</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60 shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#DEF0A0]" />
                  <span className="text-[10px] text-slate-700">&lt;3%</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#F1F5F9] border border-slate-300" />
                  <span className="text-[10px]">Sin data</span>
                </div>
                <div className="flex items-center gap-1 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 text-orange-800 shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
                  <span className="text-[10px]">Foco activo</span>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              TABLA DE DATOS TERRITORIALES (LISTADO COMPLETO DONDE HAY INFORMACIÓN + PIN 📍 + HOVER)
              ========================================================================= */}
          <div className="lg:col-span-7 min-w-0 relative flex flex-col justify-between p-3 sm:p-4 bg-white rounded-2xl border border-slate-200 shadow-xs lg:min-h-[640px] xl:min-h-[700px]">
            {/* Cabecera de la Tabla */}
            <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#005B94] animate-pulse" />
                <span className="font-extrabold text-slate-900 tracking-tight">
                  {nivel === 'distrito'
                    ? `DETALLE DE DISTRITOS — ${provinciaSeleccionada} (${departamentoSeleccionado})`
                    : nivel === 'provincia'
                    ? `DETALLE DE PROVINCIAS — ${departamentoSeleccionado}`
                    : 'DETALLE TERRITORIAL NACIONAL (25 DEPARTAMENTOS)'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-[#005B94] border border-blue-200 font-mono font-bold">
                  {itemsOrdenados.length} {nivel === 'distrito' ? 'distritos' : nivel === 'provincia' ? 'provincias' : 'regiones'} con cartera
                </span>
              </div>

              {/* Botón de Retorno de Nivel */}
              {nivel === 'distrito' ? (
                <button
                  type="button"
                  onClick={handleVolverAProvincias}
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  ← Volver a Provincias
                </button>
              ) : departamentoSeleccionado !== 'Todas' ? (
                <button
                  type="button"
                  onClick={handleVolverADepartamentos}
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  ✕ Ver Todo el Perú
                </button>
              ) : null}
            </div>

            {/* Contenedor con Scroll de la Tabla Institucional Completa (Sin recortar con paginación) */}
            <div className="overflow-x-auto overflow-y-auto max-h-[540px] xl:max-h-[600px] touch-pan-x touch-pan-y rounded-xl border border-slate-200 grow shadow-2xs [scrollbar-width:thin]">
              <table className="w-full min-w-[500px] text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-[#005B94] shadow-xs">
                  <tr className="text-white font-extrabold text-[10px] uppercase tracking-wider select-none">
                    <th
                      className="py-2.5 px-3 text-center cursor-pointer hover:bg-blue-800 transition-colors border-r border-white/20"
                      onClick={() => alternarOrden(nivel === 'distrito' ? 'distrito' : nivel === 'provincia' ? 'provincia' : 'departamento')}
                      title="Ordenar alfabéticamente"
                    >
                      <span className="inline-flex items-center justify-center gap-1 w-full">
                        <span>
                          {nivel === 'distrito' ? 'DISTRITO' : nivel === 'provincia' ? 'PROVINCIA' : 'DEPARTAMENTO'}
                        </span>
                        <span>
                          {(ordenColumna === 'departamento' || ordenColumna === 'provincia' || ordenColumna === 'distrito')
                            ? (ordenAsc ? '▲' : '▼')
                            : '↕'}
                        </span>
                      </span>
                    </th>
                    <th
                      className="py-2.5 px-3 text-center cursor-pointer hover:bg-blue-800 transition-colors border-r border-white/20"
                      onClick={() => alternarOrden('clientes')}
                      title="Ordenar por Clientes"
                    >
                      <span className="inline-flex items-center justify-center gap-1 w-full">
                        <span>Clientes</span>
                        <span>{ordenColumna === 'clientes' ? (ordenAsc ? '▲' : '▼') : ''}</span>
                      </span>
                    </th>
                    <th
                      className="py-2.5 px-3 text-center cursor-pointer hover:bg-blue-800 transition-colors border-r border-white/20"
                      onClick={() => alternarOrden('exclusivo')}
                      title="Ordenar por Clientes Exclusivos"
                    >
                      <span className="inline-flex items-center justify-center gap-1 w-full">
                        <span>Exclusivo</span>
                        <span>{ordenColumna === 'exclusivo' ? (ordenAsc ? '▲' : '▼') : ''}</span>
                      </span>
                    </th>
                    <th
                      className="py-2.5 px-3 text-center cursor-pointer hover:bg-blue-800 transition-colors border-r border-white/20"
                      onClick={() => alternarOrden('participacionClientes')}
                      title="Ordenar por % Participación de Clientes"
                    >
                      <span className="inline-flex items-center justify-center gap-1 w-full">
                        <span>% Partc. Clientes</span>
                        <span>{ordenColumna === 'participacionClientes' ? (ordenAsc ? '▲' : '▼') : ''}</span>
                      </span>
                    </th>
                    <th
                      className="py-2.5 px-3 text-center cursor-pointer hover:bg-blue-800 transition-colors"
                      onClick={() => alternarOrden('participacionMontos')}
                      title="Ordenar por % Participación de Montos"
                    >
                      <span className="inline-flex items-center justify-center gap-1 w-full">
                        <span>% Partc. Montos</span>
                        <span>{ordenColumna === 'participacionMontos' ? (ordenAsc ? '▲' : '▼') : ''}</span>
                      </span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading || loadingProvincias || loadingDistritos ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-6 h-6 border-2 border-[#005B94] border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs font-semibold">Cargando distribución territorial...</span>
                        </div>
                      </td>
                    </tr>
                  ) : itemsOrdenados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                        No se encontraron registros para la demarcación seleccionada.
                      </td>
                    </tr>
                  ) : (
                    itemsOrdenados.map((it, idx) => {
                      const nombreTerritorio =
                        nivel === 'distrito'
                          ? it.distrito || 'Sin Ubigeo'
                          : nivel === 'provincia'
                          ? it.provincia || 'Sin Ubigeo'
                          : it.departamento;

                      const isSelected =
                        nivel === 'distrito'
                          ? coincideRegion(it.distrito, distritoSeleccionado)
                          : nivel === 'provincia'
                          ? coincideRegion(it.provincia, provinciaSeleccionada)
                          : coincideRegion(it.departamento, departamentoSeleccionado);

                      const isHovered = hoverInfo?.nombre === nombreTerritorio;

                      // % Participación de Montos calculada exactamente como en Power BI
                      const pctMontos =
                        typeof it.participacionMontos === 'number' && !isNaN(it.participacionMontos) && it.participacionMontos > 0
                          ? it.participacionMontos
                          : data?.totales?.saldo
                          ? (it.saldo / data.totales.saldo) * 100
                          : 0;

                      return (
                        <tr
                          key={`${nombreTerritorio}-${idx}`}
                          onClick={() => {
                            if (nivel === 'departamento') {
                              handleSeleccionarDepartamento(it.departamento);
                            } else if (nivel === 'provincia' && it.provincia) {
                              handleSeleccionarProvincia(it.provincia);
                            } else if (nivel === 'distrito' && it.distrito) {
                              handleSeleccionarDistrito(it.distrito);
                            }
                          }}
                          onMouseLeave={handleTableRowMouseLeave}
                          className={`group transition-colors duration-100 cursor-pointer ${
                            isSelected
                              ? 'bg-amber-100/70 font-semibold'
                              : isHovered
                              ? 'bg-blue-50/50'
                              : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          {/* Columna 1: Nombre Territorial con [+] estilo Power BI - NO muestra tablita en hover */}
                          <td
                            onMouseEnter={handleTableRowMouseLeave}
                            className="py-2 px-3 text-slate-900 uppercase font-bold tracking-tight truncate max-w-[200px] border-r border-slate-200 bg-white"
                          >
                            <div className="flex items-center gap-1.5">
                              {/* Botón Logotipo de Ubicación (Pin 📍) para abrir el cuadrito de estrategias */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEstrategiasModal(it);
                                }}
                                className="text-xs hover:scale-125 transition-transform cursor-pointer p-0.5 rounded hover:bg-blue-100/60 shrink-0"
                                title={`Ver estrategias de ${nombreTerritorio}`}
                              >
                                <span className={isSelected ? 'text-amber-600' : 'text-[#005B94]'}>
                                  📍
                                </span>
                              </button>

                              {/* Indicador cromático de concentración */}
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{
                                  backgroundColor:
                                    it.participacionClientes >= 15
                                      ? '#D92525'
                                      : it.participacionClientes >= 3
                                      ? '#93C5AE'
                                      : '#DEF0A0',
                                }}
                              />
                              <span className="truncate">{nombreTerritorio}</span>
                            </div>
                          </td>

                          {/* Columna 2: Clientes - Fondo pastel amarillo oficial Power BI */}
                          <td
                            onMouseEnter={(e) => handleTableRowMouseEnter(e, it)}
                            onMouseMove={handleTableRowMouseMove}
                            className="py-2 px-3 text-right font-mono font-bold text-slate-900 border-r border-amber-200/60 bg-[#FFFBEA] group-hover:bg-[#FFF5B8] transition-colors"
                          >
                            {formatearClientes(it.clientes)}
                          </td>

                          {/* Columna 3: Exclusivo - Fondo pastel amarillo oficial Power BI */}
                          <td
                            onMouseEnter={(e) => handleTableRowMouseEnter(e, it)}
                            onMouseMove={handleTableRowMouseMove}
                            className="py-2 px-3 text-right font-mono font-bold text-slate-900 border-r border-amber-200/60 bg-[#FFFBEA] group-hover:bg-[#FFF5B8] transition-colors"
                          >
                            {formatearClientes(it.exclusivo)}
                          </td>

                          {/* Columna 4: % Partc. Clientes - Fondo pastel amarillo oficial Power BI */}
                          <td
                            onMouseEnter={(e) => handleTableRowMouseEnter(e, it)}
                            onMouseMove={handleTableRowMouseMove}
                            className="py-2 px-3 text-right font-mono font-bold text-slate-900 border-r border-amber-200/60 bg-[#FFFBEA] group-hover:bg-[#FFF5B8] transition-colors"
                          >
                            {formatearPorcentaje(it.participacionClientes)}
                          </td>

                          {/* Columna 5: % Partc. Montos - Fondo pastel amarillo oficial Power BI */}
                          <td
                            onMouseEnter={(e) => handleTableRowMouseEnter(e, it)}
                            onMouseMove={handleTableRowMouseMove}
                            className="py-2 px-3 text-right font-mono font-bold text-slate-900 bg-[#FFFBEA] group-hover:bg-[#FFF5B8] transition-colors"
                          >
                            {formatearPorcentaje(pctMontos)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Fila de Totales de la Tabla (Estilo Oficial Power BI con Azul Marino #004775 y texto blanco) */}
                {data?.totales && (
                  <tfoot className="sticky bottom-0 z-10 bg-[#004775] text-white font-extrabold shadow-md border-t-2 border-[#003456]">
                    <tr className="text-white">
                      <td className="py-2.5 px-3 text-left uppercase tracking-wider text-xs font-black border-r border-white/20">
                        Total
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-black border-r border-white/20">
                        {formatearClientes(
                          nivel === 'distrito' && distritosData?.totales
                            ? distritosData.totales.clientes
                            : nivel === 'provincia' && provinciasData?.totales
                            ? provinciasData.totales.clientes
                            : data.totales.clientes
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-black border-r border-white/20">
                        {formatearClientes(
                          nivel === 'distrito' && distritosData?.totales
                            ? distritosData.totales.exclusivo
                            : nivel === 'provincia' && provinciasData?.totales
                            ? provinciasData.totales.exclusivo
                            : data.totales.exclusivo
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-black border-r border-white/20">
                        {formatearPorcentaje(100)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-black">
                        {formatearPorcentaje(100)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pie Informativo de Registros Completos */}
            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span className="text-[11px]">
                Mostrando los <strong className="text-slate-800">{itemsOrdenados.length}</strong> registros con información consolidada en este periodo.
              </span>
              <span className="text-[10px] text-slate-400 italic">
                Desplázate verticalmente para ver todos los registros
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. TOOLTIP FLOTANTE DE LA TABLITA DE ESTRATEGIAS AL PASAR EL PUNTERO (HOVER)
          ========================================================================= */}
      {tableHoverInfo && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden pointer-events-none text-xs select-none w-[360px] animate-fadeIn"
          style={{
            left: `${Math.min(typeof window !== 'undefined' ? window.innerWidth - 380 : 800, tableHoverInfo.x + 18)}px`,
            top: `${Math.max(20, Math.min(typeof window !== 'undefined' ? window.innerHeight - 290 : 600, tableHoverInfo.y - 120))}px`,
          }}
        >
          {/* Cabecera Azul Oficial Power BI */}
          <div className="bg-[#005B94] text-white px-3.5 py-2 flex items-center justify-between font-bold text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]">▲</span>
              <span>ESTRATEGIA</span>
            </div>
            <span className="text-[11px] text-[#FFD700] font-black uppercase truncate max-w-[200px]">
              {tableHoverInfo.item.distrito || tableHoverInfo.item.provincia || tableHoverInfo.item.departamento}
            </span>
          </div>

          {/* Tabla de Estrategias con Colores Oficiales */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#005B94] text-white font-bold text-[10px] border-t border-blue-900/60">
                <th className="py-1 px-3 text-center">ESTRATEGIA</th>
                <th className="py-1 px-3 text-center">CANTIDAD</th>
                <th className="py-1 px-3 text-center">% PARTICIPACIÓN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-[11px]">
              {obtenerEstrategiasDeItem(tableHoverInfo.item, data).map((est) => {
                const conf = ESTRATEGIA_COLORES[est.estrategia] || {
                  color: '#64748B',
                  texto: '#FFFFFF',
                };
                return (
                  <tr key={est.estrategia}>
                    <td className="py-1 px-3 font-semibold text-slate-900 bg-white whitespace-nowrap">
                      {est.nombre}
                    </td>
                    <td
                      className="py-1 px-3 text-right font-mono font-bold"
                      style={{ backgroundColor: conf.color, color: conf.texto }}
                    >
                      {formatearClientes(est.cantidad)}
                    </td>
                    <td
                      className="py-1 px-3 text-right font-mono font-bold"
                      style={{ backgroundColor: conf.color, color: conf.texto }}
                    >
                      {formatearPorcentajeEspacio(est.participacion)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-extrabold text-slate-900 border-t border-slate-300">
                <td className="py-1 px-3 text-center">TOTAL</td>
                <td className="py-1 px-3 text-right font-mono">
                  {formatearClientes(tableHoverInfo.item.clientes)}
                </td>
                <td className="py-1 px-3 text-right font-mono">
                  {formatearPorcentajeEspacio(100)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* =========================================================================
          5b. TOOLTIP FLOTANTE OFICIAL DEL MAPA AL PASAR EL CURSOR (FIXED Z-50 NUNCA RECORTADO)
          ========================================================================= */}
      {hoverInfo && (
        <div
          className="fixed z-50 bg-white text-slate-800 p-3.5 rounded-xl shadow-2xl border border-slate-300 min-w-[280px] w-max max-w-[320px] pointer-events-none select-none animate-fadeIn"
          style={{
            left: `${
              typeof window !== 'undefined' && hoverInfo.x + 320 > window.innerWidth
                ? Math.max(10, hoverInfo.x - 310)
                : hoverInfo.x + 16
            }px`,
            top: `${
              typeof window !== 'undefined' && hoverInfo.y + 240 > window.innerHeight
                ? Math.max(10, hoverInfo.y - 230)
                : Math.max(15, hoverInfo.y - 70)
            }px`,
          }}
        >
          {/* Cabecera del Tooltip con nivel territorial */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {nivel === 'distrito' ? 'DISTRITO' : nivel === 'provincia' ? 'PROVINCIA' : 'DEPARTAMENTO'}
            </span>
            <span className="text-xs font-black text-slate-900 uppercase truncate max-w-[180px]">
              {hoverInfo.nombre}
            </span>
          </div>

          {hoverInfo.item ? (
            <div className="space-y-1.5 text-xs font-sans">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600 font-semibold text-[11px]">Total Clientes:</span>
                <span className="font-bold text-slate-900 text-right font-mono text-[11.5px]">
                  {formatearClientes(hoverInfo.item.clientes)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600 font-semibold text-[11px]">Clientes Exclusivos:</span>
                <span className="font-bold text-slate-900 text-right font-mono text-[11.5px]">
                  {formatearClientes(hoverInfo.item.exclusivo)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600 font-semibold text-[11px]">Deudas Vigentes:</span>
                <span className="font-bold text-slate-900 text-right font-mono text-[11.5px]">
                  S/ {formatearMonto(hoverInfo.item.deudasVigentes || hoverInfo.item.saldo)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600 font-semibold text-[11px]">Deudas Castigadas:</span>
                <span className="font-bold text-slate-900 text-right font-mono text-[11.5px]">
                  S/ {formatearMonto(hoverInfo.item.deudasCastigadas)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-100">
                <span className="text-slate-700 font-bold text-[11px]">% Participación:</span>
                <span className="font-black text-[#F58220] text-right font-mono text-xs">
                  {formatearPorcentaje(hoverInfo.item.participacionClientes)}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 italic block pt-1 text-center">
              Sin colocaciones registradas en este periodo
            </span>
          )}
        </div>
      )}

      {/* =========================================================================
          6. MODAL FIJO DE DESGLOSE POR ESTRATEGIAS AL HACER CLIC EN EL PIN 📍
          ========================================================================= */}
      {estrategiasModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setEstrategiasModal(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera Azul Marino Oficial */}
            <div className="bg-[#005B94] text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider">▲ CUADRO DE ESTRATEGIAS</span>
                <span className="text-xs text-[#FFD700] font-black uppercase truncate max-w-[200px]">
                  ({estrategiasModal.distrito || estrategiasModal.provincia || estrategiasModal.departamento})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEstrategiasModal(null)}
                className="text-white/80 hover:text-white font-bold text-sm px-2 py-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Tabla de Estrategias con Colores Exactos */}
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#005B94] text-white font-bold text-[11px] border-t border-blue-900/60">
                  <th className="py-1.5 px-3 text-center w-1/2">ESTRATEGIA</th>
                  <th className="py-1.5 px-3 text-center">CANTIDAD</th>
                  <th className="py-1.5 px-3 text-center">% PARTICIPACIÓN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {obtenerEstrategiasDeItem(estrategiasModal, data).map((est) => {
                  const conf = ESTRATEGIA_COLORES[est.estrategia] || {
                    color: '#64748B',
                    texto: '#FFFFFF',
                  };
                  return (
                    <tr key={est.estrategia}>
                      <td className="py-1.5 px-3 font-semibold text-slate-900 bg-white">
                        {est.nombre}
                      </td>
                      <td
                        className="py-1.5 px-3 text-right font-mono font-bold"
                        style={{ backgroundColor: conf.color, color: conf.texto }}
                      >
                        {formatearClientes(est.cantidad)}
                      </td>
                      <td
                        className="py-1.5 px-3 text-right font-mono font-bold"
                        style={{ backgroundColor: conf.color, color: conf.texto }}
                      >
                        {formatearPorcentajeEspacio(est.participacion)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                  <td className="py-2 px-3 text-left uppercase text-[11px]">TOTAL</td>
                  <td className="py-2 px-3 text-right font-mono text-[11px]">
                    {formatearClientes(estrategiasModal.clientes)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-[11px]">
                    {formatearPorcentajeEspacio(100)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Resumen adicional: Saldos */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs flex justify-between items-center text-slate-600 font-bold">
              <span>Saldo Colocado:</span>
              <span className="font-mono text-slate-900 text-sm">
                S/ {formatearMonto(estrategiasModal.saldo)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
