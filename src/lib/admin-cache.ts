export interface AdminCacheEntry<T> {
  data: T;
  updatedAt: number;
  eventSeq: number;
}

const ADMIN_CACHE_TTL_MS = 60_000;
const cacheStore = new Map<string, AdminCacheEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();

export function getAdminCache<T>(key: string): AdminCacheEntry<T> | null {
  return (cacheStore.get(key) as AdminCacheEntry<T> | undefined) ?? null;
}

export function setAdminCache<T>(key: string, data: T, eventSeq: number): void {
  cacheStore.set(key, {
    data,
    updatedAt: Date.now(),
    eventSeq,
  });
}

export function invalidateAdminCache(prefix?: string): void {
  if (!prefix) {
    cacheStore.clear();
    return;
  }
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
}

export function isAdminCacheFresh(
  entry: AdminCacheEntry<unknown> | null,
  currentSeq: number,
  maxAgeMs = ADMIN_CACHE_TTL_MS
): boolean {
  if (!entry) return false;
  if (entry.eventSeq !== currentSeq) return false;
  return Date.now() - entry.updatedAt < maxAgeMs;
}

export async function fetchAdminCachedJson<T>(
  key: string,
  url: string,
  eventSeq: number,
  options?: { force?: boolean; maxAgeMs?: number }
): Promise<T | null> {
  const force = options?.force ?? false;
  const existing = getAdminCache<T>(key);
  if (!force && isAdminCacheFresh(existing, eventSeq, options?.maxAgeMs)) {
    return existing!.data;
  }

  const inflight = inflightRequests.get(key);
  if (inflight && !force) {
    return (await inflight) as T | null;
  }

  const reqPromise = (async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as T;
      setAdminCache(key, data, eventSeq);
      return data;
    } finally {
      inflightRequests.delete(key);
    }
  })();

  inflightRequests.set(key, reqPromise);
  return await reqPromise;
}
