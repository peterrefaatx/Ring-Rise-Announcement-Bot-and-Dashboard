interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const globalForCache = globalThis as unknown as {
  appCacheStore: Map<string, CacheEntry<unknown>> | undefined;
  appCacheInFlight: Map<string, Promise<unknown>> | undefined;
};

const store =
  globalForCache.appCacheStore ?? new Map<string, CacheEntry<unknown>>();
const inFlight =
  globalForCache.appCacheInFlight ?? new Map<string, Promise<unknown>>();

if (process.env.NODE_ENV !== "production") {
  globalForCache.appCacheStore = store;
  globalForCache.appCacheInFlight = inFlight;
}

function isCachingDisabled(): boolean {
  return process.env.VITEST === "true" || process.env.DISABLE_APP_CACHE === "true";
}

/**
 * Caches loader results with TTL and singleflight in-flight request deduplication.
 * Prevents stampedes when multiple callers refresh simultaneously on an SSE event.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  if (isCachingDisabled()) {
    return loader();
  }

  const now = Date.now();
  const existing = store.get(key) as CacheEntry<T> | undefined;
  if (existing && existing.expiresAt > now) {
    return existing.value;
  }

  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) {
    return pending;
  }

  const promise = loader()
    .then((value) => {
      if (store.size > 1000) {
        for (const [k, v] of store.entries()) {
          if (v.expiresAt <= Date.now()) {
            store.delete(k);
          }
        }
      }
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

export function invalidateCacheKey(key: string): void {
  store.delete(key);
}

export function invalidateCachePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

export function invalidateAllAppCaches(): void {
  store.clear();
}
