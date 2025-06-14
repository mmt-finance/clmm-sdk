interface CacheEntry {
  value: string;
  expire: number;
}

export const DEFAULT_MVR_TIMEOUT = 60 * 1000; // 60s

export interface MvrCache {
  packages: Record<string, string>;
  types: Record<string, string>;
}

export class MvrCacheLocal {
  packageCache: Record<string, CacheEntry>;
  typeCache: Record<string, CacheEntry>;

  constructor() {
    this.packageCache = {};
    this.typeCache = {};
  }

  mergeWithOverrides(overrides: MvrCache): MvrCache {
    const res: MvrCache = {
      packages: {},
      types: {},
    };

    const copyFromOverrides = (source: Record<string, any>, target: Record<string, any>) => {
      for (const [key, value] of Object.entries(source)) {
        if (key && value) {
          target[key] = value;
        }
      }
    };
    const copyFromThis = (source: Record<string, CacheEntry>, target: Record<string, string>) => {
      for (const [key, { value, expire }] of Object.entries(source)) {
        if (Date.now() < expire) {
          target[key] = value;
        }
      }
    };

    copyFromOverrides(overrides.packages, res.packages);
    copyFromOverrides(overrides.types, res.types);

    copyFromThis(this.packageCache, res.packages);
    copyFromThis(this.typeCache, res.packages);

    return res;
  }

  addFetchedResult(fetched: MvrCache, expire: number = Date.now() + DEFAULT_MVR_TIMEOUT) {
    for (const [key, value] of Object.entries(fetched.packages)) {
      this.packageCache[key] = { value, expire };
    }
    for (const [key, value] of Object.entries(fetched.types)) {
      this.typeCache[key] = { value, expire };
    }
  }
}

export const mvrCacheLocal = new MvrCacheLocal();
