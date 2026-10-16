export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white border-t border-gray-100 py-6 px-8 mt-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
      <div className="flex items-center gap-2">
        <span className="font-bold text-[#1B4589]">Informa<span className="text-[#ED1C24]">®</span> Perú</span>
        <span>© {currentYear} Todos los derechos reservados.</span>
      </div>

      <div className="flex items-center gap-6">
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