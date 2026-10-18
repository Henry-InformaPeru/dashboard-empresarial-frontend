import Link from 'next/link';

// Página «no encontrada» con la marca (la de Next sale negra)
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#E8ECF3] p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 max-w-md w-full p-8 text-center space-y-4">
        <p className="text-5xl font-bold text-[#1B4589]">404</p>
        <h1 className="text-lg font-bold text-[#231F20]">Página no encontrada</h1>
        <p className="text-xs text-gray-500">La dirección no existe o fue movida. Puedes volver al inicio.</p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-[#1B4589] hover:bg-[#143468] text-white font-bold text-xs rounded-lg transition-all shadow-sm"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
