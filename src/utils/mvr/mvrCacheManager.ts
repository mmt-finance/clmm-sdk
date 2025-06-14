interface CacheEntry {
  value: string;
  expiresAt: number;
}

export const MvrCacheManager = {
  add(
    memoryCache: Record<string, string>,
    localCache: Record<string, CacheEntry>,
    source: Record<string, string>,
    ttlMs: number,
  ) {
    const now = Date.now();
    for (const [key, value] of Object.entries(source)) {
      memoryCache[key] = value;
      localCache[key] = { value, expiresAt: now + ttlMs };
    }
  },

  mergeMissingFromLocal(
    memoryCache: Record<string, string>,
    localCache: Record<string, CacheEntry>,
    keys: string[],
  ) {
    const now = Date.now();
    for (const key of keys) {
      const entry = localCache[key];
      if (!memoryCache[key] && entry && entry.expiresAt > now) {
        memoryCache[key] = entry.value;
      }
    }
  },
};
