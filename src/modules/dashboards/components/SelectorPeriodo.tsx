'use client';

import { CustomSelect } from '@/shared/components/ui/CustomSelect';

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

// Listado desplegable de periodos estandarizado con CustomSelect
export function SelectorPeriodo({ periodos, valor, onCambiar, cargando = false }: SelectorPeriodoProps) {
  const options = periodos.map((p) => ({
    value: p.periodo,
    label: etiquetaPeriodo(p.periodo),
    sublabel: `Corte mensual ${p.periodo}`,
  }));

  return (
    <div className="flex items-center w-full md:w-auto">
      <CustomSelect
        value={valor ?? ''}
        placeholder={cargando ? 'Cargando...' : periodos.length === 0 ? 'Sin periodos' : 'Seleccionar periodo'}
        options={options}
        onChange={onCambiar}
        prefix="PERIODO:"
        disabled={cargando || periodos.length === 0}
        ariaLabel="Selector de Periodo"
        size="md"
      />
    </div>
  );
}
