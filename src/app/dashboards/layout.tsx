'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/shared/components/layout/AppShell';
import { isTokenExpired, limpiarSesionYRedirigir } from '@/shared/lib/auth';

export default function DashboardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const verificarSesion = () => {
      const token = localStorage.getItem('token');
      if (!token || isTokenExpired(token)) {
        limpiarSesionYRedirigir('/');
        return false;
      }
      setAuthorized(true);
      return true;
    };

    verificarSesion();

    const alReactivar = () => {
      if (document.visibilityState === 'visible') {
        verificarSesion();
      }
    };

    document.addEventListener('visibilitychange', alReactivar);
    window.addEventListener('focus', alReactivar);

    return () => {
      document.removeEventListener('visibilitychange', alReactivar);
      window.removeEventListener('focus', alReactivar);
    };
  }, [router]);

  if (!authorized) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#E8ECF3]">
        <p className="text-[#1B4589] font-bold">Cargando plataforma...</p>
      </div>
    );
  }

  return <AppShell conFooter={false}>{children}</AppShell>;
}
