const PRODUCTION_API_BASE = 'https://incaseforh.onrender.com';

export function getApiBaseUrl() {
  const configuredApiBase = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '');

  if (
    typeof window !== 'undefined' &&
    ['incaseforh.vercel.app', 'incaseqr.in', 'www.incaseqr.in'].includes(window.location.hostname)
  ) {
    return PRODUCTION_API_BASE;
  }

  return configuredApiBase || PRODUCTION_API_BASE;
}
