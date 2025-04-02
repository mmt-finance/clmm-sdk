import { MmtSDK } from '../src';
import { describe, it, beforeEach, expect } from '@jest/globals';
import { PathResult, PoolTokenType, TokenSchema } from '../src/types';
import { DRY_RUN_PATH_LEN } from '../src/utils/constants';

describe('RouteModule.getRoutes', () => {
  let sdk: MmtSDK;
  let routeModule;
  const pools: PoolTokenType[] = [
    { tokenXType: 'A', tokenYType: 'B', poolId: 'p1', tvl: '1000' },
    { tokenXType: 'A', tokenYType: 'C', poolId: 'p2', tvl: '800' },
    { tokenXType: 'A', tokenYType: 'C', poolId: 'p26', tvl: '800' },
    { tokenXType: 'B', tokenYType: 'C', poolId: 'p3', tvl: '600' },
    { tokenXType: 'B', tokenYType: 'C', poolId: 'p27', tvl: '600' },
    { tokenXType: 'A', tokenYType: 'D', poolId: 'p4', tvl: '500' },
    { tokenXType: 'B', tokenYType: 'D', poolId: 'p5', tvl: '900' },
    { tokenXType: 'A', tokenYType: 'E', poolId: 'p6', tvl: '300' },
    { tokenXType: 'B', tokenYType: 'E', poolId: 'p7', tvl: '700' },

    { tokenXType: 'A', tokenYType: 'F', poolId: 'p8', tvl: '400' },
    { tokenXType: 'F', tokenYType: 'G', poolId: 'p9', tvl: '400' },
    { tokenXType: 'B', tokenYType: 'G', poolId: 'p10', tvl: '200' },

    { tokenXType: 'C', tokenYType: 'G', poolId: 'p11', tvl: '300' },
    { tokenXType: 'E', tokenYType: 'G', poolId: 'p12', tvl: '200' },

    { tokenXType: 'A', tokenYType: 'H', poolId: 'p13', tvl: '200' },
    { tokenXType: 'H', tokenYType: 'I', poolId: 'p14', tvl: '250' },
    { tokenXType: 'I', tokenYType: 'J', poolId: 'p15', tvl: '150' },
    { tokenXType: 'B', tokenYType: 'J', poolId: 'p16', tvl: '100' },

    { tokenXType: 'B', tokenYType: 'C', poolId: 'p17', tvl: '500' },
    { tokenXType: 'A', tokenYType: 'C', poolId: 'p18', tvl: '400' },
    { tokenXType: 'B', tokenYType: 'C', poolId: 'p28', tvl: '600' },
    { tokenXType: 'A', tokenYType: 'C', poolId: 'p29', tvl: '400' },

    { tokenXType: 'A', tokenYType: 'K', poolId: 'p19', tvl: '0' },
    { tokenXType: 'B', tokenYType: 'K', poolId: 'p20', tvl: '0' },

    { tokenXType: 'A', tokenYType: 'L', poolId: 'p21', tvl: '100' },
    { tokenXType: 'L', tokenYType: 'M', poolId: 'p22', tvl: '100' },
    { tokenXType: 'M', tokenYType: 'N', poolId: 'p23', tvl: '100' },
    { tokenXType: 'N', tokenYType: 'O', poolId: 'p24', tvl: '100' },
    { tokenXType: 'B', tokenYType: 'O', poolId: 'p25', tvl: '100' },
  ];

  beforeEach(() => {
    sdk = MmtSDK.NEW({
      network: 'mainnet',
    });
    routeModule = sdk.Route;
  });

  it('should include direct path among multiple paths', async () => {
    const pools: PoolTokenType[] = [
      { tokenXType: 'A', tokenYType: 'B', poolId: 'p1', tvl: '100' },
      { tokenXType: 'A', tokenYType: 'C', poolId: 'p2', tvl: '100' },
      { tokenXType: 'C', tokenYType: 'B', poolId: 'p3', tvl: '100' },
    ];

    const result = await routeModule.getRoutes('A', 'B', pools);
    const tokensList = result.map((r) => r.tokens.join('->'));
    expect(tokensList).toContain('A->B');
    expect(tokensList).toContain('A->C->B');
    const direct = result.find((p) => p.tokens.join('->') === 'A->B' && p.pools[0] === 'p1');
    const hop = result.find(
      (p) => p.tokens.join('->') === 'A->C->B' && p.pools[0] === 'p2' && p.pools[1] === 'p3',
    );
    expect(direct).toBeDefined();
    expect(hop).toBeDefined();
    expect(result.length).toEqual(2);
  });

  it('should return the only available path', () => {
    const pools: PoolTokenType[] = [
      { tokenXType: 'A', tokenYType: 'B', poolId: 'p1', tvl: '100' },
      { tokenXType: 'A', tokenYType: 'C', poolId: 'p2', tvl: '100' },
    ];
    const result = routeModule.getRoutes('A', 'B', pools);

    expect(result).toEqual([
      {
        tokens: ['A', 'B'],
        pools: ['p1'],
        isXToY: [true],
      },
    ]);
  });

  it('should exclude path longer than maxHops=4', () => {
    const pools: PoolTokenType[] = [
      { tokenXType: 'A', tokenYType: 'B', poolId: 'p1', tvl: '100' },
      { tokenXType: 'B', tokenYType: 'C', poolId: 'p2', tvl: '100' },
      { tokenXType: 'C', tokenYType: 'D', poolId: 'p3', tvl: '100' },
      { tokenXType: 'D', tokenYType: 'E', poolId: 'p4', tvl: '100' },
      { tokenXType: 'E', tokenYType: 'F', poolId: 'p5', tvl: '100' },
    ];

    const result = routeModule.getRoutes('A', 'F', pools);
    expect(result).toEqual([]);
  });

  it('should find a path that loops back to source token (non-trivial cycle)', () => {
    const pools: PoolTokenType[] = [
      { tokenXType: 'A', tokenYType: 'B', poolId: 'p1', tvl: '100' },
      { tokenXType: 'B', tokenYType: 'C', poolId: 'p2', tvl: '100' },
      { tokenXType: 'C', tokenYType: 'A', poolId: 'p3', tvl: '100' },
    ];

    const result = routeModule.getRoutes('A', 'A', pools);

    const loopPath = result.find((r) => r.tokens.join('->') === 'A->B->C->A');
    expect(loopPath).toBeDefined();
    expect(loopPath!.pools).toEqual(['p1', 'p2', 'p3']);
  });

  it('should find 12 valid paths from A to B and exclude invalid ones (TVL=0 or too long)', () => {
    const validPools = pools.filter((p) => Number(p.tvl) > 0);
    const result: PathResult[] = routeModule.getRoutes('A', 'B', validPools);
    const uniquePaths = result.map((r) => r.tokens.join('->'));

    expect(result.length).toEqual(25);

    expect(uniquePaths).toContain('A->B');
    expect(uniquePaths).toContain('A->C->B');
    expect(uniquePaths).toContain('A->D->B');
    expect(uniquePaths).toContain('A->F->G->E->B');

    const tooLong = result.find((r) => r.tokens.length > 5);
    expect(tooLong).toBeUndefined();

    const hasZeroTVL = result.some((r) =>
      r.pools.some((poolId) => ['p19', 'p20'].includes(poolId)),
    );
    expect(hasZeroTVL).toBe(false);
  });

  it('Find the top 10 routers with the highest TVL', () => {
    const validPools = pools.filter((p) => Number(p.tvl) > 0);
    const result = routeModule.getRoutes('A', 'B', validPools);
    const poolIdTvlMap = Object.fromEntries(pools.map((pool) => [pool.poolId, pool.tvl]));
    const hop3 = result
      .filter((x) => x.pools.length === 3)
      .map((path) => {
        const totalTVL = path.pools.reduce((sum, poolId) => {
          return sum + (poolIdTvlMap[poolId] ?? 0);
        }, 0);
        return {
          ...path,
          totalTVL,
        };
      });
    const lowest2 = hop3.sort((a, b) => a.totalTVL - b.totalTVL).slice(0, 2);

    const sortResult = routeModule.sortRoutes(result, pools);
    expect(sortResult[0].pools.length).toEqual(1);
    lowest2.forEach((lowest) => {
      expect(sortResult).not.toContainEqual(lowest);
    });
    console.log('sortResult', sortResult);
    expect(sortResult.length).toEqual(DRY_RUN_PATH_LEN);
  });

  it('test', () => {
    const validPools = pools.filter((p) => Number(p.tvl) > 0);
    const sourceToken: TokenSchema = {
      coinType: 'A',
      name: 'Token A',
      ticker: 'A',
      iconUrl: 'https://example.com/iconA.png',
      decimals: 18,
      description: 'This is a description for Token A.',
      isVerified: true,
      isMmtWhitelisted: false,
      tokenType: null,
      price: '1.00',
    };
    routeModule.getRoutes('A', 'B', 2, sourceToken, validPools);
  });
});
