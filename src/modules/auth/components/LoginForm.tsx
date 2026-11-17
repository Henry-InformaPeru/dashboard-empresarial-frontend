'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { authService } from '../services/authService';
import { isTokenExpired } from '@/shared/lib/auth';

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberUser, setRememberUser] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Redirigir si ya tiene sesión activa válida y cargar usuario recordado
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (token && !isTokenExpired(token) && userStr) {
        const user = JSON.parse(userStr);
        if (user.rolId === 1) {
          router.push('/admin');
          return;
        } else {
          router.push('/cliente/portfolio');
          return;
        }
      }

      const savedUser = localStorage.getItem('saved_username');
      if (savedUser) {
        setTimeout(() => {
          setUsername(savedUser);
          setRememberUser(true);
        }, 0);
      }
    } catch {
      // Ignorar errores en lectura de localStorage
    }
  }, [router]);

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

      if (rememberUser) {
        localStorage.setItem('saved_username', username);
      } else {
        localStorage.removeItem('saved_username');
      }

      // Redirección directa según el rol
      if (response.usuario?.rolId === 1) {
        router.push('/admin');
      } else {
        router.push('/cliente/portfolio');
      }
    } catch (err: unknown) {
      console.error('Error de login:', err);
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr.response?.data?.message || 'Credenciales incorrectas. Verifique su usuario y contraseña.');
      } else {
        setError('No se pudo conectar con el servidor backend. Verifique su conexión.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-dvh lg:max-h-dvh w-full flex flex-col lg:flex-row bg-[#081225] selection:bg-[#1B4589] selection:text-white relative overflow-x-hidden lg:overflow-hidden">
      
      {/* =========================================================================
          PANEL IZQUIERDO: HERO INSTITUCIONAL CORPORATIVO (Visible en pantallas grandes)
          ========================================================================= */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-7/12 relative flex-col justify-between p-7 xl:p-10 overflow-hidden bg-gradient-to-br from-[#071322] via-[#0B1A30] to-[#0E2242] border-r border-white/10">
        
        {/* Glows ambientales sutiles */}
        <div className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 rounded-full bg-[#1B4589]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-cyan-600/15 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl" />

        {/* Patrón de rejilla sutil de fondo tipo terminal financiero */}
        <div 
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* CABECERA IZQUIERDA: Distintivo de Plataforma (Sin el logo blanco) */}
        <div className="relative z-10 flex items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md text-cyan-300 text-xs font-bold tracking-wider uppercase">
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            PORTFOLIO CONTROLLER™ · SULOTEC
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL IZQUIERDO */}
        <div className="relative z-10 my-auto py-4 max-w-xl">
          <h1 className="text-2xl xl:text-3xl font-black text-white leading-tight tracking-tight mb-2.5">
            Inteligencia Predictiva y Gestión Estratégica de Cartera
          </h1>

          <p className="text-slate-300 text-xs xl:text-sm leading-relaxed mb-5">
            Visualice indicadores preliminares y diagnóstico de riesgo crediticio a nivel nacional. 
            Optimice la toma de decisiones con segmentación algorítmica de estrategias E1 a E6 en tiempo real.
          </p>

          {/* SIMULADOR / PREVIEW EJECUTIVO EN TIEMPO REAL */}
          <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Matriz Multidimensional de Estrategias
              </span>
              <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-800/50">
                Segmentación Activa
              </span>
            </div>

            {/* Píldoras de las 6 Estrategias Oficiales */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-600/30 text-emerald-300 text-xs">
                <span className="w-5 h-5 rounded flex items-center justify-center font-black text-[10px] bg-emerald-500 text-white shrink-0">E1</span>
                <span className="font-semibold truncate">Fidelización</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-teal-950/40 border border-teal-600/30 text-teal-300 text-xs">
                <span className="w-5 h-5 rounded flex items-center justify-center font-black text-[10px] bg-teal-600 text-white shrink-0">E2</span>
                <span className="font-semibold truncate">Prevención</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs">
                <span className="w-5 h-5 rounded flex items-center justify-center font-black text-[10px] bg-amber-400 text-slate-950 shrink-0">E3</span>
                <span className="font-semibold truncate">Mitigación</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-purple-950/40 border border-purple-500/30 text-purple-300 text-xs">
                <span className="w-5 h-5 rounded flex items-center justify-center font-black text-[10px] bg-purple-600 text-white shrink-0">E4</span>
                <span className="font-semibold truncate">Blindaje</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                <span className="w-5 h-5 rounded flex items-center justify-center font-black text-[10px] bg-rose-500 text-white shrink-0">E5</span>
                <span className="font-semibold truncate">Cobranza Dir.</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
                <span className="w-5 h-5 rounded flex items-center justify-center font-black text-[10px] bg-red-600 text-white shrink-0">E6</span>
                <span className="font-semibold truncate">Conciliación</span>
              </div>
            </div>

            {/* Micro-Kpis de Garantía Institucional */}
            <div className="pt-2.5 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cobertura</p>
                <p className="text-xs font-black text-white mt-0.5">24 Dptos. Perú</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Seguridad</p>
                <p className="text-xs font-black text-emerald-400 mt-0.5">AES-256 Bit</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Acceso</p>
                <p className="text-xs font-black text-white mt-0.5">RBAC Estricto</p>
              </div>
            </div>
          </div>
        </div>

        {/* PIE DE PÁGINA IZQUIERDO */}
        <div className="relative z-10 flex flex-wrap items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-3 gap-2">
          <p>© {new Date().getFullYear()} Informa Perú S.A.C. & Sulotec. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Conexión Bancaria
            </span>
            <span>v2.6.0</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PANEL DERECHO: FORMULARIO DE ACCESO PROFESIONAL (Sin scroll en desktop)
          ========================================================================= */}
      <div className="w-full lg:w-1/2 xl:w-5/12 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-7 bg-[#F4F7FB] relative overflow-y-auto lg:overflow-hidden">
        
        <div className="w-full max-w-md mx-auto my-auto">

          {/* Tarjeta de Autenticación Principal */}
          <div className="relative overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/10 border border-slate-200/90 p-5 sm:p-7">
            
            {/* Acento superior tricolor corporativo (Sulotec / Informa Perú) */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1B4589] via-[#007A87] to-[#ED1C24]" />

            {/* Encabezado del Formulario */}
            <div className="text-center mb-4 sm:mb-5">
              {/* Logotipo en versión color más grande y prominente */}
              <div className="flex justify-center mb-3">
                <Image
                  src="/logo-informa-peru.png"
                  alt="Informa Perú"
                  width={340}
                  height={95}
                  priority
                  className="h-16 sm:h-20 w-auto object-contain"
                />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[#1B4589] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1B4589]" />
                Portal de Acceso Corporativo
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Iniciar Sesión
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingrese sus credenciales de usuario autorizado para acceder al sistema.
              </p>
            </div>

            {/* Mensaje de Error con animación suave */}
            {error && (
              <div className="mb-3.5 p-3 text-xs text-red-700 bg-red-50/90 border border-red-200 rounded-xl flex items-start gap-2.5 animate-fadeIn">
                <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <span className="font-bold block text-red-800">Error de autenticación</span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* FORMULARIO */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              {/* Campo Usuario */}
              <div>
                <label 
                  htmlFor="login-username" 
                  className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1"
                >
                  Usuario o Identificador
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    id="login-username"
                    type="text"
                    name="username"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1B4589]/20 focus:border-[#1B4589] focus:outline-none text-slate-900 transition-all duration-150 disabled:opacity-60 placeholder:text-slate-400"
                    placeholder="Ej. usuario.corporativo"
                  />
                </div>
              </div>

              {/* Campo Contraseña */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label 
                    htmlFor="login-password" 
                    className="block text-[11px] font-bold uppercase tracking-wider text-slate-700"
                  >
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="text-xs font-medium text-[#1B4589] hover:text-[#0B192C] hover:underline transition-colors cursor-pointer"
                  >
                    ¿Olvidó su contraseña?
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full pl-10 pr-11 py-2.5 text-sm bg-slate-50/60 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1B4589]/20 focus:border-[#1B4589] focus:outline-none text-slate-900 transition-all duration-150 disabled:opacity-60 placeholder:text-slate-400"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-400 hover:text-[#1B4589] transition-colors rounded-lg cursor-pointer"
                    aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showPassword ? (
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Casilla Recordar Usuario */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberUser}
                    onChange={(e) => setRememberUser(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#1B4589] focus:ring-[#1B4589] transition-colors"
                  />
                  <span className="text-xs font-medium text-slate-600">
                    Recordar usuario en este equipo
                  </span>
                </label>
              </div>

              {/* Botón Principal de Envío */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-white font-bold text-sm tracking-wide bg-gradient-to-r from-[#0B192C] via-[#152B4D] to-[#1B4589] hover:from-[#11233E] hover:to-[#2257AC] active:scale-[0.99] shadow-lg shadow-[#0B192C]/20 hover:shadow-xl hover:shadow-[#1B4589]/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 cursor-pointer mt-1"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar a la Plataforma</span>
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Aviso de Seguridad y Privacidad */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 text-center">
              <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Conexión protegida con cifrado bancario TLS 256-bit</span>
            </div>
          </div>

          {/* Pie inferior móvil */}
          <div className="mt-3 text-center text-xs text-slate-400 lg:hidden">
            <p>© {new Date().getFullYear()} Informa Perú & Sulotec</p>
          </div>

        </div>
      </div>

      {/* =========================================================================
          MODAL DE ASISTENCIA / SOPORTE TÉCNICO INSTITUCIONAL
          ========================================================================= */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            {/* Header del Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1B4589]/10 text-[#1B4589] flex items-center justify-center font-black">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Soporte de Acceso Corporativo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Contenido */}
            <div className="py-4 space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <p>
                Por estrictas políticas de seguridad de la información y cumplimiento normativo, 
                el restablecimiento de contraseñas y asignación de permisos debe ser canalizado mediante correo oficial.
              </p>
              
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="font-bold text-[#1B4589]">Solicitud de Contraseña:</span>
                  <a 
                    href="mailto:contacto@sulotec.com" 
                    className="font-bold text-[#1B4589] hover:underline"
                  >
                    contacto@sulotec.com
                  </a>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="font-bold text-[#1B4589]">Horario de Atención:</span>
                  <span>Lunes a Viernes de 8:30 a 18:00 hrs</span>
                </div>
                <div className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-200">
                  Indique en su mensaje: Nombre completo, empresa asignada y su identificador de usuario.
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#1B4589] hover:bg-[#143468] rounded-xl transition-colors cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
