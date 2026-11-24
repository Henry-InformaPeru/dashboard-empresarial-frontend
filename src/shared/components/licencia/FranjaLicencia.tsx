'use client';

import { useEffect, useState } from 'react';
import { httpClient } from '@/shared/lib/httpClient';

// Licencia de Sulotec de la empresa del usuario (GET /licencia). El producto no decide nada: solo muestra lo que respondió Sulotec.
// licencia = null: licencias apagadas o sin información, no se muestra nada.
interface LicenciaPublica {
  estado: string | null;
  dias_para_vencer: number | null;
  mensaje: string;
  enlace: string;
}

const CADA_MS = 5 * 60_000;

export function FranjaLicencia() {
  const [licencia, setLicencia] = useState<LicenciaPublica | null>(null);

  useEffect(() => {
    let vivo = true;
    const leer = () => {
      httpClient
        .get<{ licencia: LicenciaPublica | null }>('/licencia')
        .then((r) => {
          if (vivo) setLicencia(r.data?.licencia ?? null);
        })
        .catch(() => {
          // Si no se puede leer, no se muestra nada: la licencia nunca debe estorbar el trabajo
        });
    };
    leer();
    const id = window.setInterval(leer, CADA_MS);
    return () => {
      vivo = false;
      window.clearInterval(id);
    };
  }, []);

  if (!licencia?.estado) return null;
  const { estado, dias_para_vencer: dias, mensaje, enlace } = licencia;

  let texto = '';
  let estilo = '';
  if (estado === 'SOLO_LECTURA') {
    texto = mensaje || 'Licencia vencida: puedes ver, no registrar.';
    estilo = 'bg-amber-50 text-amber-900 border-amber-200';
  } else if (estado === 'SUSPENDIDA' || estado === 'CANCELADA') {
    texto = mensaje || 'La licencia de tu empresa no está activa. Escribe a contacto@sulotec.com.';
    estilo = 'bg-red-50 text-red-900 border-red-200';
  } else if (estado === 'ACTIVA' && typeof dias === 'number' && dias >= 0 && dias <= 7) {
    texto = dias === 0 ? 'Tu licencia vence hoy.' : `Tu licencia vence en ${dias} ${dias === 1 ? 'día' : 'días'}.`;
    estilo = 'bg-slate-50 text-slate-700 border-slate-200';
  }
  if (!texto) return null;

  return (
    <div role="status" className={`mx-2 sm:mx-3 lg:mx-3.5 xl:mx-4 mt-2 rounded-lg border px-3 py-2 text-sm ${estilo}`}>
      <span>{texto}</span>{' '}
      {enlace && (
        <a href={enlace} target="_blank" rel="noopener noreferrer" className="font-semibold underline whitespace-nowrap">
          Ver mi licencia
        </a>
      )}
    </div>
  );
}
