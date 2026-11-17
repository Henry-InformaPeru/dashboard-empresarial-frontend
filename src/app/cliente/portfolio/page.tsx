'use client';

import { Suspense } from 'react';
import { PortfolioView } from '@/modules/portfolio/components/PortfolioView';

export default function PortfolioPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500 font-bold">Cargando módulo...</div>}>
      <PortfolioView />
    </Suspense>
  );
}
