// Utilidades para validación de sesión y token JWT

export function isTokenExpired(token: string): boolean {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return true;
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    // Si la fecha actual supera el timestamp de exp (exp está en segundos)
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

export function limpiarSesionYRedirigir(destino: string = '/') {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch {
    /* sin localStorage */
  }
  if (window.location.pathname !== destino) {
    window.location.href = destino;
  }
}
