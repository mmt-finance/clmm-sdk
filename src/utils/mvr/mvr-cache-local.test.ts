import { MvrCacheLocal, DEFAULT_MVR_TIMEOUT, MvrCache } from './mvr-cache-local';

describe('MvrCacheLocal', () => {
  let cache: MvrCacheLocal;

  beforeEach(() => {
    cache = new MvrCacheLocal();
  });

  it('should merge with overrides and cache (not expired)', () => {
    const overrides: MvrCache = {
      packages: {
        'mvr::my-app': '0x123',
      },
      types: {
        'my-app::my-type': '0xabc::my::T',
      },
    };

    const now = Date.now();
    const expire = now + 10000;

    cache.packageCache = {
      'mvr::cached': { value: '0x999', expire },
    };
    cache.typeCache = {
      'cached::type': { value: '0xabc::cached::T', expire },
    };

    const result = cache.mergeWithOverrides(overrides);

    expect(result.packages).toEqual({
      'mvr::my-app': '0x123',
      'mvr::cached': '0x999',
    });
    expect(result.types).toEqual({
      'my-app::my-type': '0xabc::my::T',
      'cached::type': '0xabc::cached::T',
    });
  });

  it('should skip expired local cache entries in merge', () => {
    const expired = Date.now() - 1;

    cache.packageCache = {
      'mvr::expired': { value: '0xdead', expire: expired },
    };

    const overrides: MvrCache = {
      packages: {
        'mvr::my-app': '0x123',
      },
      types: {
        'my-app::my-type': '0xabc::my::T',
      },
    };

    const result = cache.mergeWithOverrides(overrides);

    expect(result.packages).toEqual({
      'mvr::my-app': '0x123',
    });
    expect(result.types).toEqual({
      'my-app::my-type': '0xabc::my::T',
    });
  });

  it('should add fetched result to local cache with default expiration', () => {
    const fetched: MvrCache = {
      packages: {
        'mvr::new': '0x456',
      },
      types: {
        'my::Type': '0xabc::T',
      },
    };

    cache.addFetchedResult(fetched);
    const now = Date.now();

    const packageEntry = cache.packageCache['mvr::new'];
    const typeEntry = cache.typeCache['my::Type'];

    expect(packageEntry.value).toBe('0x456');
    expect(typeEntry.value).toBe('0xabc::T');

    expect(packageEntry.expire).toEqual(now + DEFAULT_MVR_TIMEOUT);
    expect(typeEntry.expire).toEqual(now + DEFAULT_MVR_TIMEOUT);
  });

  it('addFetchedResult should overwrite existing cache entries', () => {
    const oldExpire = Date.now() + 1000;
    cache.packageCache['p1'] = { value: 'old', expire: oldExpire };

    const fetched: MvrCache = {
      packages: { p1: 'new' },
      types: {},
    };

    const newExpire = Date.now() + 99999;
    cache.addFetchedResult(fetched, newExpire);

    expect(cache.packageCache['p1']).toEqual({ value: 'new', expire: newExpire });
  });
});
