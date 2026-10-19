'use client';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// 202510 -> «Octubre 2025»
export const etiquetaPeriodo = (periodo: string) => {
  if (!periodo || periodo.length !== 6) return periodo;
  const mes = parseInt(periodo.substring(4, 6), 10);
  return `${MESES[mes - 1] || mes} ${periodo.substring(0, 4)}`;
};

interface SelectorPeriodoProps {
  periodos: { id: number; periodo: string }[]; // del más reciente al más antiguo
  valor: string | null;
  onCambiar: (periodo: string) => void;
  cargando?: boolean;
}

// Listado desplegable de periodos (con los años agrupados cuando hay más de uno)
export function SelectorPeriodo({ periodos, valor, onCambiar, cargando = false }: SelectorPeriodoProps) {
  const anios = Array.from(new Set(periodos.map((p) => p.periodo.substring(0, 4)))).sort().reverse();
  const opcion = (p: { id: number; periodo: string }) => (
    <option key={p.id} value={p.periodo}>
      {etiquetaPeriodo(p.periodo)}
    </option>
  );

  return (
    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 w-full md:w-auto">
      <label htmlFor="selector-periodo" className="text-[11px] font-bold text-[#1B4589] uppercase tracking-wider shrink-0">
        PERIODO:
      </label>
      <select
        id="selector-periodo"
        value={valor ?? ''}
        onChange={(e) => onCambiar(e.target.value)}
        disabled={cargando || periodos.length === 0}
        className="flex-1 min-w-0 px-2 py-2 sm:py-1 border border-gray-300 rounded text-base sm:text-xs text-[#231F20] focus:ring-2 focus:ring-[#1B4589] focus:outline-none bg-white font-semibold sm:min-w-[170px] disabled:opacity-60"
      >
        {periodos.length === 0 && <option value="">{cargando ? 'Cargando...' : 'Sin periodos'}</option>}
        {anios.length > 1
          ? anios.map((anio) => (
              <optgroup key={anio} label={anio}>
                {periodos.filter((p) => p.periodo.startsWith(anio)).map(opcion)}
              </optgroup>
            ))
          : periodos.map(opcion)}
      </select>
    </div>
  );
}
