'use client';

interface DashboardViewerProps {
  titulo: string;
  urlEmbed: string;
}

export function DashboardViewer({ titulo, urlEmbed }: DashboardViewerProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
      {/* Bar de título del Dashboard */}
      <div className="bg-[#1B4589] px-6 py-4 flex items-center justify-between">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <span>📊</span> {titulo}
        </h3>
        <span className="text-xs text-blue-100 bg-white/10 px-3 py-1 rounded-full">
          Informa Perú Analytics
        </span>
      </div>

      {/* Contenedor del Iframe / PowerBI */}
      <div className="flex-1 w-full h-full bg-gray-50 relative">
        {urlEmbed ? (
          <iframe
            title={titulo}
            src={urlEmbed}
            className="w-full h-full border-0"
            allowFullScreen
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <span className="text-4xl mb-2">📋</span>
            <p className="text-sm">No se ha proporcionado un enlace válido para este dashboard.</p>
          </div>
        )}
      </div>
    </div>
  );
}