// Botón «Descargar» (enlace de Mega del periodo). No se muestra si el periodo no tiene enlace de descarga.
export function BotonDescarga({ url }: { url: string | null | undefined }) {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto min-h-[44px] sm:min-h-[36px] px-4 bg-[#1B4589] hover:bg-[#143468] active:bg-[#143468] text-white text-xs font-bold rounded-lg transition-all shadow shrink-0"
    >
      <span aria-hidden="true">📥</span> Descargar
    </a>
  );
}
