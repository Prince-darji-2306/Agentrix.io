/**
 * Error utilities: Shared error handling patterns
 */

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return fallback;
}

export async function safeJsonParse<T>(json: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(json);
  } catch (e) {
    console.warn('[ErrorUtils] Failed to parse JSON:', e);
    return fallback;
  }
}

export function extractErrorDetail(error: any, fallback: string = 'An error occurred'): string {
  if (error && typeof error === 'object') {
    if (error.detail) return error.detail;
    if (error.message) return error.message;
  }
  return fallback;
}
