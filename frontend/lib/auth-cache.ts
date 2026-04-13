/**
 * Auth Cache: Caches token and headers to prevent per-request localStorage reads
 */

let cachedToken: string | null = null;
let cachedHeaders: HeadersInit | null = null;

/**
 * Get cached headers, fetching from localStorage only if not cached
 */
export function getAuthHeadersCached(): HeadersInit {
  if (cachedHeaders) return cachedHeaders;

  const token = typeof window !== 'undefined' ? localStorage.getItem('agentrix_token') : null;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  cachedToken = token;
  cachedHeaders = headers;
  return headers;
}

/**
 * Invalidate cache (call after login/logout/register)
 */
export function invalidateAuthCache(): void {
  cachedToken = null;
  cachedHeaders = null;
}

/**
 * Get cached token
 */
export function getCachedToken(): string | null {
  return cachedToken || (typeof window !== 'undefined' ? localStorage.getItem('agentrix_token') : null);
}
