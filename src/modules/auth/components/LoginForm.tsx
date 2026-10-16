'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { authService } from '../services/authService';

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login({ username, password });
      
      localStorage.setItem('token', response.accessToken);
      if (response.usuario) {
        localStorage.setItem('user', JSON.stringify(response.usuario));
      }

      // Redirección directa según el rol
      if (response.usuario?.rolId === 1) {
        router.push('/admin/empresas');
      } else {
        router.push('/cliente/periodos');
      }
    } catch (err: any) {
      console.error('Error de login:', err);
      if (err.response) {
        setError(err.response.data?.message || 'Credenciales incorrectas.');
      } else {
        setError('No se pudo conectar con el servidor backend.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#E8ECF3] p-4">
      {/* Tarjeta de Login */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-100">
        
        {/* Borde superior de acento rojo fino */}
        <div className="h-1 w-full bg-[#ED1C24]" />

        {/* Encabezado Azul Corporativo */}
        <div className="bg-[#1B4589] py-5 text-center">
          <span className="text-white text-base font-semibold tracking-wide">
            Plataforma Empresarial
          </span>
        </div>

        {/* Cuerpo del Formulario */}
        <div className="p-8">
          {/* Logo Oficial de Informa Perú */}
          <div className="flex justify-center mb-6">
            <Image
              src="/logo-informa-peru.png"
              alt="Informa Perú"
              width={200}
              height={60}
              priority
              className="h-auto w-auto object-contain"
            />
          </div>

          <h2 className="text-xl font-bold text-center text-[#231F20] mb-6">
            Iniciar Sesión
          </h2>

          {error && (
            <div className="mb-4 p-3 text-sm text-[#ED1C24] bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <span className="font-semibold">⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#231F20] mb-1">
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B4589] focus:border-[#1B4589] focus:outline-none text-[#231F20] transition-colors"
                placeholder="Ingresa tu usuario"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#231F20] mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-4 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B4589] focus:border-[#1B4589] focus:outline-none text-[#231F20] transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#1B4589] focus:outline-none transition-colors p-1"
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1B4589] text-white font-bold rounded-lg hover:bg-[#143468] active:scale-[0.99] transition-all duration-200 disabled:opacity-50 shadow-md"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}