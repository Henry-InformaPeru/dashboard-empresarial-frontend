'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/shared/components/layout/Sidebar';
import { Header } from '@/shared/components/layout/Header';
import { Footer } from '@/shared/components/layout/Footer';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token) {
      router.push('/');
      return;
    }

    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        // Si no es administrador (rolId 1), lo redirigimos a su portal
        if (user.rolId !== 1) {
          router.push('/cliente/periodos');
          return;
        }
      } catch (e) {
        console.error('Error al parsear usuario', e);
      }
    }

    setAuthorized(true);
  }, [router]);

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E8ECF3]">
        <p className="text-[#1B4589] font-bold">Cargando panel de administración...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#E8ECF3]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
        <Footer />
      </div>
    </div>
  );
}