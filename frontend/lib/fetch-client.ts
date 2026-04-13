/**
 * FetchClient: Unified HTTP request handler with retry, timeout, and deduplication
 * Replaces redundant fetch logic scattered throughout api.ts
 */

interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

class FetchClient {
  private requestMap: Map<string, Promise<Response>> = new Map();
  private readonly DEFAULT_TIMEOUT = 30000;
  private readonly DEFAULT_RETRIES = 1;
  private readonly baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate deduplication key from URL and body
   */
  private getRequestKey(url: string, body?: any): string {
    return `${url}:${body ? JSON.stringify(body) : ''}`;
  }

  /**
   * Execute fetch with retry, timeout, and deduplication
   */
  private async request<T>(url: string, options?: RequestOptions): Promise<T> {
    const key = this.getRequestKey(url, options?.body);

    // Return cached pending request
    if (this.requestMap.has(key)) {
      const cached = this.requestMap.get(key)!;
      return cached.then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      });
    }

    const timeout = options?.timeout ?? this.DEFAULT_TIMEOUT;
    const retries = options?.retries ?? this.DEFAULT_RETRIES;

    const promise = this.executeWithRetry<T>(url, options, retries, timeout);
    this.requestMap.set(key, promise as any);

    try {
      return await promise;
    } finally {
      // Clean up after request completes
      setTimeout(() => this.requestMap.delete(key), 100);
    }
  }

  /**
   * Execute request with automatic retries
   */
  private async executeWithRetry<T>(
    url: string,
    options?: RequestOptions,
    retriesLeft: number = 1,
    timeout: number = 30000
  ): Promise<T> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (retriesLeft > 0) {
        // Exponential backoff: 100ms * (DEFAULT_RETRIES - retriesLeft + 1)
        const delayMs = 100 * (this.DEFAULT_RETRIES - retriesLeft + 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return this.executeWithRetry<T>(url, options, retriesLeft - 1, timeout);
      }
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(url: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  }

  /**
   * Stream request (returns response for manual handling)
   */
  async stream(url: string, options?: RequestOptions): Promise<Response> {
    const timeout = options?.timeout ?? this.DEFAULT_TIMEOUT;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

export const fetchClient = new FetchClient(
  typeof import.meta !== 'undefined'
    ? (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000'
    : 'http://localhost:8000'
);
