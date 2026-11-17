export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white border-t border-slate-200/90 py-2 sm:py-2.5 px-4 sm:px-6 mt-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-4 text-[11px] text-slate-500 text-center sm:text-left shrink-0">
      <div className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2">
        <span className="font-bold text-[#1B4589]">Sulotec</span>
        <span>© {currentYear} Todos los derechos reservados.</span>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <span className="hover:text-[#1B4589] cursor-pointer transition-colors">
          Soporte Técnico
        </span>
        <span className="hover:text-[#1B4589] cursor-pointer transition-colors">
          Política de Privacidad
        </span>
      </div>
    </footer>
  );
}