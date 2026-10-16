'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/shared/components/layout/Sidebar';
import { Header } from '@/shared/components/layout/Header';

export default function DashboardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E8ECF3]">
        <p className="text-[#1B4589] font-bold">Cargando plataforma...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#E8ECF3]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}