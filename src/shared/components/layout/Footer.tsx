export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white border-t border-gray-100 py-4 sm:py-6 px-4 sm:px-8 mt-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-xs text-gray-500 text-center sm:text-left">
      <div className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2">
        <span className="font-bold text-[#1B4589]">Informa<span className="text-[#ED1C24]">®</span> Perú</span>
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