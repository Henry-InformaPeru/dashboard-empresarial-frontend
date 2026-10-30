'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/shared/components/layout/AppShell';
import { isTokenExpired, limpiarSesionYRedirigir } from '@/shared/lib/auth';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const verificarSesion = () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (!token || isTokenExpired(token)) {
        limpiarSesionYRedirigir('/');
        return false;
      }

      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          // Si no es administrador (rolId 1), lo redirigimos a su portal
          if (user.rolId !== 1) {
            router.push('/cliente/periodos');
            return false;
          }
        } catch (e) {
          console.error('Error al parsear usuario', e);
        }
      }

      setAuthorized(true);
      return true;
    };

    verificarSesion();

    // Si el usuario regresa a la pestaña tras dejarla inactiva, verificar que no haya expirado
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
        <p className="text-[#1B4589] font-bold">Cargando panel de administración...</p>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
