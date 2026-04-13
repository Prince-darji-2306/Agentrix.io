/**
 * LocalStorageManager: Debounced batch writer for localStorage
 * Prevents localStorage write storms by batching updates with 500ms debounce.
 */

class LocalStorageManager {
  private writeQueue: Map<string, unknown> = new Map();
  private flushTimer: number | null = null;
  private readonly DEBOUNCE_MS: number;
  private isEnabled: boolean = true;

  constructor(debounceMs: number = 500) {
    this.DEBOUNCE_MS = debounceMs;
  }

  write(key: string, value: unknown): void {
    if (!this.isEnabled) {
      this.syncWriteFallback(key, value);
      return;
    }
    this.writeQueue.set(key, value);
    this.scheduleFlush();
  }

  flush(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.writeQueue.size === 0) return;

    try {
      this.writeQueue.forEach((value, key) => {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      });
    } catch (e) {
      console.warn('[StorageManager] Flush failed:', e);
      const entries = Array.from(this.writeQueue.entries());
      if (entries.length > 0) {
        this.syncWriteFallback(entries[0][0], entries[0][1]);
      }
    }

    this.writeQueue.clear();
  }

  private syncWriteFallback(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (e) {
      console.error(`[StorageManager] Sync fallback failed for '${key}':`, e);
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null) return;
    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, this.DEBOUNCE_MS);
  }

  getPendingCount(): number {
    return this.writeQueue.size;
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  clear(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.writeQueue.clear();
  }
}

export const storageManager = new LocalStorageManager(500);

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => storageManager.flush());
  window.addEventListener('pagehide', () => storageManager.flush());
}
